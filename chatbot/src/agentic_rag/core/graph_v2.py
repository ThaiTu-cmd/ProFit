"""LangGraph v2 — Single unified pipeline with persistent structured memory.

Architecture (split-graph design for streaming):
    ┌─────────────────────────┐         ┌────────────────────┐
    │   ROUTING GRAPH         │         │  FINISH GRAPH      │
    │   (no LLM call)         │         │  (single source    │
    │                         │         │   of truth for     │
    │   START                 │         │   save logic)      │
    │     ↓                   │         │                    │
    │   build_memory          │         │   START            │
    │     ↓                   │         │     ↓              │
    │   memory_trim           │  ───►   │   finish           │
    │     ↓                   │  state  │     ↓              │
    │   retrieve              │  inject │   END              │
    │     ↓                   │         │                    │
    │   check_product_info    │         │   - save message   │
    │     ↓                   │         │   - observability  │
    │   prepare_generation    │         │   - checkpoint     │
    │   OR                    │         │   - structured_mem │
    │   prepare_clarify       │         │                    │
    │     ↓                   │         │                    │
    │   END                   │         │                    │
    └─────────────────────────┘         └────────────────────┘

LLM calls happen OUTSIDE the graphs in `generate_stream_sync` /
`generate_stream_async`. Both endpoints (/chat and /chat/stream) share
the same `finish` graph, so save logic stays in one place.

Structured Memory Design:
- A dict stored IN the LangGraph checkpoint (persists across turns for same thread_id).
- Fields: budget, goal, dietary, shipping_address, name, phone, ...
- BUILT from the CURRENT message + READ from existing checkpoint value.
- LATER message OVERWRITES earlier value (e.g. "not lactose intolerant" replaces
  "lactose intolerant"). Use keyword negation detection.
- memory_trim trims the raw message list but leaves structured_memory intact.
- prepare_generation/prepare_clarify store structured_memory in AIMessage.additional_kwargs
  so finish can write it back to the checkpoint.
"""

from __future__ import annotations

import re
from time import perf_counter
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from langchain_openai import ChatOpenAI

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    RemoveMessage,
    SystemMessage,
    ToolMessage,
)
from langgraph.checkpoint.memory import MemorySaver
try:
    from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver  # noqa: F401
except Exception:
    # langgraph 1.2.x moved/renamed this path. The split-graph design here
    # uses InMemorySaver by default; the AsyncSqliteSaver helper is only
    # consulted via _get_sqlite_checkpointer() at runtime, so a missing
    # top-level import is fine as long as no caller asks for sqlite persistence.
    AsyncSqliteSaver = None  # type: ignore[assignment]
from langgraph.graph import END, START, StateGraph

# Singleton SqliteSaver — persisted to file, survives server restarts and page refreshes.
_sqlite_checkpointer: SqliteSaver | None = None


def _get_sqlite_checkpointer():
    """Async-first checkpointer — AsyncSqliteSaver is required in langgraph 1.x
    because the streaming endpoint uses graph.astream() and the sync
    SqliteSaver does not support async methods.

    The returned AsyncSqliteSaver is kept alive for the process lifetime so
    both /chat (graph.invoke) and /chat/stream (graph.astream) reuse it.
    """
    global _sqlite_checkpointer
    if _sqlite_checkpointer is None:
        import os
        import asyncio

        db_path = os.environ.get(
            "LANGGRAPH_DB",
            os.path.join(os.path.dirname(__file__), "..", "..", "checkpoints.db"),
        )
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        # AsyncSqliteSaver.from_conn_string is an _AsyncGeneratorContextManager
        # in langgraph 1.x — we need to keep the underlying aiosqlite
        # connection open. Open it manually and construct the saver directly.
        import aiosqlite
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver as _AsyncSaver
        # AsyncSqliteSaver expects an aiosqlite connection. We open a
        # persistent connection here and pass it to the saver.
        self_ref = {"conn": None, "saver": None}

        async def _init():
            conn = await aiosqlite.connect(db_path)
            saver = _AsyncSaver(conn)
            await saver.setup()
            self_ref["conn"] = conn
            self_ref["saver"] = saver
            return saver

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're inside an async context (e.g. during test); fall back
                # to creating a new loop in a worker thread.
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
                    ex.submit(asyncio.run, _init()).result()
            else:
                loop.run_until_complete(_init())
        except RuntimeError:
            asyncio.run(_init())

        _sqlite_checkpointer = self_ref["saver"]
        print(f"[CHECKPOINTER] Using AsyncSqliteSaver at {db_path}")
    return _sqlite_checkpointer


from agentic_rag.config import get_prompt
from agentic_rag.core.message_filter import (
    assistant_message,
    build_llm_chat_messages,
    get_full_transcript,
    user_message,
)
from agentic_rag.core.state import GraphState
from agentic_rag.core.token_usage import get_active_token_handler
from agentic_rag.llm import create_chat_model
from agentic_rag.retrieval.context import (
    format_documents_for_llm,
    format_user_context,
    products_to_message_payload,
)
from agentic_rag.retrieval.products import (
    documents_to_products,
    postprocess_product_docs,
    prepare_product_retrieval_docs,
)

# --- Streaming stage observability ---------------------------------------
# Per-node timing logs go to BOTH:
#   1. Server console (print with flush=True) — for dev debugging
#   2. Active SSE stage callback — for admin frontend to render pipeline
#
# The callback is registered by the /chat/stream endpoint via
# `set_stage_callback(...)` (see api/main.py). When unset, _stage()
# silently no-ops on the SSE side so non-streaming code paths (e.g. tests,
# batch jobs) are not affected.
from agentic_rag.core.stage_events import (
    emit_stage,
    set_stage_callback,
    timing_summary,
)

# --- Constants -----------------------------------------------------------
MAX_USER_MESSAGES = 7
MAX_BOT_MESSAGES = 7

PRODUCT_GOALS = [
    "weight_loss", "muscle_gain", "recovery", "bulking",
    "general_fitness", "performance", "lean_muscle", "endurance", "strength",
]

# Goals that appear in the dataset per category (ordered by frequency)
CATEGORY_GOALS: dict[str, list[str]] = {
    "whey": [
        "weight_loss",     # giảm mỡ
        "recovery",        # phục hồi
        "muscle_gain",     # tăng cơ
        "lean_muscle",     # tăng cơ nạc
        "general_fitness", # tổng thể
    ],
    "creatine": [
        "muscle_gain",    # tăng cơ
        "performance",     # hiệu suất
        "strength",        # sức mạnh
        "recovery",        # phục hồi
        "lean_muscle",     # tăng cơ nạc
    ],
    "preworkout": [
        "recovery",        # phục hồi
        "muscle_gain",    # tăng cơ
        "endurance",      # sức bền
        "strength",       # sức mạnh
        "performance",     # hiệu suất
    ],
    "protein_bars": [
        "muscle_gain",    # tăng cơ
        "weight_loss",   # giảm mỡ
        "recovery",       # phục hồi
        "lean_muscle",    # tăng cơ nạc
        "general_fitness",# tổng thể
    ],
}

GOAL_LABELS: dict[str, str] = {
    "weight_loss":      "Giảm mỡ",
    "muscle_gain":      "Tăng cơ",
    "recovery":         "Phục hồi",
    "bulking":          "Bulk (tăng cân)",
    "general_fitness":  "Tổng thể",
    "performance":      "Hiệu suất",
    "lean_muscle":      "Tăng cơ nạc",
    "endurance":        "Sức bền",
    "strength":         "Sức mạnh",
}

DIETARY_TAGS = [
    "lactose_free", "gluten_free", "soy_free", "non_gmo",
    "low_sugar", "vegan", "vegetarian", "keto_friendly", "kosher",
]

# Vietnamese → English goal synonyms (used by _extract_goal_from_query)
# Maps natural-language phrases the user might say to the canonical goal key.
GOAL_SYNONYMS: dict[str, list[str]] = {
    "muscle_gain": [
        "tăng cơ", "phát triển cơ bắp", "cơ bắp", "lên cơ", "xây cơ", "tăng khối lượng cơ",
        "build muscle", "gain muscle", "muscle", "tăng cơ bắp",
    ],
    "weight_loss": [
        "giảm mỡ", "giảm cân", "đốt mỡ", "giảm béo", "eo thon", "siết mỡ", "cutting",
        "lose weight", "lose fat", "fat loss", "weight loss", "giảm kg",
    ],
    "recovery": [
        "phục hồi", "hồi phục", "nghỉ ngơi", "giảm đau nhức", "đau cơ", "mệt mỏi",
        "recover", "recovery", "rest",
    ],
    "endurance": [
        "sức bền", "bền bỉ", "chạy bộ", "cardio", "nâng cao sức bền", "tăng bền",
        "endurance", "stamina", "marathon", "bền",
    ],
    "strength": [
        "sức mạnh", "mạnh hơn", "nâng tạ nặng", "cải thiện sức mạnh", "tăng lực",
        "strength", "power", "stronger", "max strength",
    ],
    "performance": [
        "hiệu suất", "hiệu năng", "hiệu quả", "tập luyện tốt hơn", "cải thiện tập luyện",
        "cải thiện hiệu suất", "tăng hiệu suất", "nâng cao hiệu suất", "phong độ",
        "performance", "improve performance", "better workout", "training performance",
    ],
    "bulking": [
        "bulk", "bulking", "tăng cân", "lên cân", "tăng khối lượng", "mass",
    ],
    "lean_muscle": [
        "cơ nạc", "tăng cơ nạc", "lean", "gầy mà có cơ", "khô cơ", "tăng cơ giảm mỡ",
        "lean muscle", "shredded",
    ],
    "general_fitness": [
        "tổng thể", "sức khỏe tổng thể", "khỏe mạnh", "fitness", "tập chung",
        "general fitness", "overall health", "healthy",
    ],
}


# --- Helper: build AIMessage for finish node (used by routing_graph) -------

def build_ai_message(
    content: str,
    products: list | None = None,
    structured_memory: dict | None = None,
    token_usage: dict | None = None,
) -> AIMessage:
    """Build an AIMessage for the routing graph to append to its messages list.

    The routing graph uses `add_messages` reducer on messages, so appending
    an AIMessage here will be merged into the checkpointed messages list.
    The finish_graph then reads these messages from the shared checkpointer.
    """
    extra = {}
    if products:
        extra["products"] = products
    if structured_memory:
        extra["structured_memory"] = structured_memory
    if token_usage:
        extra["token_usage"] = token_usage

    return AIMessage(content=content, additional_kwargs=extra)
# =========================================================================
# Extraction helpers
# =========================================================================

def _extract_budget_from_query(query: str) -> float | None:
    """Extract budget amount (VND) from user query text.

    To avoid false positives like "5 lần 1 tuần" → 5,000 VND, we only
    extract a number as budget when at least one money keyword appears
    in the same sentence (k, triệu, đồng, vnd, ngân sách, budget, price,
    giá, chi, tiêu, khoảng, tầm).
    """
    text = query.lower()

    money_keywords = (
        "triệu", "tr", "k ", "k)", "k.", "k,", "k!", "k?", "k:",
        "đồng", "vnđ", "vnd", "ngân sách", "budget", "price",
        "giá", "chi", "tiêu", "khoảng", "tầm",
    )
    has_money_kw = any(kw in text for kw in money_keywords)

    patterns = [
        r"(\d+[\.,]?\d*)\s*(triệu|tr)\b",
        r"(\d+)\s*k\b",
        r"(dưới|trên|từ|khoảng|tầm)\s*(\d+[\.,]?\d*)",
        r"(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:k|ngàn|nghìn|đồng|vnđ|vnd)\b",
    ]
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            val_str = m.group(1) or m.group(2) or m.group(3)
            if not val_str:
                continue
            val = float(val_str.replace(",", "").replace(".", ""))
            full = m.group(0)
            if "triệu" in full or "tr" in full:
                return val * 1_000_000
            if re.search(r"\d+\s*k\b", full):
                return val * 1_000
            # "dưới 600", "trên 1 triệu" etc — assume million for safety
            if "triệu" in full:
                return val * 1_000_000
            if "k" in full or "ngàn" in full or "nghìn" in full:
                return val * 1_000
            return val

    # Fallback: only if money keyword is present, scan for bare numbers
    # in a reasonable range (100k–10M VND)
    if has_money_kw:
        nums = re.findall(r"(\d+(?:[.,]\d+)?)", text)
        for n in nums:
            val = float(n.replace(",", "").replace(".", ""))
            if 100 <= val <= 10000:  # bare number, assume million
                return val * 1_000_000
            if 100_000 <= val <= 10_000_000:
                return val  # already in VND
    return None


def _extract_goal_from_query(query: str) -> str | None:
    """Extract product goal keyword from user query.

    Strategy:
      1. Longest-match first across GOAL_SYNONYMS — avoids partial matches like
         "tăng cơ nạc" being captured as "tăng cơ" (muscle_gain) when the
         actual intent is "cơ nạc" (lean_muscle).
      2. Fall back to exact PRODUCT_GOALS match for English keywords like
         "muscle_gain", "weight_loss", etc.

    Returns the canonical goal key, or None if no goal was detected.
    """
    text = _normalize_text(query)

    # Pass 1: collect all matching phrases with their goal
    matches: list[tuple[int, str, str]] = []  # (phrase_length, phrase, goal)
    for goal, phrases in GOAL_SYNONYMS.items():
        for phrase in phrases:
            norm_phrase = _normalize_text(phrase)
            if not norm_phrase:
                continue
            # Word-boundary check: phrase must be a complete word, not a substring
            # of a longer word (e.g. "cơ" should not match inside "cơ nạc" alone).
            if _is_word_in_text(norm_phrase, text):
                matches.append((len(norm_phrase), norm_phrase, goal))

    if matches:
        # Pick the LONGEST phrase — that's the most specific intent
        matches.sort(key=lambda m: m[0], reverse=True)
        return matches[0][2]

    # Pass 2: direct English keyword match (e.g. "muscle_gain", "weightloss")
    for goal in PRODUCT_GOALS:
        if goal.replace("_", " ") in text or goal.replace("_", "") in text:
            return goal
    return None


def _is_word_in_text(needle: str, haystack: str) -> bool:
    """Return True if `needle` appears in `haystack` as a whole word/phrase.

    A "word" boundary is whitespace, punctuation, or start/end of string.
    This prevents "cơ" from matching inside "cơ nạc" if we wanted exact matches,
    but allows multi-word phrases like "tăng cơ nạc" to match as a single unit.
    """
    if not needle:
        return False
    # Surround with boundaries; for Vietnamese, word boundaries are usually whitespace.
    pattern = r"(?:^|[\s,.;:!?()\[\]{}\-_/\\])\s*" + re.escape(needle) + r"\s*(?:$|[\s,.;:!?()\[\]{}\-_/\\])"
    return bool(re.search(pattern, haystack))


def _normalize_text(text: str) -> str:
    """Lowercase + strip diacritics for fuzzy goal matching.

    Examples:
      "HIỆU SUẤT" → "hieu suat"
      "Cải-Thiện Hiệu_Suất" → "cai thien hieu suat"
    """
    import unicodedata
    text = text.lower()
    # Strip diacritics
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


# -------------------------------------------------------------------------
# Extracted-constraints pipeline
# -------------------------------------------------------------------------
# _extract_constraints() pulls every product-relevant signal out of the
# CURRENT user message in one place. _merge_memory() then applies the
# "later message wins" rule on top of the checkpoint-persisted memory.
# This split keeps `build_structured_memory` readable and the extraction
# logic individually testable.

def _resolve_dietary(query: str) -> tuple[str | None, bool]:
    """Return (dietary_tag, is_negating) for the current user message.

    `is_negating` is True when the user is *cancelling* an existing
    dietary constraint (e.g. "tôi không bị dị ứng"). This must be
    detected even when no new dietary tag is extracted, so that the
    merge step can clear the constraint.
    """
    tag = _extract_dietary_from_query(query)
    is_neg = _is_negating_constraint(query, "dietary")
    return tag, is_neg


def _extract_constraints(query: str) -> dict:
    """Extract every product-related constraint from a single user message.

    Returns a dict with keys: budget, goal, category, dietary, is_negating_dietary.
    Each value is None when nothing was detected (or False for is_negating_dietary).
    """
    return {
        "budget": _extract_budget_from_query(query),
        "goal": _extract_goal_from_query(query),
        "category": _detect_category_from_query(query),
        "dietary": None,  # filled below
        "is_negating_dietary": False,
    }


def _merge_memory(existing: dict, extracted: dict) -> dict:
    """Merge new extractions into the existing structured_memory dict.

    Rules:
      - budget / goal / category: later message wins (overwrite if extracted).
      - dietary: assertion wins over negation only if the new message asserts
        a NEW tag. Negation (e.g. "tôi không bị dị ứng") clears the constraint.
        The actual dietary tag is computed lazily in the caller because it
        needs the user query.
      - _session_name / _session_phone / category cleanup: NOT touched here
        (those are managed in caller via user_context / category detection).
    """
    merged = dict(existing)
    if extracted.get("budget") is not None:
        merged["budget"] = extracted["budget"]
    if extracted.get("goal") is not None:
        merged["goal"] = extracted["goal"]
    if extracted.get("category") is not None:
        merged["category"] = extracted["category"]
    return merged


def _detect_category_from_query(query: str) -> str | None:
    """Detect which product category the user is asking about from query text.

    Used to build category-specific clarification prompts (goals vary by category).
    Returns None if no category detected (generic product query).
    """
    text = _normalize_text(query)

    # protein_bars / protein bar (check before "whey" to avoid partial matches)
    if any(kw in text for kw in [
        "protein bar", "proteinbar", "protein_bar",
        "thanh protein", "nuoc uong protein", "bar protein",
        "proteinbar", "thanh protein",
    ]):
        return "protein_bars"

    # whey / whey protein
    if any(kw in text for kw in [
        "whey", "whey protein", "wheyisolate", "wheyconcentrate",
        "iso whey", "casein",
    ]):
        return "whey"

    # creatine
    if any(kw in text for kw in [
        "creatine", "kreatin", "crea", "kre-alkalyn",
    ]):
        return "creatine"

    # preworkout / pre workout / pre-workout
    if any(kw in text for kw in [
        "preworkout", "pre workout", "pre-workout",
        "prework", "stim", "pre-training", "truoc tap",
    ]):
        return "preworkout"

    return None


def _get_category_label(category: str | None) -> str:
    """Human-readable label for a product category."""
    labels = {
        "whey": "whey protein",
        "creatine": "creatine",
        "preworkout": "pre-workout",
        "protein_bars": "protein bar",
    }
    return labels.get(category, "sản phẩm")


ALL_CATEGORIES = ["whey", "creatine", "preworkout", "protein_bars"]

CATEGORY_LABELS: dict[str, str] = {
    "whey": "Whey Protein",
    "creatine": "Creatine",
    "preworkout": "Pre-Workout",
    "protein_bars": "Protein Bar & Cookie",
}

def _get_all_categories() -> list[tuple[str, str]]:
    """Return all product categories as (key, label) pairs for prompt."""
    return [(k, CATEGORY_LABELS[k]) for k in ALL_CATEGORIES]


def _get_category_goals(category: str | None) -> list[str]:
    """Return the relevant goals for a category (from dataset analysis)."""
    return CATEGORY_GOALS.get(category, list(CATEGORY_GOALS["whey"]))


def _format_goal_options(goals: list[str], sep: str = ", ") -> str:
    """Format a list of goals as numbered options for the clarification prompt.

    Use ``sep="\\n"`` for line-by-line output (easier to read on mobile),
    or ``sep=", "`` for a single-line list.
    """
    lines = []
    for i, goal in enumerate(goals, 1):
        label = GOAL_LABELS.get(goal, goal.replace("_", " ").title())
        lines.append(f"{i}) {label}")
    return sep.join(lines) + ("?" if sep == ", " else "")


def _extract_dietary_from_query(query: str) -> str | None:
    """Extract dietary preference or allergy from user query text.

    Supports:
    - Exact DIETARY_TAGS match ("lactose_free", "gluten_free", etc.)
    - Allergy/intolerance patterns ("dị ứng lactose", "không uống được sữa", etc.)
    - Maps allergy mentions → corresponding dietary tag.

    Does NOT extract dietary from questions about concepts:
    - "không gluten là gì" → None (asking about the concept)
    - "dị ứng lactose là gì" → None (asking about the concept)

    Returns None if no personal dietary constraint is found.
    """
    text = query.lower().strip()

    # Skip questions — the user is asking about a concept, not stating a personal constraint
    question_starters = (
        "là gì", "thế nào", "như nào", "ra sao", "có phải",
        "what", "how", "why", "when", "where",
        "giải thích", "cho hỏi", "xin hỏi", "muốn biết",
        "tại sao", "vì sao",
    )
    is_question = "?" in query or query.startswith(question_starters)

    # 1) Exact tag match first — only assert if NOT a question
    if not is_question:
        for tag in DIETARY_TAGS:
            if tag.replace("_", " ") in text or tag in text:
                return tag

    # 2) Allergy / intolerance → map to dietary tag (only if personal, not conceptual)
    # Skip if the query is primarily asking "what is X" about dietary concepts
    conceptual_questions = [
        r"(?:là\s*gì|what\s*is|thế\s*nào|how\s*does)\s*(?:không\s*)?(?:gluten|lactose|dị\s*ứng|vegan|keto)",
        r"(?:không\s*)?(?:gluten|lactose|dị\s*ứng|vegan|keto)\s*(?:là\s*gì| là gì| là sao)",
        r"(?:dành\s*cho\s*ai|who\s*should)\s*(?:không\s*)?(?:gluten|lactose)",
    ]
    for pat in conceptual_questions:
        if re.search(pat, text):
            return None

    ALLERGY_PATTERNS = [
        ("lactose_free", r"(?:bị\s*)?dị\s*ứng\s*lactose|dị\s*ứng\s*sữa|không\s*(?:uống|ăn)\s*được\s*sữa|không\s*(?:uống|ăn)\s*lactose|không\s*tiêu\s*hóa\s*được\s*lactose|intolerant\s*to\s*lactose|lactose\s*intolerance"),
        ("gluten_free", r"(?:bị\s*)?dị\s*ứng\s*gluten|dị\s*ứng\s*bột|mẫn\s*cản\s*gluten|celiac|gluten\s*intolerance"),
        ("soy_free", r"(?:bị\s*)?dị\s*ứng\s*đậu\s*(?:nành|tằm)|dị\s*ứng\s*soy|dị\s*ứng\s*đậu"),
        ("vegan", r"(?:là\s*)?vegan|thuần\s*chay|ăn\s*chay\s*thuần"),
        ("vegetarian", r"(?:là\s*)?vegetarian|ăn\s*chay"),
    ]

    for dietary_tag, pattern in ALLERGY_PATTERNS:
        if re.search(pattern, text):
            return dietary_tag

    return None

def _is_negating_constraint(text: str, field: str) -> bool:
    """Return True if text is genuinely CANCELLING a dietary constraint.

    Only counts as negation if a CLEAR negation word appears BEFORE the dietary
    keyword — AND the sentence is about CANCELLING, not ASKING.

    Examples:
      "tôi không bị dị ứng"     → True  (negating)
      "tôi bị dị ứng lactose"   → False (asserting)
      "không gluten là gì"        → False (asking a question, not cancelling)
      "dị ứng gluten là gì"      → False (asking a question)
    """
    if field != "dietary":
        return False

    text_lower = text.lower()
    # Question markers — if the sentence ends with ? or starts with what/why/how, it's a question
    if "?" in text or text_lower.strip().startswith(("gì", "thế nào", "như nào", "ra sao", "có phải", "có phải là", "là gì", "là sao", "what", "how", "why")):
        return False

    dietary_keywords = ["lactose", "dị ứng", "gluten", "vegan", "kiêng", "sữa"]
    # Clear negation words only
    negation_words = ["không", "hết", "bỏ", "chưa", "chẳng", "đâu"]

    # Find position of first dietary keyword
    first_diet_pos = float("inf")
    for kw in dietary_keywords:
        pos = text_lower.find(kw)
        if pos != -1 and pos < first_diet_pos:
            first_diet_pos = pos

    if first_diet_pos == float("inf"):
        return False

    # Check if any clear negation word appears BEFORE the dietary keyword
    for neg in negation_words:
        neg_pos = text_lower.find(neg)
        if neg_pos != -1 and neg_pos < first_diet_pos:
            return True

    return False


# =========================================================================
# Query-mode detection — "metadata question" vs "product recommendation"
# =========================================================================
#
# Two primary use cases drive the chat UX:
#
# 1. METADATA QUESTION (e.g. "whey Optimum Nutrition giá bao nhiêu?",
#    "Rule1 Creatine bao nhiêu gram?", "so sánh ON Gold Standard với MyProtein Impact")
#    → The user wants FACTS about a specific product. We must NOT ask clarifying
#      questions about budget/goal — the user has already told us exactly which
#      product they want. Just retrieve that product and answer.
#
# 2. PRODUCT RECOMMENDATION (e.g. "tôi muốn mua whey cho người mới tập",
#    "gợi ý creatine dưới 500k", "sản phẩm nào tốt cho tăng cơ")
#    → The user wants SUGGESTIONS. We need budget/goal/category to filter well.
#
# When the user hasn't specified a particular product (just typed "whey tăng cơ"),
# it's clearly a recommendation query — that goes through the normal clarify path.
#
# We pick "metadata_question" when ANY of these signals appear:
#   - A known brand name is mentioned (Optimum Nutrition, MyProtein, Rule1, etc.)
#   - A specific product line name (Gold Standard, Hydro Whey, Impact, C4, ...)
#   - Question phrasing that asks for facts ("giá bao nhiêu", "thành phần", "cách dùng",
#     "so sánh", "có tốt không", "review") and the user is not requesting a recommendation
#     (no "gợi ý", "nên mua", "tư vấn" etc.)

KNOWN_BRANDS = [
    # Full brand names (unique, safe to match)
    "optimum nutrition", "myprotein", "muscletech", "dymatize",
    "cellucor", "mutant", "scivation", "musclepharm", "allmax",
    "applied nutrition", "evlution", "rule1", "rule 1", "ruleone",
    "bpi sports", "bpi", "bsn", "universal nutrition", "animal pak",
    "syntha-6", "syntha 6", "nitro tech", "nitrotech", "iso pure", "isopure",
    "gold standard 100% whey", "gold standard",
    "impact whey", "the whey", "creatine monohydrate", "micronized creatine",
    "beta-alanine", "beta alanine",
    "mass gainer", "whey protein isolate",
    "whey isolate", "whey concentrate", "whey premium", "whey gold",
]

# Short brand tokens — only match when surrounded by word boundaries AND the
# query is short (e.g. "ON Gold Standard 5lbs" rather than "tôi tập 5 lần").
# These are intentionally NOT in the main KNOWN_BRANDS list because they're
# too ambiguous in Vietnamese (e.g. "on" can be "ở trên", "iso" can mean many
# things, "sữa" can mean "sữa tắm", "casein" alone is fine but "case" isn't).
SHORT_BRAND_TOKENS = [
    "on gold",  # "ON Gold Standard"
    "c4",       # Cellucor C4 — only as standalone token
    "xtend",    # Scivation Xtend
    "isopure",  # Dymatize ISO Pure
    "rule1",    # Rule 1
]

METADATA_QUESTION_PATTERNS = [
    r"gi[áa]\s*(?:bao\s*nhi[êe]u|th[ếe]|n[àa]o|ny)",
    r"bao\s*nhi[êe]u\s*(?:ti[ềe]n|[đd]|k\b|ngh[ìi]n|ng[àa]n|tri[ệe]u)",
    r"th[àa]nh\s*ph[ầa]n",
    r"c[ôo]ng\s*d[ụu]ng",
    r"c[áa]ch\s*(?:d[ùu]ng|s[ửu]\s*d[ụu]ng|u[ốo]ng|pha)",
    r"h[ạa]n\s*s[ửu]\s*d[ụu]ng",
    r"xu[ấa]t\s*x[ứu]",
    r"s[ảa]n\s*xu[ấa]t\s*(?:[ởo]?|t[ạa]i)",
    r"so\s*s[áa]nh",
    r"kh[áa]c\s*(?:g[ìi]|nhau)",
    r"(?:c[óo]\s*)?(?:t[ốo]t|ngon|hi[ệe]u\s*qu[ảa])\s*kh[ôo]ng",
    r"review",
    r"[đd][áa]nh\s*gi[áa]",
    r"c[óo]\s*(?:[đd][ườo][ờo]ng|lactose|gluten|ch[ấa]t\s*b[ée]o)\s*kh[ôo]ng",
    r"h[ưu][ơo]ng\s*v[ịi]",
    r"v[ịi]\s*(?:g[ìi]|n[àa]o)",
    r"size\s*(?:g[ìi]|n[àa]o|bao\s*nhi[êe]u)",
    r"dung\s*t[íi]ch",
    r"tr[ọo]ng\s*l[ượo]ng",
    r"g[ồo]m\s*(?:nh[ữu]ng|g[ìi])",
    r"m[ấa]y\s*(?:g\b|kg|ml|l\b|vi[êe]n|g[óo]i|h[ủu])",
    r"d[ùu]ng\s*nh[ưu]\s*th[ếe]\s*n[àa]o",
    r"u[ốo]ng\s*(?:khi|l[úu]c|n[àa]o|th[ếe]\s*n[àa]o)",
    r"t[áa]c\s*d[ụu]ng",
    r"c[óo]\s*g[âa]y\s*(?:t[áa]c\s*d[ụu]ng\s*ph[ụu]|ph[ảa]n\s*[ứu]ng|nghi[ệe]n)",
    r"ph[ùu]\s*h[ợo]p\s*v[ớo]i\s*(?:ai|[đd][ốo]i\s*t[ượo]ng)",
    r"ai\s*(?:n[êe]n|d[ùu]ng|u[ốo]ng)",
    r"mua\s*(?:[ởo]?|t[ạa]i)\s*[đd][âa]u",
    r"(?:c[óo]\s*)?b[áa]n\s*(?:[ởo]?|t[ạa]i|kh[ôo]ng)",
    r"(?:c[òo]n|h[ếe]t)\s*h[àa]ng",
    r"m[ớo]i\s*(?:v[ềe]|ra|c[óo])",
]

# Words that indicate the user wants a RECOMMENDATION (not a metadata Q).
# These are checked FIRST so a metadata keyword like "so sánh" combined with
# "gợi ý cho tôi" is correctly classified as a recommendation.
# Note: "cho tôi" is INTENTIONALLY excluded — it's too generic and would
# override a real metadata question like "so sánh X cho tôi biết".
RECOMMENDATION_HINTS = [
    r"g[ợo]i\s*[ýy]",
    r"t[ưu]\s*v[ấa]n",
    r"n[êe]n\s*mua",
    r"ch[ọo]n\s*(?:lo[ạa]i|s[ảa]n\s*ph[ẩa]m)",
    r"lo[ạa]i\s*n[àa]o\s*t[ốo]t",
    r"s[ảa]n\s*ph[ẩa]m\s*n[àa]o",
    r"t[ưu]\s*v[ấa]n\s*cho\s*t[ôo]i",
    r"[đd][ềe]\s*xu[ấa]t",
    r"ph[ùu]\s*h[ợo]p\s*v[ớo]i\s*t[ôo]i",
]


# Product-context keywords. If the query contains NONE of these, the user
# is probably off-topic (e.g. "sữa tắm có tốt không", "5 lbs là bao nhiêu")
# and the metadata pattern match should be ignored.
PRODUCT_CONTEXT_KEYWORDS = [
    "whey", "creatine", "crea", "krea", "pre", "preworkout", "pre-workout",
    "protein", "bar", "bars", "mass", "gainer", "bcaa", "eaa", "amino",
    "iso", "isolate", "concentrate", "hydro", "casein", "beta", "alanine",
    "citrulline", "caffeine", "stim", "supplement", "thuoc", "thực phẩm",
    "sua tang co", "sữa tăng cơ", "tang co", "tăng cơ", "giam mo", "giảm mỡ",
    "tap luyen", "tập luyện", "gym", "fitness", "the hinh", "thể hình",
]


def _has_product_context(query: str) -> bool:
    """Return True if the query mentions any product or fitness keyword.

    Used to avoid classifying pure off-topic questions as "metadata_question"
    just because they happen to contain a generic pattern like "có tốt không"
    or "có bán ở đâu" (e.g. "sữa tắm có tốt không", "5 lbs là bao nhiêu").
    """
    norm = _normalize_text(query)
    return any(kw in norm for kw in PRODUCT_CONTEXT_KEYWORDS)


def _detect_query_mode(query: str) -> str:
    """Decide whether the query is a METADATA question or a RECOMMENDATION request.

    Returns:
      - "metadata_question" → user wants facts about a specific product
      - "recommendation"   → user wants suggestions

    Detection priority:
      1. If the user uses strong recommendation language ("gợi ý", "tư vấn",
         "nên mua", "đề xuất", "loại nào tốt") → recommendation.
      2. If a known brand / product line is mentioned → metadata (the user
         has named a specific product).
      3. If the query contains a metadata question pattern (price,
         composition, how to use, comparison, etc.) AND the query mentions
         at least one product/fitness keyword → metadata. (This prevents
         "sữa tắm có tốt không" from being classified as metadata.)
      4. Default: recommendation.
    """
    norm = _normalize_text(query)
    query_lower = query.lower()

    # 1) Strong recommendation signals
    for pat in RECOMMENDATION_HINTS:
        if re.search(pat, query_lower):
            return "recommendation"

    # 2) Long brand names (safe to match anywhere)
    for brand in KNOWN_BRANDS:
        b_norm = _normalize_text(brand)
        if b_norm and b_norm in norm:
            return "metadata_question"

    # 3) Short brand tokens — only match as whole words to avoid
    #    "on" matching "tôi n" or "c4" matching random substrings
    for token in SHORT_BRAND_TOKENS:
        t_norm = _normalize_text(token)
        if t_norm and _is_word_in_text(t_norm, norm):
            return "metadata_question"

    # 4) Metadata question patterns — only count if the query is about
    #    a product/fitness topic. Off-topic queries with the same surface
    #    patterns (e.g. "sữa tắm có tốt không") are left as "recommendation"
    #    so the off_topic classifier downstream can reject them cleanly.
    is_meta_q = any(re.search(pat, query_lower) for pat in METADATA_QUESTION_PATTERNS)
    if is_meta_q and _has_product_context(query):
        return "metadata_question"

    return "recommendation"


# =========================================================================
# Structured Memory — Build
# =========================================================================

def build_structured_memory(state: GraphState) -> GraphState:
    """First node in every turn. Builds/updates structured_memory dict.

    Flow:
      1. Load existing structured_memory from checkpoint.
      2. Extract constraints from CURRENT user message (pure, stateless).
      3. Merge: "later message wins" cho budget/goal/category; dietary dùng
         rule "assertion mới thắng" (xem `_resolve_dietary`).
      4. Update consecutive-clarify loop-breaker.
      5. Return dict để downstream nodes dùng.

    structured_memory chỉ chứa metadata truy vấn sản phẩm (budget / goal /
    category / dietary) cùng với counter `_consecutive_clarifies` để phá
    vòng lặp clarify. PII (tên, SĐT) đã được gỡ bỏ hoàn toàn — tập trung
    vào truy vấn sản phẩm và metadata.
    """
    current_query = state.get("user_query", "")

    emit_stage("build_structured_memory", "start")

    # 1) Load existing từ checkpoint
    existing: dict = dict(state.get("structured_memory") or {})

    # 2) Extract thuần từ message hiện tại (stateless, dễ test)
    extracted = _extract_constraints(current_query)
    dietary, is_negating = _resolve_dietary(current_query)
    extracted["dietary"] = dietary
    extracted["is_negating_dietary"] = is_negating

    # 3) Merge với quy tắc rõ ràng
    merged = _merge_memory(existing, extracted)

    # Dietary: assertion mới thắng; nếu chỉ negation mà không có tag mới → clear
    if is_negating and dietary is None:
        merged["dietary"] = None
    elif dietary is not None:
        merged["dietary"] = dietary

    # Extract name/phone/address from user_context if present
    ctx = state.get("user_context") or {}
    if ctx.get("customer_name"):
        merged["_session_name"] = ctx["customer_name"]
    if ctx.get("customer_phone"):
        merged["_session_phone"] = ctx["customer_phone"]

    # 4) Loop-breaker: nếu turn này có constraint mới → reset; nếu không → tăng
    has_new_info = (
        extracted["budget"] is not None
        or extracted["goal"] is not None
        or extracted["category"] is not None
        or extracted["dietary"] is not None
        or extracted["is_negating_dietary"]
    )
    prev_count = int(merged.get("_consecutive_clarifies") or 0)
    merged["_consecutive_clarifies"] = 0 if has_new_info else min(prev_count + 1, 10)

    # 5) Log có cấu trúc — 1 dòng gộp thay vì nhiều print rời rạc
    print(
        f"[MEMORY] in={existing} | msg={extracted} → out={merged}",
        flush=True,
    )

    emit_stage(
        "build_structured_memory",
        "end",
        budget=extracted["budget"] is not None,
        goal=extracted["goal"] is not None,
        dietary=bool(extracted["dietary"] or extracted["is_negating_dietary"]),
        category=extracted["category"] is not None,
    )
    return {"structured_memory": merged}


def memory_trim(state: GraphState) -> GraphState:
    """Enforce max 14 messages (7 user + 7 bot) in checkpoint using FIFO.

    Trims every turn: keeps the newest 7 user and 7 bot messages in insertion order.
    SystemMessage and ToolMessage are NOT preserved (they are not needed for chat history).
    Structured_memory is NOT trimmed — it lives separately and persists indefinitely.
    """
    emit_stage("memory_trim", "start")
    messages = list(state.get("messages") or [])

    human_msgs: list[BaseMessage] = [m for m in messages if isinstance(m, HumanMessage)]
    ai_msgs: list[BaseMessage] = [m for m in messages if isinstance(m, AIMessage)]

    # FIFO: giữ MAX mới nhất của mỗi role
    keep_human = human_msgs[-MAX_USER_MESSAGES:] if len(human_msgs) > MAX_USER_MESSAGES else human_msgs
    keep_ai = ai_msgs[-MAX_BOT_MESSAGES:] if len(ai_msgs) > MAX_BOT_MESSAGES else ai_msgs

    # Xen kẽ theo thứ tự insertion ban đầu (giữ cảm giác hội thoại)
    keep_ids = {id(m) for m in keep_human} | {id(m) for m in keep_ai}
    trimmed = [m for m in messages if id(m) in keep_ids]

    print(
        f"[GRAPH] memory_trim: in={len(messages)} "
        f"(user={len(human_msgs)}, bot={len(ai_msgs)}) "
        f"→ out={len(trimmed)} (user={len(keep_human)}, bot={len(keep_ai)})",
        flush=True,
    )

    emit_stage(
        "memory_trim",
        "end",
        in_count=len(messages),
        out_count=len(trimmed),
    )
    return {"messages": trimmed}


# =========================================================================
# Route Classification — LLM-powered intent detection
# =========================================================================

from typing import Literal


def classify_query_route(query: str, structured_memory: dict) -> Literal["product", "concepts", "off_topic"]:
    """
    DEPRECATED — kept only for backwards compatibility / external imports.

    The routing graph no longer calls this. We used to use an LLM call here to
    split user queries into "product" / "concepts" / "off_topic" and route them
    to different PGVector sources. The new design always retrieves from the
    product source and lets the reranker + score threshold (`MIN_RERANK_SCORE` /
    `MIN_RETURNED_DOCS` in `retrieve`) decide whether we have a confident
    answer. When retrieval confidence is low, the graph returns a canned
    "xin lỗi không chắc chắn" message instead of fabricating one.

    If you import this from anywhere outside this file, please migrate to the
    new score-based flow.
    """
    from agentic_rag.llm import create_chat_model
    from pydantic import BaseModel

    class RouteDecision(BaseModel):
        route: Literal["product", "concepts", "off_topic"]
        reasoning: str

    model = create_chat_model(temperature=0)
    chain = model.with_structured_output(RouteDecision)

    prompt = f"""Phân loại câu hỏi của khách vào đúng nhóm:

Nhóm "product": Hỏi về sản phẩm cụ thể, giá, so sánh, gợi ý, mua sản phẩm nào, whey nào tốt, sản phẩm cho mục tiêu X.
  Ví dụ: "whey nào tốt cho tăng cơ", "so sánh whey isolate và concentrate", "sản phẩm tăng cơ dưới 1 triệu", "pre workout nào ngon"

Nhóm "concepts": Hỏi về kiến thức dinh dưỡng / khoa học / khái niệm, không yêu cầu gợi ý sản phẩm cụ thể.
  Ví dụ: "keto là gì", "creatine có hại không", "whey protein là gì", "BCAA là gì", "tăng cơ cần bao nhiêu protein"
  Hỏi định nghĩa, cơ chế hoạt động, nghiên cứu khoa học, chế độ ăn.

Nhóm "off_topic": Câu hỏi hoàn toàn ngoài phạm vi sản phẩm bổ sung thể thao.
  Ví dụ: "tôi tên gì", "bạn bao nhiêu tuổi", "chào bạn", "thời tiết thế nào", "bạn có phải người thật không"
  Câu hỏi cá nhân về khách hàng, câu hỏi chung chung không liên quan đến thể hình / dinh dưỡng / sản phẩm.

Câu hỏi: {query}

Chỉ trả lời một trong ba: "product", "concepts", hoặc "off_topic".
"""
    try:
        result = chain.invoke(prompt)
        return result.route if result else "concepts"
    except Exception:
        # Safe fallback: treat unclassifiable as "concepts" (no budget/goal
        # constraints, no risk of fabricating product names from a wrong route).
        return "concepts"


# =========================================================================
# Retrieve + Rerank
# =========================================================================

# Minimum rerank score + minimum doc count to consider retrieval "confident".
# If retrieval can't reach either threshold the system honestly tells the user it
# isn't sure, rather than hallucinating or clarifying a question the user did not
# ask. Tuned empirically against the PGVector + cross-encoder pipeline.
MIN_RERANK_SCORE = 0.4
MIN_RETURNED_DOCS = 5

UNCERTAIN_ANSWER_VI = (
    "Xin lỗi bạn, mình không chắc chắn về câu trả lời cho yêu cầu này. "
    "Có thể bạn mô tả rõ hơn (loại sản phẩm, mục tiêu tập luyện, ngân sách) "
    "hoặc liên hệ hotline 0399226578 để được tư vấn trực tiếp ạ."
)


def retrieve(state: GraphState) -> GraphState:
    """Retrieve product documents and run cross-encoder reranker.

    Design note: this used to call an LLM-based `classify_query_route` first to
    pick between the `product` and `concepts` PGVector sources (and to short-
    circuit `off_topic` queries). That classifier was an extra LLM call on every
    turn, and the multi-route split tended to drop confident matches. We now
    always retrieve from the product source and let the reranker + score
    threshold decide whether we have a confident answer; if the score is too
    low, we return an honest "I'm not sure" message instead of inventing one.
    Clarification (category / budget / goal) is still handled separately by
    `check_product_info` before this low-confidence check runs.
    """
    from agentic_rag.api.dependencies import get_retriever_registry
    t0 = perf_counter()

    emit_stage("retrieve", "start")
    retrievers = get_retriever_registry()
    retriever = retrievers.get("product")
    if retriever is None:
        emit_stage("retrieve", "end", route="product", docs=0, skipped=True)
        return {
            "documents": [],
            "retrieval_scores": {},
            "reranker_top_score": 0.0,
            "route_id": "product",
            "node_timings_ms": {"retrieval": int((perf_counter() - t0) * 1000)},
        }

    docs = retriever.invoke(state["user_query"])
    t1 = perf_counter()
    timings = state.get("node_timings_ms") or {}
    timings["retrieval"] = int((t1 - t0) * 1000)

    retrieval_scores: dict = {}
    reranker_top_score: float = 0.0

    if docs:
        try:
            from agentic_rag.retrieval.reranker import get_retrieval_scores, rerank_documents

            reranked, reranker_top_score = rerank_documents(
                query=state["user_query"],
                documents=docs,
                top_k=10,
            )
            if reranked:
                docs = reranked
            retrieval_scores = get_retrieval_scores(
                query=state["user_query"],
                documents=docs,
                top_score=reranker_top_score,
            )
        except Exception:
            if docs:
                retrieval_scores = {
                    "bm25_score": 0.0,
                    "vector_score": 0.0,
                    "rerank_score": 0.0,
                    "top_score": 0.0,
                    "candidate_count": len(docs),
                    "returned_count": len(docs),
                }

    # --- Post-filter by structured dietary constraint ---
    sm = state.get("structured_memory") or {}
    dietary = sm.get("dietary")
    if dietary:
        filtered_docs = []
        for d in docs:
            meta = d.metadata or {}
            dietary_meta = meta.get("dietary")
            have_lactose = str(meta.get("have_lactose", "")).lower()

            if dietary == "lactose_free":
                # Skip products that have lactose
                if have_lactose == "true":
                    continue
                dairy_tags = {"lactose_free"}
                dairy_meta = set()
                if isinstance(dietary_meta, list):
                    dairy_meta = set(dietary_meta)
                elif isinstance(dietary_meta, str):
                    dairy_meta = {dietary_meta}
                if dairy_meta and not dairy_meta.intersection(dairy_tags):
                    continue
            elif dietary == "gluten_free":
                gf_tags = {"gluten_free"}
                gf_meta = set()
                if isinstance(dietary_meta, list):
                    gf_meta = set(dietary_meta)
                elif isinstance(dietary_meta, str):
                    gf_meta = {dietary_meta}
                if gf_meta and not gf_meta.intersection(gf_tags):
                    continue
            # Other dietary tags — strict filter
            elif dietary_meta:
                tags = {dietary} if isinstance(dietary_meta, str) else set(dietary_meta)
                if dietary not in tags:
                    continue

            filtered_docs.append(d)
        docs = filtered_docs

    docs = postprocess_product_docs(docs)
    docs = prepare_product_retrieval_docs(docs, state["user_query"])

    # Decide whether retrieval is confident enough to answer.
    # - count is the number of docs that survived filtering (dietary + dedup)
    # - top_score is the best cross-encoder score across the returned set
    # If either is below threshold we mark the route as "low_confidence" so
    # prepare_generation returns the honest "I'm not sure" answer instead of
    # forcing a LLM hallucination. We do this AFTER dietary filtering so the
    # count reflects docs the user can actually be recommended.
    scores = retrieval_scores or {}
    top_score = scores.get("top_score") or scores.get("rerank_score") or reranker_top_score or 0.0
    returned_count = scores.get("returned_count") or len(docs)
    is_confident = returned_count >= MIN_RETURNED_DOCS and top_score >= MIN_RERANK_SCORE

    # Two-primary-use-case split:
    #   - "metadata_query": user asked about a specific product (price, ingredients,
    #     how to use, comparison). We answer even if confidence is lower because
    #     the user has named a product and we can still provide useful info.
    #   - "product":        recommendation request with confident retrieval.
    #   - "low_confidence": recommendation request but retrieval isn't sure.
    query_mode = _detect_query_mode(state["user_query"])
    if query_mode == "metadata_query":
        route_id = "metadata_query"
    elif is_confident:
        route_id = "product"
    else:
        route_id = "low_confidence"

    emit_stage(
        "retrieve",
        "end",
        route=route_id,
        query_mode=query_mode,
        docs=len(docs),
        top_score=round(float(top_score), 3),
        returned_count=returned_count,
        retrieval_ms=timings.get("retrieval", 0),
    )
    return {
        "documents": docs,
        "retrieval_scores": retrieval_scores,
        "reranker_top_score": reranker_top_score,
        "route_id": route_id,
        "node_timings_ms": timings,
    }


# =========================================================================
# Check Product Info — use structured_memory
# =========================================================================

def check_product_info(state: GraphState) -> Literal["clarify", "generate"]:
    """
    Decide whether we have enough info to generate, or whether we need to
    clarify first. Uses structured_memory (which is already built by
    build_structured_memory and persisted across turns via checkpoint).

    Two use cases are handled differently:

    1. METADATA QUESTION (route_id="metadata_query"):
       The user is asking facts about a product (price / composition / how to
       use / comparison). They have likely named a specific product or asked a
       direct factual question. We MUST NOT ask for budget/goal — just generate
       the answer from the retrieved product docs.

    2. PRODUCT RECOMMENDATION (route_id="product" / "low_confidence"):
       The user wants SUGGESTIONS. We need category + budget + goal to filter
       well. Clarify smartly:
         - 3/3 → generate
         - 2/3 → ask only the missing one
         - 1/3 or 0/3 → ask ALL missing fields in ONE combined question

    Note: low_confidence routes (set by `retrieve` when the reranker score
    or doc count is too low) bypass clarification entirely — asking another
    question won't help when we don't have relevant products to recommend.
    """
    route_id = state.get("route_id", "product")
    if route_id in ("low_confidence", "metadata_query", "concepts", "off_topic"):
        return "generate"

    sm = state.get("structured_memory") or {}
    category_ok = sm.get("category") is not None
    budget_ok = sm.get("budget") is not None
    goal_ok = sm.get("goal") is not None

    # Loop breaker: count how many consecutive clarify turns we've had.
    # If 3+ in a row with no new info, stop asking and generate anyway.
    consecutive_clarifies = int(sm.get("_consecutive_clarifies") or 0)
    has_any_info = category_ok or budget_ok or goal_ok or sm.get("dietary")
    if consecutive_clarifies >= 3 and has_any_info:
        return "generate"

    if not category_ok or not budget_ok or not goal_ok:
        return "clarify"

    return "generate"


# =========================================================================
# Generation — build prompt (NO LLM call) + external streaming helpers
# =========================================================================

def _build_generation_system_prompt(
    system: str,
    sm: dict,
    user_context: dict | None,
    *,
    route_id: str = "product",
) -> str:
    """Append structured memory + dietary hard constraints to the base system prompt.

    Pure function — no LLM, no state mutation. Called by both the graph node
    and the external streaming helpers so they stay in lockstep.

    For "concepts" and "metadata_query" routes: skip budget/goal/dietary
    constraints — the user is asking a fact-based question, not requesting
    a recommendation.
    """
    user_ctx = format_user_context(user_context)
    if user_ctx:
        system = f"{system}\n\n{user_ctx}"

    # Only attach structured memory + dietary for recommendation routes
    is_recommendation = route_id in ("product", "low_confidence")

    if sm and is_recommendation:
        memory_lines = ["Thông tin đã biết về khách (từ cuộc trò chuyện trước):"]
        if sm.get("budget"):
            b = sm["budget"]
            if b >= 1_000_000:
                memory_lines.append(f"- Ngân sách: {b / 1_000_000:.1f} triệu VNĐ")
            else:
                memory_lines.append(f"- Ngân sách: {b:,.0f} VNĐ")
        if sm.get("goal"):
            memory_lines.append(f"- Mục tiêu: {sm['goal']}")
        if sm.get("category"):
            memory_lines.append(f"- Loại sản phẩm: {sm['category']}")
        if sm.get("dietary"):
            memory_lines.append(f"- Ràng buộc ăn uống: {sm['dietary']}")
        if len(memory_lines) > 1:
            system = f"{system}\n\n" + "\n".join(memory_lines)

    if route_id == "metadata_query":
        # Tell the LLM this is a fact-based question so it answers directly
        # instead of trying to upsell or recommend alternatives.
        system = (
            f"{system}\n\n"
            "**CHẾ ĐỘ METADATA QUESTION:** Khách đang hỏi thông tin cụ thể "
            "về một sản phẩm (giá, thành phần, công dụng, cách dùng, so sánh...). "
            "Hãy trả lời trực tiếp bằng thông tin từ tài liệu được cung cấp, "
            "KHÔNG hỏi thêm về ngân sách/mục tiêu/dietary. "
            "Nếu tài liệu không chứa thông tin khách hỏi, nói thẳng là mình không rõ "
            "và gợi ý liên hệ hotline 0399226578."
        )

    dietary = sm.get("dietary") if is_recommendation else None
    if dietary:
        if dietary == "lactose_free":
            system = (
                f"{system}\n\n"
                "**RÀNG BUỘC BẮT BUỘC:** "
                "KHÔNG gợi ý sản phẩm nào có chứa lactose. "
                "Kiểm tra metadata `have_lactose=true` hoặc `dietary` không chứa `lactose_free`. "
                "Nếu tất cả sản phẩm đều có lactose, nói rõ và gợi ý khách chọn sản phẩm không lactose."
            )
        else:
            system = (
                f"{system}\n\n"
                f"**RÀNG BUỘC BẮT BUỘC:** Khách hàng yêu cầu: {dietary}. "
                "Chỉ gợi ý sản phẩm phù hợp với ràng buộc này."
            )

    return system


def build_generation_prompt(
    state: GraphState,
    *,
    model,
) -> list:
    """Build the chat-messages list to send to the LLM for final answer.

    Returns a list of langchain `BaseMessage` ready for `model.invoke(llm_messages)`
    or `model.astream(llm_messages)`. Pure function — reads state, builds prompt.

    Returns an empty list when route_id == "low_confidence" so the caller can
    short-circuit the LLM call and stream the canned `UNCERTAIN_ANSWER_VI`
    message directly. This saves a round-trip when retrieval confidence is
    too low to support any meaningful answer.
    """
    route_id = state.get("route_id", "product")

    if route_id == "low_confidence":
        return []

    if route_id == "off_topic":
        system = (
            "Bạn là nhân viên tư vấn của cửa hàng ProFit chuyên về sản phẩm bổ sung thể thao.\n"
            "Trả lời ngắn gọn, lịch sự.\n"
            "Nếu khách hỏi gì ngoài phạm vi sản phẩm bổ sung thể thao (tên khách, thời tiết, chào hỏi chung…), "
            "hãy từ chối lịch sự và mời khách hỏi về sản phẩm.\n"
            "Ví dụ: \"Xin lỗi, mình chỉ tư vấn về sản phẩm bổ sung thể thao thôi ạ. Bạn cần mình gợi ý gì không ạ?\""
        )
        context = "(không có tài liệu)"
    else:
        # Map route taxonomy onto the prompt registry. All product-shaped
        # routes (product / metadata_query) use the "product" prompt so
        # the LLM has full product context available; off_topic handled
        # above; low_confidence handled above.
        prompt_route = "product" if route_id in ("product", "metadata_query") else "general"
        system_base = get_prompt(prompt_route)
        sm = state.get("structured_memory") or {}
        system = _build_generation_system_prompt(
            system_base, sm, state.get("user_context"), route_id=route_id
        )
        docs = state.get("documents", [])
        if docs:
            context = format_documents_for_llm(docs, route_id=route_id, user_query=state["user_query"])
        else:
            # Retrieval trả về rỗng — bọc context bằng instruction rõ ràng
            # để LLM tự sinh câu trả lời xin lỗi thay vì chắp vá mơ hồ.
            # Frontend sẽ tự biết không có products thông qua check products.length === 0.
            context = (
                "Hệ thống tìm kiếm không tìm thấy sản phẩm nào phù hợp với yêu cầu của khách. "
                "Hãy giải thích lịch sự, đề nghị khách thử từ khóa khác, "
                "mô tả chi tiết hơn về nhu cầu, hoặc liên hệ hotline 0399226578 để được hỗ trợ trực tiếp. "
                "TUYỆT ĐỐI KHÔNG bịa đặt tên sản phẩm, giá, thương hiệu hay bất kỳ thông tin cụ thể nào "
                "vì không có dữ liệu tham khảo."
            )

    llm_messages = build_llm_chat_messages(
        system=system,
        transcript=state.get("messages"),
        model=model,
        context_block=context,
        user_query=state["user_query"],
    )
    return llm_messages


def prepare_generation(state: GraphState) -> GraphState:
    """Routing-graph node: build the final-answer LLM prompt.

    Does NOT call the LLM. Returns `llm_messages` so the caller (sync /chat
    or async /chat/stream) can invoke the model externally with the right
    streaming mode, then push the result back through the finish graph.

    For `low_confidence` routes we short-circuit: we set `final_answer` to the
    canned `UNCERTAIN_ANSWER_VI` text and return an empty `llm_messages` list.
    The caller detects this and skips the LLM round-trip, yielding the canned
    answer directly to the client. No product payload is attached because we
    are explicitly telling the user we don't have a confident recommendation.
    """
    route_id = state.get("route_id", "product")

    if route_id == "low_confidence":
        emit_stage("prepare_generation", "start")
        timings = state.get("node_timings_ms") or {}
        emit_stage(
            "prepare_generation",
            "end",
            route=route_id,
            messages=0,
            products=0,
            duration_ms=0,
        )
        return {
            "llm_messages": [],
            "product_payload": None,
            "route_id": route_id,
            "final_answer": UNCERTAIN_ANSWER_VI,
            "node_timings_ms": timings,
        }

    emit_stage("prepare_generation", "start")
    t0 = perf_counter()
    model = create_chat_model(temperature=0.2)
    llm_messages = build_generation_prompt(state, model=model)

    # Pre-compute product payload (used by finish when it builds the AIMessage).
    docs = state.get("documents", [])
    products = documents_to_products(docs, limit=3)
    product_payload = products_to_message_payload(products)

    timings = state.get("node_timings_ms") or {}
    timings["prepare_generation"] = int((perf_counter() - t0) * 1000)

    emit_stage(
        "prepare_generation",
        "end",
        route=route_id,
        messages=len(llm_messages) if isinstance(llm_messages, list) else 0,
        products=len(products),
        duration_ms=timings["prepare_generation"],
    )
    return {
        "llm_messages": llm_messages,
        "product_payload": product_payload,
        "route_id": route_id,
        "node_timings_ms": timings,
    }


def generate_stream_sync(llm_messages: list) -> str:
    """Blocking LLM call — used by /chat.

    Returns the full answer text. The caller is expected to inject it into
    the finish graph as `final_answer` to trigger the single save path.
    """
    cb = get_active_token_handler()
    model = create_chat_model(temperature=0.2, callbacks=[cb] if cb else None)
    res = model.invoke(llm_messages)
    content = str(res.content or "")
    if not content:
        raise ValueError(
            "[GENERATE ERROR] LLM returned empty content. "
            "Check model configuration, prompt, and that documents were retrieved."
        )
    return content


async def generate_stream_async(llm_messages: list):
    """Async word-buffered LLM stream — used by /chat/stream.

    Yields text chunks at word/sentence boundaries so Vietnamese and English
    text render cleanly on the frontend without character-by-character wrapping.
    The caller accumulates the full text, then injects it into the finish graph
    so the save path stays unified.

    Flush strategy (whichever happens first):
      - word/sentence boundary (regex) — clean UX
      - buffer reaches MIN_FLUSH_CHARS    — fall back when model streams
        without a trailing space (some GPT-4o-mini streams do this)
      - MAX_BUFFER_MS elapsed since last flush — guarantees forward progress
        even if the model produces very long uninterrupted runs
    """
    import re

    WORD_BOUNDARY = re.compile(r"[\s\n.,;:!?。»」』\'\"()\[\]{}—–\-/…·]+$")
    MIN_FLUSH_CHARS = 12
    MAX_BUFFER_MS = 150

    cb = get_active_token_handler()
    model = create_chat_model(temperature=0.2, callbacks=[cb] if cb else None)
    had_content = False
    buf = ""
    last_flush = perf_counter()

    def _flush(b: str) -> str:
        nonlocal had_content
        if b:
            had_content = True
        return b

    async for chunk in model.astream(llm_messages):
        if chunk.content:
            text = ""
            if isinstance(chunk.content, str):
                text = chunk.content
            elif isinstance(chunk.content, list):
                for item in chunk.content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        text += item.get("text", "")

            if not text:
                continue

            buf += text

            # Flush when: word boundary, length threshold, or time threshold.
            should_flush = False
            if buf and WORD_BOUNDARY.search(buf):
                should_flush = True
            elif len(buf) >= MIN_FLUSH_CHARS:
                should_flush = True
            elif (perf_counter() - last_flush) * 1000 >= MAX_BUFFER_MS and buf:
                should_flush = True

            if should_flush:
                chunk_to_yield = _flush(buf)
                buf = ""
                last_flush = perf_counter()
                if chunk_to_yield:
                    yield chunk_to_yield

    # Flush any remaining text in the buffer.
    remaining = _flush(buf)
    if remaining:
        yield remaining

    if not had_content:
        raise ValueError(
            "[GENERATE ERROR] LLM returned empty content in stream. "
            "Check model configuration, prompt, and that documents were retrieved."
        )


# =========================================================================
# Clarify Ask — use structured_memory in prompt
# =========================================================================

PROFESSIONAL_CLARIFY_PROMPT = """Bạn là chuyên gia tư vấn sản phẩm bổ sung thể thao ProFit. Khách hàng đang hỏi về sản phẩm nhưng thiếu thông tin cần thiết.

Quy trình làm rõ — theo thứ tự BẮT BUỘC (chỉ hỏi 1 câu mỗi lần):

Bước 1 — LOẠI SẢN PHẨM (bắt buộc, hỏi đầu tiên nếu chưa biết):
Nếu khách chưa nói rõ mua loại sản phẩm nào, hãy liệt kê 4 loại và hỏi khách muốn xem loại nào.
4 loại sản phẩm ProFit đang bán: Whey Protein, Creatine, Pre-Workout, Protein Bar & Cookie

Bước 2 — NGÂN SÁCH (bắt buộc, hỏi nếu chưa có):
Ví dụ: "Bạn có ngân sách bao nhiêu? 1) Phổ thông (dưới 600k), 2) Tầm trung (600k-1.2M), 3) Cao cấp (trên 1.2M)"

Bước 3 — MỤC TIÊU TẬP LUYỆN (bắt buộc, hỏi nếu chưa có):
Hỏi khách đang hướng tới mục tiêu gì. Gợi ý options phù hợp với loại sản phẩm đã chọn.

Bước 4 — DIETARY (tuỳ chọn — KHÔNG hỏi trừ khi khách tự đề cập):
Nếu khách chưa nói gì về dị ứng/kiêng ăn, hãy gợi ý nhẹ ở cuối câu trả lời (không bắt buộc):
"Bạn có yêu cầu gì về thành phần không? Ví dụ: Không lactose, Không gluten, Không đường, Vegan, Keto"

Quy tắc trả lời:
- CHỈ 1 câu hỏi làm rõ mỗi lần
- Tiếng Việt, thân thiện, tự nhiên — đừng cứng nhắc như robot
- Nếu khách đã cho đủ loại sản phẩm + ngân sách + mục tiêu → chuyển sang trả lời/giới thiệu sản phẩm luôn, đừng hỏi thêm dietary
- Dietary chỉ hỏi nếu khách tự nói "tôi dị ứng..." / "tôi ăn chay..." — không tự ý hỏi

Thông tin đã có về khách: {memory_block}
Câu hỏi của khách: {query}

Hãy hỏi để làm rõ những gì còn thiếu (chỉ 1 câu)."""


def build_clarify_prompt(state: GraphState) -> tuple[str, str]:
    """Build the clarification question using 4-step rule-based logic.

    Returns `(clarify_text, memory_block)`:
      - `clarify_text`: the question to ask the user (one question at a time)
      - `memory_block`: formatted structured memory for logging

    4-Step flow (in priority order):
      1. Missing category  → ask which product type (mandatory, asked FIRST)
      2. Missing budget    → ask budget (mandatory)
      3. Missing goal      → ask goal (mandatory)
      4. Dietary — only ask if the user has already mentioned it; otherwise
         just add a soft note at the end of the message.

    SMART SKIP: if the user is missing 2+ fields we ask them ALL at once in
    a single friendly message ("Bạn cho mình biết ngân sách và mục tiêu nhé")
    so we don't trap the user in 2-3 back-to-back clarification turns.
    """
    query = state.get("user_query", "")
    sm = state.get("structured_memory") or {}

    memory_lines = []
    if sm.get("budget"):
        b = sm["budget"]
        if b >= 1_000_000:
            memory_lines.append(f"- Ngân sách: {b / 1_000_000:.1f}M")
        else:
            memory_lines.append(f"- Ngân sách: {b:,.0f} VNĐ")
    if sm.get("goal"):
        memory_lines.append(f"- Mục tiêu: {sm['goal']}")
    if sm.get("dietary"):
        memory_lines.append(f"- Dietary: {sm['dietary']}")
    if sm.get("category"):
        memory_lines.append(f"- Loại SP: {_get_category_label(sm['category'])}")
    memory_block = "\n".join(memory_lines) if memory_lines else "(chưa có)"

    category_ok = sm.get("category") is not None
    budget_ok = sm.get("budget") is not None
    goal_ok = sm.get("goal") is not None
    dietary = sm.get("dietary")

    # SMART SKIP: count missing mandatory fields
    missing = []
    if not category_ok:
        missing.append("category")
    if not budget_ok:
        missing.append("budget")
    if not goal_ok:
        missing.append("goal")

    # If 2+ fields missing → ask ALL of them in ONE friendly message.
    if len(missing) >= 2:
        cat_lines = "\n".join(
            f"{i}) {v}" for i, (_, v) in enumerate(_get_all_categories(), 1)
        )
        goal_options = _format_goal_options(_get_category_goals(None), sep="\n")
        cat_label = _get_category_label(sm.get("category"))
        # If category is known, skip the category question and combine the rest
        if category_ok:
            clarify = (
                f"Để gợi ý {cat_label} phù hợp nhất, bạn giúp mình 2 thông tin nhanh nhé:\n\n"
                f"• Ngân sách dự kiến: 1) Phổ thông (dưới 600k), "
                f"2) Tầm trung (600k-1.2M), 3) Cao cấp (trên 1.2M)\n\n"
                f"• Mục tiêu tập luyện:\n{goal_options}"
            )
        else:
            clarify = (
                "Bạn cho mình biết 3 thông tin nhanh để mình gợi ý chính xác nhé:\n\n"
                f"1) Loại sản phẩm bạn quan tâm:\n{cat_lines}\n\n"
                f"2) Ngân sách dự kiến: 1) Phổ thông (dưới 600k), "
                f"2) Tầm trung (600k-1.2M), 3) Cao cấp (trên 1.2M)\n\n"
                f"3) Mục tiêu tập luyện:\n{goal_options}"
            )
    elif not category_ok:
        # Step 1: Ask which product category FIRST
        cat_lines = "\n".join(f"{i}) {v}" for i, (_, v) in enumerate(_get_all_categories(), 1))
        clarify = (
            "Bạn muốn mua loại sản phẩm nào ạ? Mình có thể gợi ý chính xác hơn nếu bạn nói rõ nhé:\n\n"
            f"{cat_lines}"
        )
    elif not budget_ok:
        # Step 2: Ask budget
        clarify = (
            "Với ngân sách bao nhiêu thì phù hợp với bạn ạ?\n"
            "1) Phổ thông (dưới 600k), 2) Tầm trung (600k-1.2M), 3) Cao cấp (trên 1.2M)"
        )
    elif not goal_ok:
        # Step 3: Ask goal (use category-specific goals if known)
        goals = _get_category_goals(sm.get("category"))
        goal_options = _format_goal_options(goals, sep="\n")
        cat_label = _get_category_label(sm.get("category"))
        clarify = (
            f"Bạn đang tập luyện để đạt mục tiêu gì ạ? Để mình gợi ý {cat_label} phù hợp nhất:\n\n"
            f"{goal_options}"
        )
    else:
        # Step 4: All mandatory info collected → soft dietary note, not a blocking question
        cat_label = _get_category_label(sm.get("category"))
        clarify = (
            f"Ok, mình có thể gợi ý {cat_label} phù hợp ngay bây giờ ạ!\n"
            f"Bạn có yêu cầu gì đặc biệt về thành phần không "
            f"(ví dụ: không lactose, không gluten, vegan...)? "
            f"Nếu không, cứ để mình gợi ý luôn nhé!"
        )

    return clarify, memory_block



def prepare_clarify(state: GraphState) -> GraphState:
    """Routing-graph node: return the clarification question directly.

    The question is built rule-based by `build_clarify_prompt` and is
    already complete, natural Vietnamese. We do NOT call the LLM to
    rephrase it — that adds latency and risks the model changing the
    meaning or adding extra questions. Rule-based > LLM for this.
    """
    t0 = perf_counter()
    clarify_text, _ = build_clarify_prompt(state)

    # We still need to satisfy the external LLM-call contract (the
    # /chat and /chat/stream endpoints call the model after this node).
    # Return the rule-based text inside a HumanMessage; the sync/async
    # clarify helpers just pass it through verbatim.
    llm_messages = [HumanMessage(content=clarify_text)]

    timings = state.get("node_timings_ms") or {}
    timings["prepare_clarify"] = int((perf_counter() - t0) * 1000)

    # Preserve the upstream route_id so the API caller can still log it.
    # If somehow prepare_clarify is reached for a metadata_query / off_topic
    # route, fall back to "product" — clarify only makes sense there.
    return {
        "llm_messages": llm_messages,
        "product_payload": None,
        "route_id": "product",
        "clarify_text": clarify_text,
        "node_timings_ms": timings,
    }


def clarify_stream_sync(llm_messages: list, state: GraphState) -> str:
    """Return the rule-based clarify text verbatim — no LLM call.

    The clarification question is built deterministically by
    `build_clarify_prompt`. Calling an LLM to "rephrase" added latency
    and risked altering the meaning, so we now return the text as-is.
    """
    if not llm_messages:
        return ""
    return str(llm_messages[0].content or "").strip()


async def clarify_stream_async(llm_messages: list, state: GraphState):
    """Yield the rule-based clarify text as a single chunk — no LLM call.

    Buffering the full text (instead of streaming) avoids broken Vietnamese
    rendering (e.g. spaces between syllables) on the frontend.
    """
    if not llm_messages:
        return
    yield str(llm_messages[0].content or "").strip()


# =========================================================================
# Finish — persist structured_memory back to checkpoint
# =========================================================================
#
# `finish` is the single source of truth for save logic. It is run by the
# finish graph after the routing graph + the external LLM call have both
# completed. It expects the state to already contain:
#   - final_answer (set by the caller from the LLM result)
#   - structured_memory (carried over by the routing graph)
#   - retrieval_scores, reranker_top_score, node_timings_ms (from retrieve)
#
# If the routing graph already pushed an AIMessage into `messages` (legacy
# path or the routing graph still runs generate internally for some routes),
# `finish` replaces it with one that carries the final answer + token usage.
# If no such AIMessage exists, `finish` appends a fresh one — this is the
# path used by the split-graph design.

def _sanitize_memory(sm: dict) -> dict:
    """Loại bỏ field legacy / PII khỏi structured_memory trước khi persist.

    Sau khi đổi sang không lưu PII nữa, các checkpoint cũ vẫn có thể còn
    `_session_name` / `_session_phone`. Hàm này đảm bảo chúng không bao giờ
    xuất hiện trong state trả về từ finish.
    """
    if not sm:
        return {}
    return {k: v for k, v in sm.items() if not k.startswith("_session_")}


def finish(state: GraphState) -> GraphState:
    """Finalize answer: attach token usage, retrieval scores, persist structured_memory.

    Là single source of truth cho save logic (xem comment ở đầu section).
    KHÔNG ghi `messages` — routing graph đã lo phần đó để tránh overwrite
    checkpoint history. Chỉ persist:
      - structured_memory (đã sanitize)
      - final_answer + last_token_usage (cho MySQL save phía API)
      - retrieval scores + timings (cho observability)
    """
    answer = (state.get("final_answer") or state.get("draft_answer") or "").strip()
    if not answer:
        # Fallback so MySQL never stores an empty message — the user would
        # otherwise see a blank bubble with no explanation.
        answer = (
            "Xin lỗi bạn, mình chưa thể trả lời câu này lúc này. "
            "Bạn có thể diễn đạt lại bằng cách khác giúp mình không ạ?"
        )
    handler = get_active_token_handler()

    return {
        "final_answer": answer,
        "last_token_usage": handler.to_dict() if handler else {},
        "retrieval_scores": state.get("retrieval_scores") or {},
        "reranker_top_score": state.get("reranker_top_score") or 0.0,
        "node_timings_ms": state.get("node_timings_ms") or {},
        "structured_memory": _sanitize_memory(state.get("structured_memory") or {}),
        # messages intentionally omitted — routing_graph handles checkpoint write
    }


# =========================================================================
# Graph Builders — split design (routing + finish)
# =========================================================================
#
# Two graphs share the same checkpointer instance so they see the same
# thread_id state. The flow is:
#
#   1. caller runs `routing_graph` from START to END with the user input
#   2. routing_graph returns the state containing `llm_messages` (and any
#      intermediate retrieval / structured memory updates). It does NOT
#      call the LLM and does NOT push an AIMessage into messages.
#   3. caller invokes the LLM externally (sync or async stream) and gets
#      back a final answer string.
#   4. caller runs `finish_graph` with `{"final_answer": answer, ...state}`
#      using the same thread_id. The finish graph runs the `finish` node
#      which is the single source of truth for save logic.
#
# `checkpointer` is injected so the caller can pick the right saver type:
#   - sync /chat (graph.invoke)        → InMemorySaver
#   - async /chat/stream (graph.ainvoke) → AsyncSqliteSaver (or InMemorySaver)
# Both graphs MUST be built with the same checkpointer instance so that
# updates from `routing_graph` are visible to `finish_graph` for the same
# thread_id.

def build_routing_graph(
    *,
    model: ChatOpenAI | None = None,
    checkpointer=None,
) -> Any:
    """Routing graph — runs memory, retrieval, and prepare_* nodes. No LLM call.

    Flow:
        START
          → build_structured_memory
          → memory_trim
          → retrieve
          → check_product_info (conditional)
              ├─ "clarify"  → prepare_clarify  → END
              └─ "generate" → prepare_generation → END
    """
    _ = model  # currently unused in routing graph (kept for API symmetry)

    builder = StateGraph(GraphState)

    builder.add_node("build_structured_memory", build_structured_memory)
    builder.add_node("memory_trim", memory_trim)
    builder.add_node("retrieve", retrieve)
    builder.add_node("prepare_generation", prepare_generation)
    builder.add_node("prepare_clarify", prepare_clarify)

    builder.add_edge(START, "build_structured_memory")
    builder.add_edge("build_structured_memory", "memory_trim")
    builder.add_edge("memory_trim", "retrieve")
    builder.add_conditional_edges(
        "retrieve",
        check_product_info,
        {
            "clarify": "prepare_clarify",
            "generate": "prepare_generation",
        },
    )
    builder.add_edge("prepare_clarify", END)
    builder.add_edge("prepare_generation", END)

    return builder.compile(checkpointer=checkpointer)


def build_finish_graph(
    *,
    checkpointer=None,
) -> Any:
    """Finish graph — single source of truth for save logic.

    Flow:
        START → finish → END

    The caller is expected to pass `final_answer` (and any other fields it
    wants to merge) as the input state. The checkpointer MUST be the same
    instance used by `build_routing_graph` so the latest state is visible.
    """
    builder = StateGraph(GraphState)
    builder.add_node("finish", finish)
    builder.add_edge(START, "finish")
    builder.add_edge("finish", END)
    return builder.compile(checkpointer=checkpointer)


# Backward-compat alias — the old `build_chat_graph_v2` is replaced by the
# routing + finish pair. Some legacy callers may still reference it; keep a
# shim that returns the routing graph (the finish graph is separate now).
def build_chat_graph_v2(
    *,
    retrievers: dict[str, Any] | None = None,
    model: ChatOpenAI | None = None,
    checkpointer=None,
) -> Any:
    """Legacy shim — returns the routing graph.

    New code should call `build_routing_graph` and `build_finish_graph`
    separately. The `retrievers` argument is ignored here because the
    routing graph picks retrievers from the module-level registry set by
    `dependencies.set_retriever_registry` at startup.
    """
    return build_routing_graph(model=model, checkpointer=checkpointer)


# =========================================================================
# Helpers
# =========================================================================

def _last_assistant_message(messages: list | None) -> AIMessage | None:
    for msg in reversed(messages or []):
        if isinstance(msg, AIMessage) and msg.name != "context":
            return msg
    return None
