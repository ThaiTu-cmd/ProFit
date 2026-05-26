"""LangGraph state and routing decision models."""

from __future__ import annotations

from typing import Annotated, Literal, TypedDict

from langchain_core.documents import Document
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field


class RouteDecision(BaseModel):
    route_id: Literal["nutrition", "shipping", "product", "general"] = Field(
        description="nutrition | shipping | product | general"
    )


class GraphState(TypedDict, total=False):
    messages: Annotated[list[BaseMessage], add_messages]
    user_query: str
    user_context: dict
    route_id: str
    product_field: str
    documents: list[Document]
    draft_answer: str
    reflection_count: int
    final_answer: str
    skip_reflection: bool
    last_token_usage: dict
