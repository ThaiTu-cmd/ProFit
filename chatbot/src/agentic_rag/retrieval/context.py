"""Compact RAG context and field-specific product answers."""

from __future__ import annotations

import re
from typing import Literal

from langchain_core.documents import Document

from agentic_rag.retrieval.formatters import format_price, format_weight
from agentic_rag.retrieval.products import catalog_products_only, document_to_product
from agentic_rag.schemas.products import ProductItem

ProductField = Literal[
    "sku",
    "name",
    "brand",
    "category",
    "price",
    "weight",
    "flavor",
    "whey_type",
    "lactose_note",
    "origin_country",
    "serving_size_g",
    "servings_per_container",
    "product_url",
    "image_url",
    "short_desc",
    "general",
]

_ADVISORY_PATTERNS: tuple[str, ...] = (
    r"\bnên chọn\b",
    r"\bnên dùng\b",
    r"\bgợi ý\b",
    r"\btư vấn\b",
    r"\bso sánh\b",
    r"\btăng cân\b",
    r"\btăng cơ\b",
    r"\bgiảm cân\b",
    r"\bgiảm mỡ\b",
    r"\bphù hợp\b",
    r"\bloại nào\b",
    r"\bsản phẩm nào\b",
    r"\bwhey nào\b",
)


def is_advisory_product_query(query: str) -> bool:
    """Câu chọn/tư vấn — không dùng fast-path 1 trường (giá, xuất xứ, …)."""
    q = (query or "").lower()
    return any(re.search(p, q, re.IGNORECASE) for p in _ADVISORY_PATTERNS)


_FIELD_PATTERNS: dict[ProductField, tuple[str, ...]] = {
    "sku": (r"\bsku\b", r"\bmã sản phẩm\b", r"\bmã sku\b"),
    "name": (r"\btên sản phẩm\b", r"\btên là gì\b", r"\bname\b"),
    "brand": (r"\bthương hiệu\b", r"\bbrand\b", r"\bhãng\b", r"\bnhãn\b"),
    "category": (r"\bdanh mục\b", r"\bcategory\b", r"\bloại sản phẩm\b"),
    "price": (
        r"\bgiá\b",
        r"\bgiá bao nhiêu\b",
        r"\bbao nhiêu tiền\b",
        r"\bprice\b",
        r"\bcost\b",
        r"\btầm\b",
        r"\bngân sách\b",
    ),
    "weight": (
        r"\btrọng lượng\b",
        r"\bkhối lượng\b",
        r"\bnặng\b",
        r"\bweight\b",
        r"\blbs\b",
        r"\bkg\b",
        r"\bgram\b",
    ),
    "flavor": (r"\bvị\b", r"\bflavor\b", r"\bhương\b"),
    "whey_type": (
        r"\bloại whey\b",
        r"\bwhey type\b",
        r"\bwhey_type\b",
        r"\bisolate\b",
        r"\bconcentrate\b",
        r"\bblend\b",
        r"\bprotein type\b",
    ),
    "lactose_note": (
        r"\blactose\b",
        r"\bkhông lactose\b",
        r"\bchứa lactose\b",
        r"\bdị ứng sữa\b",
        r"\bnhạy lactose\b",
    ),
    "origin_country": (
        r"\bxuất xứ\b",
        r"\borigin\b",
        r"\borigin_country\b",
        r"\bmade in\b",
        r"\bsản xuất\b",
        r"\bnước\b",
    ),
    "serving_size_g": (
        r"\bserving size\b",
        r"\bserving_size_g\b",
        r"\bkhẩu phần\b",
        r"\bmỗi lần dùng\b",
        r"\bbao nhiêu g\b",
    ),
    "servings_per_container": (
        r"\bservings\b",
        r"\bservings_per_container\b",
        r"\bsố lần dùng\b",
        r"\bbao nhiêu lần dùng\b",
        r"\bdùng được bao nhiêu lần\b",
        r"\bbao nhiêu lần\b",
        r"\bdùng được bao lâu\b",
    ),
    "product_url": (r"\blink sản phẩm\b", r"\bproduct_url\b", r"\blink\b", r"\burl\b", r"\bđường dẫn\b"),
    "image_url": (r"\bảnh\b", r"\bhình\b", r"\bimage_url\b", r"\bthumbnail\b"),
    "short_desc": (r"\bmô tả\b", r"\bdescription\b", r"\bshort_desc\b", r"\bgiới thiệu\b"),
}


def _format_lactose_note(value: object) -> str:
    text = str(value or "").strip()
    lower = text.lower()
    if "free" in lower:
        return "không lactose"
    if "contains" in lower:
        return "có chứa lactose"
    return text or "chưa có trong hệ thống"


def detect_product_field_intent(query: str) -> ProductField | None:
    if is_advisory_product_query(query):
        return None
    q = (query or "").lower()
    hits: list[tuple[int, ProductField]] = []
    for field, patterns in _FIELD_PATTERNS.items():
        for i, pat in enumerate(patterns):
            if re.search(pat, q, re.IGNORECASE):
                hits.append((i, field))
                break
    if not hits:
        return None
    hits.sort(key=lambda x: x[0])
    return hits[0][1]


def _pick_relevant_doc(docs: list[Document], query: str) -> tuple[Document | None, int]:
    catalog = catalog_products_only(docs)
    pool = catalog if catalog else docs
    if not pool:
        return None, -1
    q = (query or "").lower()
    best: Document | None = None
    best_score = -1
    for doc in pool:
        name = str((doc.metadata or {}).get("name") or "").lower()
        score = 0
        if name and name in q:
            score += 10
        for token in re.findall(r"[\w\d]+", name):
            if len(token) >= 4 and token in q:
                score += 2
        if score > best_score:
            best_score = score
            best = doc
    if best is None:
        return None, -1
    return best, best_score


def compact_product_block(doc: Document, *, snippet_max: int = 420) -> str:
    meta = doc.metadata or {}
    p = document_to_product(doc)
    lines = [
        f"sku: {meta.get('sku') or 'Không rõ'}",
        f"name: {p.name}",
        f"brand: {p.brand or 'Không rõ'}",
        f"category: {meta.get('category') or 'Không rõ'}",
        f"price: {p.price_display}",
        f"weight: {p.weight_display}",
        f"flavor: {meta.get('flavor') or 'Không rõ'}",
        f"whey_type: {meta.get('whey_type') or 'Không rõ'}",
        f"lactose_note: {_format_lactose_note(meta.get('lactose_note'))}",
        f"origin_country: {p.origin or 'Không rõ'}",
        f"serving_size_g: {meta.get('serving_size_g') or 'Không rõ'}",
        f"servings_per_container: {meta.get('servings_per_container') or 'Không rõ'}",
        f"product_url: {p.product_url or 'Không rõ'}",
        f"image_url: {p.image_url or 'Không rõ'}",
    ]
    snippet = str(meta.get("short_desc") or doc.page_content or "")[:snippet_max].replace("\n", " ")
    if snippet:
        lines.append(f"short_desc: {snippet}")
    return "\n".join(lines)


def format_documents_for_llm(
    docs: list[Document],
    *,
    route_id: str,
    user_query: str,
    max_docs: int = 6,
) -> str:
    if not docs:
        return "(không có tài liệu)"
    sliced = docs[:max_docs]
    if route_id == "product":
        sliced = catalog_products_only(sliced) or sliced
        blocks = [
            f"[Sản phẩm {i + 1}]\n{compact_product_block(d)}"
            for i, d in enumerate(sliced)
        ]
        field = detect_product_field_intent(user_query)
        if field and field != "general":
            blocks.append(
                f"\n[Yêu cầu] Khách chỉ hỏi trường: {field}. "
                "Chỉ trả lời đúng trường đó, không liệt kê toàn bộ mô tả."
            )
        return "\n\n".join(blocks)
    return "\n\n".join((d.page_content or "")[:400] for d in sliced)


def try_field_answer(
    docs: list[Document], field: ProductField, query: str
) -> str | None:
    """Deterministic one-line answer from metadata (reduces hallucination + latency)."""
    doc, score = _pick_relevant_doc(docs, query)
    # If the query does not clearly reference a specific product, avoid guessing.
    if doc is None or score < 2:
        return None
    p = document_to_product(doc)
    if p is None:
        return None
    name = p.name

    if field == "price":
        return f"Dạ giá {name} là {p.price_display} ạ."
    if field == "weight":
        return f"Dạ trọng lượng {name} là {p.weight_display} ạ."
    meta = doc.metadata or {}

    if field == "sku":
        sku = meta.get("sku") or "chưa có trong hệ thống"
        return f"Dạ SKU của {name} là {sku} ạ."
    if field == "category":
        category = meta.get("category") or "chưa có trong hệ thống"
        return f"Dạ danh mục của {name} là {category} ạ."
    if field == "origin_country":
        origin = p.origin or "chưa có trong hệ thống"
        return f"Dạ xuất xứ {name} là {origin} ạ."
    if field == "brand":
        brand = p.brand or "chưa có trong hệ thống"
        return f"Dạ thương hiệu {name} là {brand} ạ."
    if field == "flavor":
        flavor = meta.get("flavor") or "chưa có trong hệ thống"
        return f"Dạ vị {name} là {flavor} ạ."
    if field == "whey_type":
        whey_type = meta.get("whey_type") or "chưa có trong hệ thống"
        return f"Dạ loại protein/whey của {name} là {whey_type} ạ."
    if field == "lactose_note":
        lactose_note = _format_lactose_note(meta.get("lactose_note"))
        return f"Dạ thông tin lactose của {name}: {lactose_note} ạ."
    if field == "serving_size_g":
        serving_size = meta.get("serving_size_g") or "chưa có trong hệ thống"
        return f"Dạ mỗi lần dùng {name} khoảng {serving_size}g ạ." if serving_size != "chưa có trong hệ thống" else f"Dạ mỗi lần dùng của {name} hiện {serving_size} ạ."
    if field == "servings_per_container":
        servings = meta.get("servings_per_container") or "chưa có trong hệ thống"
        return f"Dạ {name} có khoảng {servings} lần dùng mỗi hộp ạ." if servings != "chưa có trong hệ thống" else f"Dạ số lần dùng của {name} hiện {servings} ạ."
    if field == "product_url":
        url = p.product_url or "chưa có link trong hệ thống"
        return f"Dạ link {name}: {url} ạ."
    if field == "image_url":
        image_url = p.image_url or "chưa có ảnh trong hệ thống"
        return f"Dạ ảnh sản phẩm {name}: {image_url} ạ."
    if field == "short_desc":
        desc = meta.get("short_desc") or "chưa có mô tả trong hệ thống"
        return f"Dạ mô tả ngắn của {name}: {desc} ạ."
    if field == "name":
        return f"Dạ tên sản phẩm là {name} ạ."
    return None


def format_user_context(ctx: dict | None) -> str:
    if not ctx:
        return ""
    lines: list[str] = []
    mapping = {
        "customer_name": "Khách",
        "customer_phone": "SĐT",
        "customer_email": "Email",
        "order_id": "Mã đơn",
        "orderCode": "Mã đơn",
        "order_status": "Trạng thái đơn",
        "recipientName": "Người nhận",
        "recipientPhone": "SĐT người nhận",
        "shippingAddressLine1": "Địa chỉ",
        "shippingCity": "Thành phố",
        "shippingProvince": "Quận/Huyện",
        "cart_items": "Giỏ hàng",
        "items": "Sản phẩm",
        "notes": "Ghi chú",
        "note": "Ghi chú",
    }
    for key, label in mapping.items():
        val = ctx.get(key)
        if val is not None and val != "":
            if key in ("items", "cart_items") and isinstance(val, list):
                # Compact list of items to avoid blowing up the prompt.
                compact = []
                for item in val[:20]:
                    if isinstance(item, dict):
                        pid = item.get("productId") or item.get("product_id") or item.get("id")
                        qty = item.get("quantity") or item.get("qty")
                        if pid is not None and qty is not None:
                            compact.append(f"(productId={pid}, qty={qty})")
                        else:
                            compact.append(str(item))
                    else:
                        compact.append(str(item))
                suffix = "" if len(val) <= 20 else f" …(+{len(val) - 20})"
                lines.append(f"- {label}: {', '.join(compact)}{suffix}")
            else:
                lines.append(f"- {label}: {val}")
    if not lines:
        return ""
    return "Thông tin khách/đơn (chỉ dùng nếu liên quan câu hỏi):\n" + "\n".join(lines)


def products_to_message_payload(products: list[ProductItem]) -> list[dict]:
    return [p.model_dump() for p in products]
