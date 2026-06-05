"""Shim — use `agentic_rag.config` in new code."""

from agentic_rag.config import *  # noqa: F403
from agentic_rag.config import is_configured  # noqa: F401
from agentic_rag.config.prompts import DEFAULT_PROMPTS, DEFAULT_ROUTER_INSTRUCTION
from agentic_rag.config.routes import DEFAULT_ROUTES
from agentic_rag.config.settings import CONFIG_DIR, PROJECT_ROOT
