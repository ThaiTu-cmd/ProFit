"""Route definitions — YAML with built-in defaults."""

from __future__ import annotations

from typing import Any

import yaml

from agentic_rag.config.settings import CONFIG_DIR

DEFAULT_ROUTES: list[dict[str, Any]] = [
    {
        "id": "nutrition",
        "description": "Dinh dưỡng, thành phần, liều dùng, tư vấn sản phẩm bổ sung(chỉ dùng cho whey protein)",
        "retriever": "nutrition",
        "system_prompt_key": "nutrition",
    },
    {
        "id": "shipping",
        "description": "Vận chuyển, đổi trả, phí ship, FAQ bảo hiểm/giao hàng",
        "retriever": "shipping",
        "system_prompt_key": "shipping",
    },
    {
        "id": "product",
        "description": (
            "Tra cứu catalog sản phẩm theo sku, tên, thương hiệu, danh mục, giá, "
            "khối lượng, hương vị, loại whey/protein, lactose, xuất xứ, khẩu phần, "
            "số lần dùng, link sản phẩm, ảnh sản phẩm, mô tả ngắn; so sánh và tư vấn chọn sản phẩm"
        ),
        "retriever": "product",
        "system_prompt_key": "product",
    },
    {
        "id": "general",
        "description": "Câu hỏi chung: giờ mở cửa, liên hệ, tích điểm, app, workshop",
        "retriever": "general",
        "system_prompt_key": "general",
    },
]


def _load_routes_yaml() -> dict[str, Any]:
    for candidate in (CONFIG_DIR / "routes.yaml", CONFIG_DIR / "routes.yaml.example"):
        if candidate.exists():
            with candidate.open(encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
    return {}


def get_routes() -> list[dict[str, Any]]:
    data = _load_routes_yaml()
    routes = list(data.get("routes") or [])
    return routes if routes else DEFAULT_ROUTES


def get_default_route() -> str:
    data = _load_routes_yaml()
    return str(data.get("default_route") or "general")


def get_route_by_id(route_id: str) -> dict[str, Any] | None:
    for r in get_routes():
        if r.get("id") == route_id:
            return r
    return None
