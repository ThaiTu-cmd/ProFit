"""Display formatters for product metadata."""

from __future__ import annotations


def format_weight(weight_in_grams: float | int | None) -> str:
    if weight_in_grams is None or not isinstance(weight_in_grams, (int, float)):
        return "Không rõ"
    # Catalog JSON lưu khối lượng theo kg (vd. 2.27, 10)
    if 0 < weight_in_grams < 50:
        if float(weight_in_grams).is_integer():
            return f"{int(weight_in_grams)}kg"
        return f"{weight_in_grams}kg"
    if weight_in_grams >= 1000:
        kg_value = weight_in_grams / 1000
        if float(kg_value).is_integer():
            return f"{int(kg_value)}kg"
        return f"{kg_value}kg"
    if float(weight_in_grams).is_integer():
        return f"{int(weight_in_grams)}g"
    return f"{weight_in_grams}g"


def format_price(price_int: float | int | None) -> str:
    if not price_int or not isinstance(price_int, (int, float)):
        return "Liên hệ"
    return f"{int(price_int):,}".replace(",", ".") + " VNĐ"
