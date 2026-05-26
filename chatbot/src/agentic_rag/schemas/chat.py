"""HTTP request/response models."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from agentic_rag.schemas.products import ProductItem


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    llm_calls: int = Field(
        default=0, description="Số lần gọi LLM trong request (router, generate, reflect, …)"
    )


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductItem] = Field(default_factory=list)
    token_usage: TokenUsage | None = Field(
        default=None,
        description="Chỉ có khi user_id là admin (vd. user 1)",
    )


class ChatRequest(BaseModel):
    message: str
    thread_id: str = Field(default="default")
    user_id: str = Field(
        default="default",
        description='ID người dùng. Chỉ user trong ADMIN_USER_IDS (mặc định "1") thấy token_usage.',
    )
    user_context: dict[str, Any] | None = Field(
        default=None,
        description="Thông tin khách/đơn hàng (customer_name, order_id, cart_items, …)",
    )


class ChatResponse(BaseModel):
    answer: str
    route_id: str | None = None
    products: list[ProductItem] = Field(default_factory=list)
    history: list[ChatTurn] = Field(default_factory=list)
    product_field: str | None = Field(
        default=None,
        description="Trường sản phẩm được nhận diện (price, weight, origin, …)",
    )
    latency_ms: int | None = Field(
        default=None,
        description="Thời gian xử lý server-side cho /chat (ms)",
    )
    token_usage: TokenUsage | None = Field(
        default=None,
        description="Token dùng cho lượt chat này — chỉ trả về cho admin (user 1)",
    )
    timings_ms: dict[str, float] | None = Field(
        default=None,
        description="Timing breakdown (ms) — chỉ trả về cho admin (user 1)",
    )
