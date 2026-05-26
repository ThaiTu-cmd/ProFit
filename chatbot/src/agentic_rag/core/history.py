"""Convert LangGraph checkpoint messages to API chat history."""

from __future__ import annotations

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from agentic_rag.core.message_filter import (
    ASSISTANT_MESSAGE_NAME,
    USER_MESSAGE_NAME,
    get_full_transcript,
)
from agentic_rag.schemas.chat import ChatTurn, TokenUsage
from agentic_rag.schemas.products import ProductItem


def _parse_token_usage(raw: object) -> TokenUsage | None:
    if not raw or not isinstance(raw, dict):
        return None
    try:
        return TokenUsage(**raw)
    except Exception:
        return None


def messages_to_history(
    messages: list[BaseMessage],
    *,
    limit: int = 40,
    include_token_usage: bool = False,
    full_transcript_only: bool = True,
) -> list[ChatTurn]:
    """Chuyển checkpoint → API history (user + assistant, bỏ message context/router)."""
    source = get_full_transcript(messages) if full_transcript_only else messages
    turns: list[ChatTurn] = []
    for msg in source:
        if isinstance(msg, HumanMessage):
            if msg.name not in (None, USER_MESSAGE_NAME):
                continue
            turns.append(ChatTurn(role="user", content=str(msg.content or "")))
        elif isinstance(msg, AIMessage):
            if msg.name not in (None, ASSISTANT_MESSAGE_NAME):
                continue
            raw_products = (msg.additional_kwargs or {}).get("products") or []
            products: list[ProductItem] = []
            for item in raw_products:
                if isinstance(item, ProductItem):
                    products.append(item)
                elif isinstance(item, dict):
                    try:
                        products.append(ProductItem(**item))
                    except Exception:
                        # Ignore legacy/invalid product payloads from old checkpoints.
                        continue
            usage = None
            if include_token_usage:
                usage = _parse_token_usage(
                    (msg.additional_kwargs or {}).get("token_usage")
                )
            turns.append(
                ChatTurn(
                    role="assistant",
                    content=str(msg.content or ""),
                    products=products,
                    token_usage=usage,
                )
            )
    return turns[-limit:]
