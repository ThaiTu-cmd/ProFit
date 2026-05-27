"""Shared FastAPI dependencies: retriever and compiled graph."""

from __future__ import annotations

import os
from functools import lru_cache

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres.vectorstores import PGVector

from agentic_rag.config.settings import (
    ALLOW_DEMO_RETRIEVER,
    OPENAI_EMBEDDING_MODEL,
    PGVECTOR_COLLECTION,
    PGVECTOR_CONNECTION,
)
from agentic_rag.core.graph import build_chat_graph
from agentic_rag.llm import create_chat_model

# Route retriever name → PGVector metadata `source` filter value.
ROUTE_SOURCE_FILTERS: dict[str, str] = {
    "nutrition": "nutrition",
    "shipping": "policy",
    "product": "product_catalog",
    "general": "general",
}


class RetrieverConfigurationError(RuntimeError):
    """Raised when PGVector is unavailable and demo retriever is not allowed."""


def _demo_retriever(source: str):
    """In-memory demo store — opt-in only via ALLOW_DEMO_RETRIEVER=true."""
    from langchain_core.vectorstores import InMemoryVectorStore

    demo_content = {
        "product_catalog": (
            "Optimum Nutrition 100% Gold Standard Whey 2.27kg, Whey Blend, giá 1.650.000đ."
        ),
        "nutrition": (
            "Q: Whey isolate khác concentrate thế nào?\n"
            "A: Isolate lọc cao hơn, ít lactose và carb hơn concentrate."
        ),
        "policy": (
            "Q: Thời gian giao hàng?\nA: Nội thành 1-3 ngày, ngoại tỉnh 3-7 ngày."
        ),
        "general": (
            "Q: Giờ mở cửa?\nA: Showroom mở 9:00-21:00 hằng ngày."
        ),
    }
    docs = [
        Document(
            page_content=demo_content.get(source, demo_content["general"]),
            metadata={"id": f"demo:{source}", "source": source},
        )
    ]
    store = InMemoryVectorStore(OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL))
    store.add_documents(docs)
    return store.as_retriever(search_kwargs={"k": 3, "filter": {"source": source}})


def get_pgvector_store() -> PGVector:
    return PGVector(
        embeddings=OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL),
        collection_name=PGVECTOR_COLLECTION,
        connection=PGVECTOR_CONNECTION,
        use_jsonb=True,
    )


def get_source_retriever(source: str):
    """Retriever scoped to one dataset via metadata filter."""
    try:
        vs = get_pgvector_store()
        return vs.as_retriever(
            search_kwargs={"k": 3, "filter": {"source": source}},
        )
    except Exception as exc:
        if ALLOW_DEMO_RETRIEVER:
            return _demo_retriever(source)
        raise RetrieverConfigurationError(
            "PGVector retriever unavailable. Start Postgres (docker compose up -d), "
            "run scripts/ingest_pgvector.py, and set PGVECTOR_CONNECTION in .env. "
            "For local UI-only testing, set ALLOW_DEMO_RETRIEVER=true."
        ) from exc


def build_route_retrievers() -> dict[str, object]:
    """One retriever per route, each filtered by `source` metadata."""
    return {
        route: get_source_retriever(source)
        for route, source in ROUTE_SOURCE_FILTERS.items()
    }


@lru_cache
def get_graph():
    return build_chat_graph(
        retrievers=build_route_retrievers(),
        model=create_chat_model(temperature=0.2),
    )
