"""Filtering Messages — lưu full transcript, chỉ lọc/trim khi gửi LLM.

Pattern LangChain/LangGraph:
- `messages` trong checkpoint: giữ **toàn bộ** HumanMessage (user) + AIMessage (assistant).
- `filter_messages` + `trim_messages`: chỉ áp dụng trên bản sao, không ghi đè checkpoint.
"""

from __future__ import annotations

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    filter_messages,
    trim_messages,
)
from langchain_openai import ChatOpenAI

from agentic_rag.config.settings import CHAT_TRIM_MAX_TOKENS

USER_MESSAGE_NAME = "user"
ASSISTANT_MESSAGE_NAME = "assistant"


def user_message(content: str) -> HumanMessage:
    """Tin nhắn khách — luôn lưu vào transcript."""
    return HumanMessage(content=content, name=USER_MESSAGE_NAME)


def assistant_message(
    content: str,
    *,
    products: list[dict] | None = None,
    token_usage: dict | None = None,
) -> AIMessage:
    """Tin nhắn bot — luôn lưu vào transcript."""
    kwargs: dict = {}
    if products:
        kwargs["products"] = products
    if token_usage:
        kwargs["token_usage"] = token_usage
    return AIMessage(
        content=content,
        name=ASSISTANT_MESSAGE_NAME,
        additional_kwargs=kwargs or None,
    )


def get_full_transcript(messages: list[BaseMessage] | None) -> list[BaseMessage]:
    """Mọi lượt user + assistant đã lưu (không system/tool)."""
    if not messages:
        return []
    named = filter_messages(
        messages,
        include_types=(HumanMessage, AIMessage),
        include_names=(USER_MESSAGE_NAME, ASSISTANT_MESSAGE_NAME),
    )
    if named:
        return named
    return filter_messages(messages, include_types=(HumanMessage, AIMessage))


def filter_messages_for_llm(
    messages: list[BaseMessage] | None,
    *,
    model: ChatOpenAI,
    max_tokens: int = CHAT_TRIM_MAX_TOKENS,
) -> list[BaseMessage]:
    """Lọc transcript rồi trim — chỉ dùng cho prompt LLM, không persist."""
    transcript = get_full_transcript(messages)
    if not transcript:
        return []
    trimmer = trim_messages(
        max_tokens=max_tokens,
        strategy="last",
        token_counter=model,
        include_system=False,
        allow_partial=False,
        start_on="human",
    )
    return trimmer.invoke(transcript)


def transcript_to_dialogue_text(
    messages: list[BaseMessage] | None,
    *,
    max_turns: int = 12,
) -> str:
    """Chuỗi hội thoại cho router (từ transcript đầy đủ, không trim token)."""
    transcript = get_full_transcript(messages)
    if not transcript:
        return "(không có)"
    lines: list[str] = []
    for msg in transcript[-max_turns * 2 :]:
        if isinstance(msg, HumanMessage):
            lines.append(f"Khách: {msg.content}")
        elif isinstance(msg, AIMessage):
            lines.append(f"Bot: {msg.content}")
    return "\n".join(lines) if lines else "(không có)"


def build_llm_chat_messages(
    *,
    system: str,
    transcript: list[BaseMessage] | None,
    model: ChatOpenAI,
    context_block: str,
    user_query: str,
    field_hint: str = "",
    max_tokens: int = CHAT_TRIM_MAX_TOKENS,
) -> list[BaseMessage]:
    """System + lịch sử đã filter/trim + một HumanMessage context (không lưu checkpoint)."""
    history = filter_messages_for_llm(transcript, model=model, max_tokens=max_tokens)
    return [
        SystemMessage(system),
        *history,
        HumanMessage(
            content=(
                f"Context (chỉ dùng dữ liệu dưới đây, cấm bịa; không biết thì nói không biết/chưa có trong hệ thống):\n{context_block}"
                f"{field_hint}\n\nCâu hỏi: {user_query}"
            ),
            name="context",
        ),
    ]
