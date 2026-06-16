"""FastAPI v2 — split-graph streaming design (graph_v2).

This is the v2 API entrypoint. It exposes the same HTTP contract as
`api/main.py` (the v1 entrypoint that wraps the old monolithic graph)
but uses `graph_v2.build_routing_graph` + `build_finish_graph` and
emits richer SSE events so the ChatWidget can show progress.

Both endpoints share the SAME routing+finish graph pair built lazily on
first request, so chat history (per thread_id) is preserved across
calls just like the v1 endpoint.

SSE event shape (ChatWidget consumes this):
    event: stage,    data: "routing"   — routing graph is running
    event: stage,    data: "generating"— LLM is producing tokens
    event: token,    data: "<text>"    — one streamed token
    event: message,  data: "<text>"    — same as token (legacy)
    event: error,    data: "<message>" — error
    event: done,     data: "<full>"    — final answer (also summed)
"""
from __future__ import annotations

import os
from functools import lru_cache
from time import perf_counter

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import HTMLResponse
from langgraph.checkpoint.memory import InMemorySaver
from sse_starlette.sse import EventSourceResponse

from agentic_rag.core.graph_v2 import (
    build_finish_graph,
    build_routing_graph,
    clarify_stream_async,
    finish,
    generate_stream_async,
)
from agentic_rag.core.message_filter import user_message
from agentic_rag.core.stage_events import (
    STAGE_DONE,
    STAGE_ERROR,
    STAGE_GENERATING,
    STAGE_ROUTING,
    format_done_event,
    format_error_event,
    format_stage_event,
    format_token_event,
)
from agentic_rag.config import is_configured
from agentic_rag.config.settings import (
    ADMIN_USER_IDS,
    ALLOW_DEMO_RETRIEVER,
    CHAT_HISTORY_MAX_TURNS,
    OPENAI_CHAT_MODEL,
    PGVECTOR_COLLECTION,
    PGVECTOR_CONNECTION,
    REFLECTION_MAX_ITERATIONS,
)
from agentic_rag.core.history import messages_to_history
from agentic_rag.core.token_usage import (
    is_admin_user,
    TokenUsageCallbackHandler,
    set_active_token_handler,
)
from agentic_rag.llm import create_chat_model
from agentic_rag.retrieval.products import documents_to_products
from agentic_rag.schemas.chat import ChatRequest, ChatResponse, ChatTurn, TokenUsage

load_dotenv()

app = FastAPI(title="Agentic RAG API v2 (split-graph)", version="2.0.0")
_PLAYGROUND_HTML = ""  # no v2-specific playground


# -------------------------------------------------------------------------
# Graph pair — routing + finish, sharing an InMemorySaver for thread state
# -------------------------------------------------------------------------

@lru_cache
def _get_graph_pair():
    """Build the routing+finish graph pair once per process.

    The two graphs MUST share the same checkpointer so updates from
    `routing_graph` are visible to `finish_graph` for the same thread_id.
    `InMemorySaver` is sufficient for single-process deployments; the v1
    API also uses an in-memory checkpoint so we are not changing the
    persistence model here.
    """
    saver = InMemorySaver()
    routing = build_routing_graph(checkpointer=saver)
    finish_g = build_finish_graph(checkpointer=saver)
    return routing, finish_g


def _config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def _resolve_user_id(body_user_id: str, header_user_id: str | None) -> str:
    return (header_user_id or body_user_id or "default").strip()


# -------------------------------------------------------------------------
# Health + playground
# -------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "design": "split-graph",
        "openai_key_set": bool(os.getenv("OPENAI_API_KEY")),
        "pgvector": PGVECTOR_CONNECTION,
        "pgvector_collection": PGVECTOR_COLLECTION,
        "allow_demo_retriever": ALLOW_DEMO_RETRIEVER,
        "config_customized": is_configured(),
        "reflection_enabled": REFLECTION_MAX_ITERATIONS > 0,
        "reflection_max_iterations": REFLECTION_MAX_ITERATIONS,
        "admin_user_ids": sorted(ADMIN_USER_IDS),
        "chat_model": OPENAI_CHAT_MODEL,
    }


@app.get("/playground", response_class=HTMLResponse)
def playground():
    return _PLAYGROUND_HTML or "<h1>v2 playground not implemented</h1>"


# -------------------------------------------------------------------------
# History
# -------------------------------------------------------------------------

@app.get("/chat/history/{thread_id}", response_model=list[ChatTurn])
def chat_history(
    thread_id: str,
    user_id: str = Query(default="default"),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    uid = _resolve_user_id(user_id, x_user_id)
    admin = is_admin_user(uid)
    routing, _ = _get_graph_pair()
    snapshot = routing.get_state(_config(thread_id))
    messages = (snapshot.values or {}).get("messages") or []
    return messages_to_history(
        messages,
        limit=CHAT_HISTORY_MAX_TURNS * 2,
        include_token_usage=admin,
    )


# -------------------------------------------------------------------------
# /chat — sync endpoint (graph.invoke on the routing graph only)
# -------------------------------------------------------------------------
# The split-graph design is mostly interesting for streaming. For the
# sync /chat endpoint we still need to produce a final answer, so we
# run the routing graph + LLM call + finish graph in sequence on the
# request thread. This keeps behaviour parity with the v1 endpoint.

@app.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY", "").startswith("<"):
        raise HTTPException(503, "Dat OPENAI_API_KEY trong .env (venv/.env hoac project root).")

    uid = _resolve_user_id(req.user_id, x_user_id)
    admin = is_admin_user(uid)
    routing, finish_g = _get_graph_pair()
    model = create_chat_model(temperature=0.2)

    usage_handler = TokenUsageCallbackHandler()
    set_active_token_handler(usage_handler)
    t0 = perf_counter()
    try:
        # 1) routing graph
        t_routing0 = perf_counter()
        state = routing.invoke(
            {
                "messages": [user_message(req.message)],
                "user_query": req.message,
                "user_context": req.user_context or {},
                "reflection_count": 0,
            },
            config=_config(req.thread_id),
        )
        t_routing1 = perf_counter()

        # 2) external LLM call
        t_llm0 = perf_counter()
        llm_messages = state.get("llm_messages") or []
        if state.get("route_id") == "clarify":
            # clarify path — buffer the rule-based text into a single answer
            answer_chunks: list[str] = []
            import asyncio

            async def _collect_clarify():
                async for c in clarify_stream_async(llm_messages, state):
                    answer_chunks.append(c)

            asyncio.run(_collect_clarify())
            answer = "".join(answer_chunks)
        else:
            # generate path — collect the async stream
            answer_chunks = []

            async def _collect_generate():
                async for c in generate_stream_async(llm_messages):
                    answer_chunks.append(c)

            asyncio.run(_collect_generate())
            answer = "".join(answer_chunks)
        t_llm1 = perf_counter()

        # 3) finish graph — persist structured_memory + token usage
        t_finish0 = perf_counter()
        merged = {**state, "final_answer": answer}
        finished = finish_g.invoke(merged, config=_config(req.thread_id))
        t_finish1 = perf_counter()
    finally:
        set_active_token_handler(None)

    t_hist0 = perf_counter()
    snapshot = routing.get_state(_config(req.thread_id))
    history = messages_to_history(
        (snapshot.values or {}).get("messages") or [],
        limit=CHAT_HISTORY_MAX_TURNS * 2,
        include_token_usage=admin,
    )
    t_hist1 = perf_counter()
    products = documents_to_products(state.get("documents", []), limit=6)
    t1 = perf_counter()

    token_usage: TokenUsage | None = None
    if admin:
        raw = finished.get("last_token_usage") or usage_handler.to_dict()
        token_usage = TokenUsage(**raw)

    return ChatResponse(
        answer=answer,
        route_id=state.get("route_id"),
        products=products,
        history=history,
        product_field=state.get("product_field"),
        token_usage=token_usage,
        latency_ms=int((t1 - t0) * 1000),
        timings_ms=(
            {
                "routing_ms": (t_routing1 - t_routing0) * 1000,
                "llm_ms": (t_llm1 - t_llm0) * 1000,
                "finish_ms": (t_finish1 - t_finish0) * 1000,
                "history_ms": (t_hist1 - t_hist0) * 1000,
                "total_ms": (t1 - t0) * 1000,
            }
            if admin
            else None
        ),
    )


# -------------------------------------------------------------------------
# /chat/stream — async SSE streaming endpoint
# -------------------------------------------------------------------------
# Emits the following event sequence:
#   1. event: stage    data: "routing"
#   2. (routing graph runs synchronously, may take a moment)
#   3. event: stage    data: "generating"
#   4. event: token    data: "<chunk>"   (one per streamed text delta)
#   5. event: done     data: "<full>"    (final accumulated answer)
#   6. event: error    data: "<msg>"     (on failure)

@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY", "").startswith("<"):
        raise HTTPException(503, "Dat OPENAI_API_KEY trong .env de su dung chat streaming.")

    routing, finish_g = _get_graph_pair()
    model = create_chat_model(temperature=0.2, streaming=True)
    config = _config(req.thread_id)

    async def generate():
        full_response = ""
        try:
            # 1) routing stage
            yield format_stage_event(STAGE_ROUTING)
            state = routing.invoke(
                {
                    "messages": [user_message(req.message)],
                    "user_query": req.message,
                    "user_context": req.user_context or {},
                    "reflection_count": 0,
                },
                config=config,
            )

            # 2) generating stage
            yield format_stage_event(STAGE_GENERATING)

            route_id = state.get("route_id")
            llm_messages = state.get("llm_messages") or []

            if route_id == "clarify":
                # rule-based clarify text — buffer & yield once
                chunks: list[str] = []
                async for c in clarify_stream_async(llm_messages, state):
                    chunks.append(c)
                text = "".join(chunks)
                full_response = text
                yield format_token_event(text)
            else:
                # generate — stream token by token
                async for chunk in generate_stream_async(llm_messages):
                    full_response += chunk
                    yield format_token_event(chunk)

            # 3) finish graph — persist structured_memory, observability
            merged = {**state, "final_answer": full_response}
            finish_g.invoke(merged, config=config)
        except Exception as exc:  # noqa: BLE001
            yield format_error_event(str(exc))
        finally:
            yield format_done_event(full_response)

    return EventSourceResponse(generate())


# -------------------------------------------------------------------------
# Local dev entrypoint
# -------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("agentic_rag.api.main_v2:app", host="0.0.0.0", port=8000, reload=True)
