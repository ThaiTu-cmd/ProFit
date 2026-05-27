"""Verify routing-aligned mock datasets meet project requirements."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"

PRODUCT_CATEGORIES = {"whey_protein", "creatine", "pre_workout", "vitamin_bcaa"}
PRODUCT_FIELDS = {
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
}
FAQ_FIELDS = {"question", "answer", "tags", "updated_at"}
ORDER_SKUS = {
    "SKU-OPTIMUM-NUTRITION-100-GOLD-001",
    "SKU-TRUE-NUTRITION-RBGHSOY-FREE-002",
    "SKU-PREMIER-PROTEIN-CHOCOLATE-MILKSHAKE-003",
    "SKU-MYPROTEIN-IMPACT-WHEY-ISOLATE-004",
    "SKU-NAKED-EGG-WHITE-PROTEIN-005",
    "SKU-ORGAIN-PLANTBASED-PROTEIN-POWDER-006",
    "SKU-BLOOM-WHEY-PROTEIN-ISOLATE-007",
    "SKU-NOW-SPORTS-WHEY-PROTEIN-008",
    "SKU-KLEAN-ATHLETE-KLEAN-ISOLATE-009",
    "SKU-RAW-ORGANIC-GRASSFED-WHEY-010",
    "SKU-DYMATIZE-ISO100-011",
    "SKU-BSN-SYNTHA6-012",
    "SKU-MUSCLETECH-NITROTECH-013",
    "SKU-GHOST-WHEY-PROTEIN-014",
    "SKU-RULE-1-R1-PROTEIN-015",
}


def _load(path: Path) -> list:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path.name} must be a JSON array")
    return data


def verify_products(products: list) -> list[str]:
    errors: list[str] = []
    if len(products) != 100:
        errors.append(f"products.json: expected 100 records, got {len(products)}")

    names = [p.get("name") for p in products]
    descs = [p.get("short_desc") for p in products]
    skus = [p.get("sku") for p in products]

    if len(set(names)) != len(names):
        errors.append("products.json: duplicate name values")
    if len(set(descs)) != len(descs):
        errors.append("products.json: duplicate short_desc values")
    if len(set(skus)) != len(skus):
        errors.append("products.json: duplicate sku values")

    cats = Counter(p.get("category") for p in products)
    for cat in PRODUCT_CATEGORIES:
        if cats.get(cat, 0) != 25:
            errors.append(f"products.json: category {cat} expected 25, got {cats.get(cat, 0)}")

    product_skus = {p.get("sku") for p in products}
    missing_order = ORDER_SKUS - product_skus
    if missing_order:
        errors.append(f"products.json: missing order SKUs: {sorted(missing_order)}")

    for i, p in enumerate(products):
        missing = PRODUCT_FIELDS - set(p)
        if missing:
            errors.append(f"products[{i}]: missing fields {sorted(missing)}")
        if p.get("category") not in PRODUCT_CATEGORIES:
            errors.append(f"products[{i}]: invalid category {p.get('category')!r}")
    return errors


def verify_faq(path: Path, expected: int, label: str) -> list[str]:
    items = _load(path)
    errors: list[str] = []
    if len(items) != expected:
        errors.append(f"{path.name}: expected {expected} records, got {len(items)}")
    questions = [x.get("question") for x in items]
    if len(set(questions)) != len(questions):
        errors.append(f"{path.name}: duplicate question values")
    for i, item in enumerate(items):
        missing = FAQ_FIELDS - set(item)
        if missing:
            errors.append(f"{path.name}[{i}]: missing fields {sorted(missing)}")
    return errors


def main() -> int:
    errors: list[str] = []
    errors.extend(verify_products(_load(DATA_DIR / "products.json")))
    errors.extend(verify_faq(DATA_DIR / "nutrition.json", 100, "nutrition"))
    errors.extend(verify_faq(DATA_DIR / "faq_policy.json", 100, "policy"))
    errors.extend(verify_faq(DATA_DIR / "general.json", 100, "general"))

    orders = _load(DATA_DIR / "order.json")
    if len(orders) != 100:
        errors.append(f"order.json: expected 100 records, got {len(orders)}")

    if errors:
        print("FAIL")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("PASS")
    print("  products.json: 100 (25 per category, unique name/short_desc)")
    print("  nutrition.json: 100")
    print("  faq_policy.json: 100")
    print("  general.json: 100")
    print("  order.json: 100 (unchanged)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
