"""FastAPI — Agentic RAG (LangGraph, hybrid retrieval, streaming, LangSmith-ready)."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from time import perf_counter

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import HTMLResponse, StreamingResponse
from langchain_core.messages import HumanMessage
from sse_starlette.sse import EventSourceResponse

from agentic_rag.core.message_filter import user_message
from agentic_rag.api.dependencies import get_graph
from agentic_rag.config import get_routes, is_configured
from agentic_rag.config.settings import (
    ADMIN_USER_IDS,
    ALLOW_DEMO_RETRIEVER,
    CHAT_HISTORY_MAX_TURNS,
    OPENAI_CHAT_MODEL,
    PGVECTOR_COLLECTION,
    PGVECTOR_CONNECTION,
    REFLECTION_MAX_ITERATIONS,
)
from agentic_rag.llm import create_chat_model
from agentic_rag.core.history import messages_to_history
from agentic_rag.core.token_usage import (
    TokenUsageCallbackHandler,
    is_admin_user,
    set_active_token_handler,
)
from agentic_rag.retrieval.products import documents_to_products
from agentic_rag.schemas.chat import ChatRequest, ChatResponse, ChatTurn, TokenUsage

load_dotenv()

app = FastAPI(title="Agentic RAG API", version="1.0.0")
_PLAYGROUND_HTML = Path(__file__).with_name("playground.html")


def _graph_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def _resolve_user_id(body_user_id: str, header_user_id: str | None) -> str:
    return (header_user_id or body_user_id or "default").strip()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "openai_key_set": bool(os.getenv("OPENAI_API_KEY")),
        "langsmith": os.getenv("LANGCHAIN_TRACING_V2", "false"),
        "pgvector": PGVECTOR_CONNECTION,
        "pgvector_collection": PGVECTOR_COLLECTION,
        "allow_demo_retriever": ALLOW_DEMO_RETRIEVER,
        "config_customized": is_configured(),
        "routes": [x.get("id") for x in get_routes()],
        "reflection_enabled": REFLECTION_MAX_ITERATIONS > 0,
        "reflection_max_iterations": REFLECTION_MAX_ITERATIONS,
        "admin_user_ids": sorted(ADMIN_USER_IDS),
        "chat_model": OPENAI_CHAT_MODEL,
    }


@app.get("/playground", response_class=HTMLResponse)
def playground():
    return _PLAYGROUND_HTML.read_text(encoding="utf-8")


@app.get("/chat/history/{thread_id}", response_model=list[ChatTurn])
def chat_history(
    thread_id: str,
    user_id: str = Query(default="default", description="Chỉ admin mới thấy token_usage trong history"),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    uid = _resolve_user_id(user_id, x_user_id)
    admin = is_admin_user(uid)
    graph = get_graph()
    snapshot = graph.get_state(_graph_config(thread_id))
    messages = (snapshot.values or {}).get("messages") or []
    return messages_to_history(
        messages,
        limit=CHAT_HISTORY_MAX_TURNS * 2,
        include_token_usage=admin,
    )


@app.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY", "").startswith("<"):
        raise HTTPException(503, "Đặt OPENAI_API_KEY trong .env (venv/.env hoặc project root).")

    uid = _resolve_user_id(req.user_id, x_user_id)
    admin = is_admin_user(uid)

    graph = get_graph()
    usage_handler = TokenUsageCallbackHandler()
    set_active_token_handler(usage_handler)
    t0 = perf_counter()
    try:
        config = {
            **_graph_config(req.thread_id),
            "callbacks": [usage_handler],
        }
        t_invoke0 = perf_counter()
        result = graph.invoke(
            {
                "messages": [user_message(req.message)],
                "user_query": req.message,
                "user_context": req.user_context or {},
                "reflection_count": 0,
            },
            config=config,
        )
        t_invoke1 = perf_counter()
    finally:
        set_active_token_handler(None)

    t_hist0 = perf_counter()
    snapshot = graph.get_state(_graph_config(req.thread_id))
    history = messages_to_history(
        (snapshot.values or {}).get("messages") or [],
        limit=CHAT_HISTORY_MAX_TURNS * 2,
        include_token_usage=admin,
    )
    t_hist1 = perf_counter()
    products = documents_to_products(result.get("documents", []), limit=6)
    t1 = perf_counter()

    token_usage: TokenUsage | None = None
    if admin:
        raw = result.get("last_token_usage") or usage_handler.to_dict()
        token_usage = TokenUsage(**raw)

    return ChatResponse(
        answer=result.get("final_answer") or result.get("draft_answer", ""),
        route_id=result.get("route_id"),
        products=products,
        history=history,
        product_field=result.get("product_field"),
        token_usage=token_usage,
        latency_ms=int((t1 - t0) * 1000),
        timings_ms=(
            {
                "graph_invoke_ms": (t_invoke1 - t_invoke0) * 1000,
                "history_ms": (t_hist1 - t_hist0) * 1000,
                "total_ms": (t1 - t0) * 1000,
            }
            if admin
            else None
        ),
    )


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming endpoint - uses LangGraph's stream mode for async response streaming."""
    if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY", "").startswith("<"):
        raise HTTPException(503, "Đặt OPENAI_API_KEY trong .env để sử dụng chat streaming.")

    graph = get_graph()
    
    async def generate():
        full_response = ""
        try:
            config = {
                "configurable": {"thread_id": req.thread_id or f"web_{asyncio.get_event_loop().time()}"}
            }
            
            # Use LangGraph's stream for async streaming
            async for event in graph.astream(
                {
                    "messages": [user_message(req.message)],
                    "user_query": req.message,
                    "user_context": req.user_context or {},
                    "reflection_count": 0,
                },
                config=config,
                stream_mode="messages",
            ):
                # event is a tuple of (chunk, metadata)
                if event and len(event) >= 1:
                    chunk = event[0]
                    # Handle different chunk types from streaming
                    if hasattr(chunk, 'content') and chunk.content:
                        content = chunk.content
                        if isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict) and item.get('type') == 'text':
                                    text = item.get('text', '')
                                    full_response += text
                                    yield {
                                        "event": "message",
                                        "data": text
                                    }
                        elif isinstance(content, str):
                            full_response += content
                            yield {
                                "event": "message", 
                                "data": content
                            }
        except asyncio.CancelledError:
            pass
        except Exception as e:
            yield {
                "event": "error",
                "data": str(e)
            }
        finally:
            yield {
                "event": "done",
                "data": full_response
            }

    return EventSourceResponse(generate())


@app.post("/chat/stream/simple")
def chat_stream_simple(req: ChatRequest):
    """Simple SSE streaming endpoint - streams LLM response directly."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(503, "OPENAI_API_KEY chưa được cấu hình.")

    model = create_chat_model(temperature=0.2, streaming=True)

    def gen():
        try:
            for chunk in model.stream([HumanMessage(content=req.message)]):
                if chunk.content:
                    yield f"data: {chunk.content}\n\n"
        except Exception as e:
            yield f"data: [Lỗi] {str(e)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("agentic_rag.api.main:app", host="0.0.0.0", port=8000, reload=True)
