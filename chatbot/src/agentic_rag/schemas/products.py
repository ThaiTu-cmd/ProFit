"""Structured product output for chat responses."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProductItem(BaseModel):
    name: str
    price_display: str = ""
    weight_display: str = ""
    origin: str | None = None
    brand: str | None = None
    image_url: str | None = None
    product_url: str | None = None
    snippet: str = Field(default="", description="Short excerpt from retrieved document")
