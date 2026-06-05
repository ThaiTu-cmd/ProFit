"""Shim — use `agentic_rag.core.graph` in new code."""

from agentic_rag.config.settings import CHAT_TRIM_MAX_TOKENS, REFLECTION_MAX_ITERATIONS
from agentic_rag.core.graph import build_chat_graph
from agentic_rag.core.state import GraphState, RouteDecision

TRIM_MAX_TOKENS = CHAT_TRIM_MAX_TOKENS  # legacy notebook alias

__all__ = [
    "CHAT_TRIM_MAX_TOKENS",
    "GraphState",
    "REFLECTION_MAX_ITERATIONS",
    "RouteDecision",
    "TRIM_MAX_TOKENS",
    "build_chat_graph",
]
