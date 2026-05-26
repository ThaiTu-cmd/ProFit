"""Shim — use `agentic_rag.retrieval` in new code."""

from agentic_rag.retrieval import *  # noqa: F403
from agentic_rag.schemas.products import ProductItem

__all__ = [
    "ProductItem",
    "doc_key",
    "document_to_product",
    "format_price",
    "format_weight",
    "hybrid_retrieve",
    "postprocess_product_docs",
    "reciprocal_rank_fusion",
]
