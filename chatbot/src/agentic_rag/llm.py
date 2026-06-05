"""OpenAI chat models — single default for the whole chatbot."""

from __future__ import annotations

from langchain_openai import ChatOpenAI

from agentic_rag.config.settings import OPENAI_CHAT_MODEL


def create_chat_model(
    *,
    temperature: float = 0.2,
    streaming: bool = False,
    **kwargs,
) -> ChatOpenAI:
    return ChatOpenAI(
        model=OPENAI_CHAT_MODEL,
        temperature=temperature,
        streaming=streaming,
        **kwargs,
    )
