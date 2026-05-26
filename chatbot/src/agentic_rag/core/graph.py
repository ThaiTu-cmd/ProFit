"""LangGraph pipeline: route → retrieve → generate → reflect (optional).

Transcript: lưu đủ tin user + assistant trong `messages` (Filtering Messages pattern).
LLM chỉ nhận bản đã filter/trim qua `message_filter` — không ghi đè transcript.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from langchain_openai import ChatOpenAI

from langchain_core.messages import AIMessage, HumanMessage, RemoveMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from agentic_rag.config import (
    REFLECTION_MAX_ITERATIONS,
    get_default_route,
    get_prompt,
    get_reflection_instruction,
    get_route_by_id,
    get_router_instruction,
)
from agentic_rag.core.message_filter import (
    assistant_message,
    build_llm_chat_messages,
    transcript_to_dialogue_text,
)
from agentic_rag.core.state import GraphState, RouteDecision
from agentic_rag.core.token_usage import get_active_token_handler
from agentic_rag.llm import create_chat_model
from agentic_rag.retrieval.context import (
    detect_product_field_intent,
    format_documents_for_llm,
    format_user_context,
    products_to_message_payload,
    try_field_answer,
)
from agentic_rag.retrieval.products import (
    documents_to_products,
    postprocess_product_docs,
    prepare_product_retrieval_docs,
)


def build_chat_graph(
    *,
    retrievers: dict[str, Any],
    model: ChatOpenAI | None = None,
):
    """
    retrievers: map retriever name (nutrition, shipping, product, …) → retriever instance.
    """
    model = model or create_chat_model(temperature=0.2)
    router_llm = create_chat_model(temperature=0).with_structured_output(RouteDecision)

    def route_query(state: GraphState) -> GraphState:
        history = transcript_to_dialogue_text(state.get("messages"))
        decision = router_llm.invoke(
            [
                SystemMessage(get_router_instruction()),
                HumanMessage(
                    content=(
                        f"Lịch sử gần đây:\n{history}\n\nCâu hỏi mới: {state['user_query']}"
                    ),
                    name="router_context",
                ),
            ]
        )
        return {"route_id": decision.route_id}

    def retrieve(state: GraphState) -> GraphState:
        route_id = state.get("route_id") or get_default_route()
        route = get_route_by_id(route_id)
        retriever_name = (route or {}).get("retriever", route_id)
        retriever = retrievers.get(retriever_name)
        if retriever is None:
            raise KeyError(
                f"No retriever registered for route '{route_id}' "
                f"(retriever name '{retriever_name}'). "
                f"Available: {sorted(retrievers)}"
            )
        docs = retriever.invoke(state["user_query"])
        if route_id == "product":
            docs = postprocess_product_docs(docs)
            docs = prepare_product_retrieval_docs(docs, state["user_query"])
        field = None
        if route_id == "product":
            field = detect_product_field_intent(state["user_query"])
        return {"documents": docs, "product_field": field}

    def generate(state: GraphState) -> GraphState:
        route_id = state.get("route_id") or get_default_route()
        route = get_route_by_id(route_id)
        prompt_key = (route or {}).get("system_prompt_key", route_id)
        system = get_prompt(prompt_key)
        user_ctx = format_user_context(state.get("user_context"))
        if user_ctx:
            system = f"{system}\n\n{user_ctx}"

        docs = state.get("documents", [])
        products = documents_to_products(docs, limit=6)
        product_payload = products_to_message_payload(products)

        field = state.get("product_field")
        if route_id == "product" and field:
            fast = try_field_answer(docs, field, state["user_query"])
            if fast:
                return {
                    "draft_answer": fast,
                    "final_answer": fast,
                    "skip_reflection": True,
                    "messages": [
                        assistant_message(fast, products=product_payload),
                    ],
                }
            return {
                "draft_answer": (
                    "Dạ em chưa xác định được chính xác sản phẩm quý khách đang hỏi ạ. "
                    "Quý khách cho em xin tên sản phẩm hoặc thương hiệu cụ thể để em trả đúng "
                    f"trường `{field}` ạ."
                ),
                "final_answer": (
                    "Dạ em chưa xác định được chính xác sản phẩm quý khách đang hỏi ạ. "
                    "Quý khách cho em xin tên sản phẩm hoặc thương hiệu cụ thể để em trả đúng "
                    f"trường `{field}` ạ."
                ),
                "skip_reflection": True,
                "messages": [
                    assistant_message(
                        "Dạ em chưa xác định được chính xác sản phẩm quý khách đang hỏi ạ. "
                        "Quý khách cho em xin tên sản phẩm hoặc thương hiệu cụ thể để em trả đúng "
                        f"trường `{field}` ạ.",
                        products=product_payload,
                    ),
                ],
            }

        context = format_documents_for_llm(
            docs, route_id=route_id, user_query=state["user_query"]
        )
        field_hint = ""
        if route_id == "product" and field:
            field_hint = (
                f"\n\n[Lưu ý] Khách hỏi trường `{field}` — chỉ trả đúng trường đó, "
                "tối đa 2 câu, không mô tả dài toàn bộ sản phẩm."
            )

        llm_messages = build_llm_chat_messages(
            system=system,
            transcript=state.get("messages"),
            model=model,
            context_block=context,
            user_query=state["user_query"],
            field_hint=field_hint,
        )
        res = model.invoke(llm_messages)
        return {
            "draft_answer": res.content,
            "reflection_count": state.get("reflection_count", 0),
            "messages": [
                assistant_message(
                    str(res.content or ""),
                    products=product_payload,
                )
            ],
        }

    def reflect(state: GraphState) -> GraphState:
        if state.get("skip_reflection") or state.get("final_answer"):
            return {"final_answer": state.get("final_answer") or state.get("draft_answer", "")}

        count = state.get("reflection_count", 0)
        if count >= REFLECTION_MAX_ITERATIONS:
            return {"final_answer": state.get("draft_answer", "")}

        critique = model.invoke(
            [
                SystemMessage(content=get_reflection_instruction()),
                HumanMessage(
                    content=(
                        f"Q: {state['user_query']}\nAnswer: {state['draft_answer']}"
                    ),
                    name="reflect_critique",
                ),
            ]
        )
        if "NEEDS_FIX" not in (critique.content or "").upper():
            return {"final_answer": state["draft_answer"]}

        fixed = model.invoke(
            [
                SystemMessage(
                    content=(
                        "Sửa câu trả lời theo phản hồi. "
                        "Cấm bịa thông tin; nếu không có trong context thì phải nói rõ là không biết/chưa có trong hệ thống."
                    )
                ),
                HumanMessage(
                    content=(
                        f"Q: {state['user_query']}\nDraft: {state['draft_answer']}\n"
                        f"Critique: {critique.content}"
                    ),
                    name="reflect_fix",
                ),
            ]
        )
        products_kw: list[dict] = []
        for msg in reversed(state.get("messages") or []):
            if isinstance(msg, AIMessage) and msg.additional_kwargs.get("products"):
                products_kw = msg.additional_kwargs["products"]
                break

        updates: GraphState = {
            "draft_answer": fixed.content,
            "reflection_count": count + 1,
        }
        last_ai = _last_assistant_message(state.get("messages"))
        if last_ai and last_ai.id:
            updates["messages"] = [
                RemoveMessage(id=last_ai.id),
                assistant_message(
                    str(fixed.content or ""),
                    products=products_kw or None,
                    token_usage=(last_ai.additional_kwargs or {}).get("token_usage"),
                ),
            ]
        else:
            updates["messages"] = [
                assistant_message(str(fixed.content or ""), products=products_kw or None)
            ]
        return updates

    def should_continue_reflect(state: GraphState) -> Literal["reflect", "finish"]:
        if state.get("final_answer"):
            return "finish"
        if REFLECTION_MAX_ITERATIONS <= 0:
            return "finish"
        if state.get("reflection_count", 0) >= REFLECTION_MAX_ITERATIONS:
            return "finish"
        return "reflect"

    def finish(state: GraphState) -> GraphState:
        answer = state.get("final_answer") or state.get("draft_answer", "")
        handler = get_active_token_handler()
        usage = handler.to_dict() if handler else {}
        out: GraphState = {"final_answer": answer, "last_token_usage": usage}

        last_ai = _last_assistant_message(state.get("messages"))
        if not last_ai:
            return out

        kwargs = dict(last_ai.additional_kwargs or {})
        if usage:
            kwargs["token_usage"] = usage
        products = kwargs.get("products")
        replacement = assistant_message(
            answer,
            products=products,
            token_usage=kwargs.get("token_usage"),
        )
        if last_ai.id:
            out["messages"] = [RemoveMessage(id=last_ai.id), replacement]
        else:
            out["messages"] = [replacement]
        return out

    builder = StateGraph(GraphState)
    builder.add_node("route_query", route_query)
    builder.add_node("retrieve", retrieve)
    builder.add_node("generate", generate)
    builder.add_node("reflect", reflect)
    builder.add_node("finish", finish)

    builder.add_edge(START, "route_query")
    builder.add_edge("route_query", "retrieve")
    builder.add_edge("retrieve", "generate")
    builder.add_edge("generate", "reflect")
    builder.add_conditional_edges(
        "reflect",
        should_continue_reflect,
        {"reflect": "reflect", "finish": "finish"},
    )
    builder.add_edge("finish", END)

    return builder.compile(checkpointer=MemorySaver())


def _last_assistant_message(messages: list | None) -> AIMessage | None:
    for msg in reversed(messages or []):
        if isinstance(msg, AIMessage) and msg.name != "context":
            return msg
    return None
