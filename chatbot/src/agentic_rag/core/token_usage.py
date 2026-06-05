"""Track OpenAI token usage per request; admin-only visibility."""

from __future__ import annotations

from contextvars import ContextVar
from typing import Any

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

from agentic_rag.config.settings import ADMIN_USER_IDS
from agentic_rag.schemas.chat import TokenUsage

_active_handler: ContextVar[TokenUsageCallbackHandler | None] = ContextVar(
    "token_usage_handler", default=None
)


def is_admin_user(user_id: str | None) -> bool:
    uid = (user_id or "").strip()
    return uid in ADMIN_USER_IDS


def set_active_token_handler(handler: TokenUsageCallbackHandler | None) -> None:
    _active_handler.set(handler)


def get_active_token_handler() -> TokenUsageCallbackHandler | None:
    return _active_handler.get()


class TokenUsageCallbackHandler(BaseCallbackHandler):
    """Accumulates token_usage from each LLM call in a graph invoke."""

    def __init__(self) -> None:
        self.prompt_tokens = 0
        self.completion_tokens = 0
        self.total_tokens = 0
        self.llm_calls = 0

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        usage = (response.llm_output or {}).get("token_usage") or {}
        if not usage and response.generations:
            for gen_list in response.generations:
                for gen in gen_list:
                    meta = getattr(gen.message, "usage_metadata", None) or {}
                    if meta:
                        usage = {
                            "prompt_tokens": meta.get("input_tokens", 0),
                            "completion_tokens": meta.get("output_tokens", 0),
                            "total_tokens": meta.get("total_tokens", 0),
                        }
                        break
                if usage:
                    break
        self.prompt_tokens += int(usage.get("prompt_tokens") or 0)
        self.completion_tokens += int(usage.get("completion_tokens") or 0)
        self.total_tokens += int(usage.get("total_tokens") or 0)
        if usage:
            self.llm_calls += 1

    def to_usage(self) -> TokenUsage:
        return TokenUsage(
            prompt_tokens=self.prompt_tokens,
            completion_tokens=self.completion_tokens,
            total_tokens=self.total_tokens,
            llm_calls=self.llm_calls,
        )

    def to_dict(self) -> dict[str, int]:
        return self.to_usage().model_dump()
