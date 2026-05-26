"""Routing and prompt configuration."""

from agentic_rag.config.prompts import (
    get_prompt,
    get_prompts,
    get_reflection_instruction,
    get_router_instruction,
)
from agentic_rag.config.routes import get_default_route, get_route_by_id, get_routes
from agentic_rag.config.settings import (
    CHAT_TRIM_MAX_TOKENS,
    CONFIG_DIR,
    PGVECTOR_COLLECTION,
    PGVECTOR_CONNECTION,
    PROJECT_ROOT,
    REFLECTION_MAX_ITERATIONS,
)


def is_configured() -> bool:
    """True when operator copied routes.yaml or prompts.yaml (not only *.example)."""
    return (CONFIG_DIR / "routes.yaml").exists() or (CONFIG_DIR / "prompts.yaml").exists()


__all__ = [
    "CHAT_TRIM_MAX_TOKENS",
    "CONFIG_DIR",
    "PGVECTOR_COLLECTION",
    "PGVECTOR_CONNECTION",
    "PROJECT_ROOT",
    "REFLECTION_MAX_ITERATIONS",
    "get_default_route",
    "get_prompt",
    "get_prompts",
    "get_reflection_instruction",
    "get_route_by_id",
    "get_router_instruction",
    "get_routes",
    "is_configured",
]
