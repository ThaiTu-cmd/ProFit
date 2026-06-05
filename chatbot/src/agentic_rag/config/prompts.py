"""System prompts and router instructions — YAML with built-in defaults."""

from __future__ import annotations

from typing import Any

import yaml

from agentic_rag.config.settings import CONFIG_DIR

DEFAULT_PROMPTS: dict[str, str] = {
    "nutrition": (
        "Bạn là chuyên gia dinh dưỡng. Chuyên trả lời các thắc mắc của khách hàng về Whey"
        "Trả lời dựa trên tài liệu context, "
        "không bịa liều lượng hoặc công dụng y tế. Nếu không biết hãy trả lời không biết."
        "Luôn đưa ra cảnh báo là chỉ mang tính chất tham khảo, không phải tư vấn y tế chính thức."
    ),
    "shipping": (
        "Bạn tư vấn vận chuyển và FAQ chính sách cửa hàng. "
        "Trả lời ngắn gọn, đúng quy định trong context."
    ),
    "product": (
        "Bạn tư vấn sản phẩm e-commerce. Giá và khối lượng trong metadata đã được format. "
        "Gợi ý sản phẩm phù hợp, không bịa tồn kho."
    ),
    "general": "Bạn là trợ lý bán hàng thân thiện, trả lời dựa trên context khi có.",
}

DEFAULT_ROUTER_INSTRUCTION = (
    "Phân loại câu hỏi khách vào một route_id: nutrition, shipping, product, hoặc general."
)

DEFAULT_REFLECTION_INSTRUCTION = (
    "Đánh giá câu trả lời. Trả NEEDS_FIX nếu sai fact/thiếu context/bịa; ngược lại trả OK."
)


def _load_prompts_yaml() -> dict[str, Any]:
    for candidate in (CONFIG_DIR / "prompts.yaml", CONFIG_DIR / "prompts.yaml.example"):
        if candidate.exists():
            with candidate.open(encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
    return {}


def get_prompts() -> dict[str, str]:
    data = _load_prompts_yaml()
    prompts = dict(data.get("prompts") or {})
    return {**DEFAULT_PROMPTS, **prompts}


def get_prompt(key: str) -> str:
    return get_prompts().get(key) or get_prompts()["general"]


def get_router_instruction() -> str:
    data = _load_prompts_yaml()
    return str(data.get("router_instruction") or DEFAULT_ROUTER_INSTRUCTION)


def get_reflection_instruction() -> str:
    data = _load_prompts_yaml()
    return str(data.get("reflection_instruction") or DEFAULT_REFLECTION_INSTRUCTION)
