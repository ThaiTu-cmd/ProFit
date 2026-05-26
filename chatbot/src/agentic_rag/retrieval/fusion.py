"""Rank fusion and hybrid BM25 + vector retrieval."""

from __future__ import annotations

import hashlib
from typing import Any, Sequence

from langchain_core.documents import Document


def doc_key(doc: Document) -> str:
    if doc.metadata.get("id"):
        return str(doc.metadata["id"])
    return hashlib.md5(doc.page_content.encode()).hexdigest()


def reciprocal_rank_fusion(
    results: Sequence[Sequence[Document]],
    k: int = 60,
    top_n: int = 10,
) -> list[Document]:
    scores: dict[str, float] = {}
    by_key: dict[str, Document] = {}
    for result_list in results:
        for rank, doc in enumerate(result_list):
            key = doc_key(doc)
            by_key[key] = doc
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank + 1)
    ordered = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
    return [by_key[key] for key in ordered[:top_n]]


def hybrid_retrieve(
    query: str,
    bm25_retriever: Any,
    vector_retriever: Any,
    k: int = 60,
    top_n: int = 10,
) -> list[Document]:
    return reciprocal_rank_fusion(
        [bm25_retriever.invoke(query), vector_retriever.invoke(query)],
        k=k,
        top_n=top_n,
    )
