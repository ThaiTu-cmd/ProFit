"""Load config từ chatbot/.env."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# chatbot/config.py nằm trực tiếp trong chatbot/ nên .env cùng thư mục.
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
