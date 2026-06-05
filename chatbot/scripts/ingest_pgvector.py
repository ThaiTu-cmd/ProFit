from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres.vectorstores import PGVector

from agentic_rag.config.settings import OPENAI_EMBEDDING_MODEL, PGVECTOR_COLLECTION, PGVECTOR_CONNECTION


DATA_DIR = PROJECT_ROOT / "data"

# Ensure OPENAI_API_KEY and PGVECTOR_* from project root `.env` are available when
# running this script directly (unlike FastAPI app which already loads dotenv).
load_dotenv(PROJECT_ROOT / ".env")


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _product_to_doc(p: dict[str, Any]) -> Document:
    sku = str(p.get("sku") or "").strip()
    name = str(p.get("name") or "").strip()
    brand = str(p.get("brand") or "").strip()
    category = p.get("category")
    flavor = p.get("flavor")
    short_desc = str(p.get("short_desc") or "").strip()

    page = "\n".join(
        x
        for x in [
            f"{name}".strip(),
            f"Brand: {brand}".strip() if brand else "",
            f"Category: {category}".strip() if category else "",
            f"Flavor: {flavor}".strip() if flavor else "",
            short_desc,
        ]
        if x
    ).strip()

    meta = {
        "id": f"product:{sku}" if sku else None,
        "sku": sku or None,
        "name": name or None,
        "brand": brand or None,
        "category": category,
        "price": p.get("price"),
        "weight": p.get("weight"),
        "flavor": flavor,
        "whey_type": p.get("whey_type"),
        "lactose_note": p.get("lactose_note"),
        "origin_country": p.get("origin_country"),
        "origin": p.get("origin_country"),
        "serving_size_g": p.get("serving_size_g"),
        "servings_per_container": p.get("servings_per_container"),
        "product_url": p.get("product_url"),
        "image_url": p.get("image_url"),
        "source": "product_catalog",
    }
    meta = {k: v for k, v in meta.items() if v is not None}

    return Document(page_content=page or name or sku or "(no content)", metadata=meta)


def _faq_to_doc(item: dict[str, Any], *, source: str, id_prefix: str) -> Document:
    q = str(item.get("question") or "").strip()
    a = str(item.get("answer") or "").strip()
    tags = item.get("tags") or []
    updated_at = item.get("updated_at")

    page = f"Q: {q}\nA: {a}".strip()
    meta = {
        "id": f"{id_prefix}:{q[:80]}",
        "tags": tags,
        "updated_at": updated_at,
        "source": source,
    }
    meta = {k: v for k, v in meta.items() if v is not None}
    return Document(page_content=page, metadata=meta)


def _add_documents(vs: PGVector, docs: list[Document]) -> None:
    ids: list[str] = []
    for d in docs:
        doc_id = (d.metadata or {}).get("id")
        if isinstance(doc_id, str) and doc_id:
            ids.append(doc_id)
        else:
            ids.append("")

    try:
        vs.add_documents(docs, ids=ids)
    except TypeError:
        vs.add_documents(docs)


def _load_faq_docs(path: Path, *, source: str, id_prefix: str) -> list[Document]:
    items = _load_json(path)
    if not isinstance(items, list):
        raise SystemExit(f"{path.name} must be a JSON array")
    return [_faq_to_doc(x, source=source, id_prefix=id_prefix) for x in items]


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest JSON files into PGVector.")
    parser.add_argument("--products", type=str, default=str(DATA_DIR / "products.json"))
    parser.add_argument("--nutrition", type=str, default=str(DATA_DIR / "nutrition.json"))
    parser.add_argument("--faq", type=str, default=str(DATA_DIR / "faq_policy.json"))
    parser.add_argument("--general", type=str, default=str(DATA_DIR / "general.json"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--collection", type=str, default=PGVECTOR_COLLECTION)
    args = parser.parse_args()

    products_path = Path(args.products)
    nutrition_path = Path(args.nutrition)
    faq_path = Path(args.faq)
    general_path = Path(args.general)

    products = _load_json(products_path)
    if not isinstance(products, list):
        raise SystemExit("products.json must be a JSON array")

    product_docs = [_product_to_doc(p) for p in products]
    nutrition_docs = _load_faq_docs(nutrition_path, source="nutrition", id_prefix="nutrition")
    policy_docs = _load_faq_docs(faq_path, source="policy", id_prefix="policy")
    general_docs = _load_faq_docs(general_path, source="general", id_prefix="general")
    docs = product_docs + nutrition_docs + policy_docs + general_docs

    if args.dry_run:
        print(
            "Dry run: would ingest "
            f"{len(product_docs)} product, "
            f"{len(nutrition_docs)} nutrition, "
            f"{len(policy_docs)} policy, "
            f"{len(general_docs)} general "
            f"({len(docs)} total)."
        )
        return

    vs = PGVector(
        embeddings=OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL),
        collection_name=args.collection,
        connection=PGVECTOR_CONNECTION,
        use_jsonb=True,
    )
    _add_documents(vs, docs)
    print(
        f"Inserted {len(docs)} documents into collection '{args.collection}' "
        f"(product={len(product_docs)}, nutrition={len(nutrition_docs)}, "
        f"policy={len(policy_docs)}, general={len(general_docs)})."
    )


if __name__ == "__main__":
    main()
