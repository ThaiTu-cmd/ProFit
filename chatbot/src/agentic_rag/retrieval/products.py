"""Map retrieved documents to API product payloads."""

from __future__ import annotations

from typing import Iterable

from langchain_core.documents import Document

from agentic_rag.retrieval.formatters import format_price, format_weight
from agentic_rag.schemas.products import ProductItem

API_SNIPPET_MAX_LEN = 80


def is_catalog_product(doc: Document) -> bool:
    """Chỉ SKU catalog — loại FAQ/policy (metadata không có name/sku)."""
    meta = doc.metadata or {}
    if meta.get("source") == "product_catalog":
        return True
    if meta.get("sku") and meta.get("name"):
        return True
    if meta.get("name") and meta.get("brand"):
        return True
    return False


def catalog_products_only(docs: Iterable[Document]) -> list[Document]:
    return [d for d in docs if is_catalog_product(d)]


def prepare_product_retrieval_docs(
    all_docs: list[Document], query: str, *, max_catalog: int = 6, max_faq: int = 2
) -> list[Document]:
    """Tách catalog vs FAQ; câu tư vấn được kèm ít FAQ, câu hỏi 1 trường chỉ dùng catalog."""
    from agentic_rag.retrieval.context import (
        detect_product_field_intent,
        is_advisory_product_query,
    )

    catalog = catalog_products_only(all_docs)
    faq = [d for d in all_docs if d not in catalog]
    if detect_product_field_intent(query) and catalog:
        return catalog[:max_catalog]
    if is_advisory_product_query(query):
        return catalog[:max_catalog] + faq[:max_faq]
    return (catalog[:max_catalog] if catalog else list(all_docs)[:max_catalog])


def _product_snippet(doc: Document, meta: dict) -> str:
    raw = meta.get("short_desc") or meta.get("name") or ""
    text = str(raw).strip().replace("\n", " ")
    if text:
        return text[:API_SNIPPET_MAX_LEN]
    return ""


def document_to_product(doc: Document) -> ProductItem | None:
    if not is_catalog_product(doc):
        return None
    meta = doc.metadata or {}
    name = str(meta.get("name") or "").strip()
    if not name:
        return None
    return ProductItem(
        name=name,
        price_display=format_price(meta.get("price")),
        weight_display=format_weight(meta.get("weight")),
        origin=meta.get("origin") or meta.get("origin_country"),
        brand=meta.get("brand"),
        image_url=meta.get("image_url"),
        product_url=meta.get("product_url"),
        snippet=_product_snippet(doc, meta),
    )


def documents_to_products(docs: Iterable[Document], *, limit: int = 6) -> list[ProductItem]:
    out: list[ProductItem] = []
    for doc in docs:
        item = document_to_product(doc)
        if item:
            out.append(item)
        if len(out) >= limit:
            break
    return out


def postprocess_product_docs(docs: Iterable[Document]) -> list[Document]:
    """Giữ metadata gốc (price/weight số) — format chỉ khi map ra API/LLM."""
    return list(docs)
