"""Project paths and environment-backed settings."""

from __future__ import annotations

import os
from pathlib import Path

# src/agentic_rag/config/settings.py -> project root is parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[3]
CONFIG_DIR = PROJECT_ROOT / "config"

PGVECTOR_CONNECTION = os.getenv(
    "PGVECTOR_CONNECTION",
    "postgresql+psycopg://langchain:langchain@localhost:6024/langchain",
)
PGVECTOR_COLLECTION = os.getenv("PGVECTOR_COLLECTION", "my_docs")
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-5-nano")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")


def _env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default).lower()).lower() in ("1", "true", "yes", "on")


ALLOW_DEMO_RETRIEVER = _env_bool("ALLOW_DEMO_RETRIEVER", default=False)
ENABLE_REFLECTION = _env_bool("ENABLE_REFLECTION", default=False)
REFLECTION_MAX_ITERATIONS = (
    int(os.getenv("REFLECTION_MAX_ITERATIONS", "3"))
    if ENABLE_REFLECTION
    else 0
)
CHAT_TRIM_MAX_TOKENS = int(os.getenv("CHAT_TRIM_MAX_TOKENS", "2000"))
CHAT_HISTORY_MAX_TURNS = int(os.getenv("CHAT_HISTORY_MAX_TURNS", "12"))
# Chỉ user_id trong danh sách này mới thấy token_usage (mặc định: user "1")
ADMIN_USER_IDS = {
    x.strip()
    for x in os.getenv("ADMIN_USER_IDS", "1").split(",")
    if x.strip()
}
