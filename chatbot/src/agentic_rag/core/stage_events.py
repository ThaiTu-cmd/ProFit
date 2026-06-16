"""Stage event helpers for the split-graph streaming design.

The new graph (`graph_v2.py`) runs in two stages:
  1. routing_graph — memory / retrieval / prepare_*, no LLM call
  2. LLM call — done OUTSIDE the graph, in `generate_stream_async`

The frontend ChatWidget wants a single SSE stream with semantic events
like `{"event": "stage", "data": "routing"}` and `{"event": "stage",
"data": "generating"}` so it can show progress indicators and decide
when the final answer is "complete".

This module centralizes the small constants and helpers used by the
SSE generator in `api/main_v2.py`:

  - STAGE_* constants — short, stable strings emitted on the wire
  - format_stage_event() — wrap a stage name into a `sse_starlette`
    dict payload
  - format_token_event() — wrap a streamed text chunk
  - format_done_event() — wrap the final full answer
  - format_error_event() — wrap an error message

The frontend never needs to import this module directly — it just reads
the `event` field of each SSE message.
"""

from __future__ import annotations

from typing import Any, AsyncIterator, Iterator

# ---- Stage names emitted on the wire (kept short & stable) -----------
STAGE_ROUTING = "routing"
STAGE_GENERATING = "generating"
STAGE_DONE = "done"
STAGE_ERROR = "error"

# Standard event names used by sse_starlette
EVENT_STAGE = "stage"
EVENT_TOKEN = "token"
EVENT_DONE = "done"
EVENT_ERROR = "error"
EVENT_MESSAGE = "message"


def format_stage_event(stage: str) -> dict[str, str]:
    """Wrap a stage name into a payload for `EventSourceResponse`."""
    return {"event": EVENT_STAGE, "data": stage}


def format_token_event(text: str) -> dict[str, str]:
    """Wrap a streamed text chunk from the LLM into a payload."""
    return {"event": EVENT_TOKEN, "data": text}


def format_message_event(text: str) -> dict[str, str]:
    """Wrap a streamed text chunk as a `message` event (legacy compat)."""
    return {"event": EVENT_MESSAGE, "data": text}


def format_done_event(full_answer: str) -> dict[str, str]:
    """Wrap the final full answer into a `done` event."""
    return {"event": EVENT_DONE, "data": full_answer}


def format_error_event(message: str) -> dict[str, str]:
    """Wrap an error message into an `error` event."""
    return {"event": EVENT_ERROR, "data": message}


async def aiter_to_sse(
    source: AsyncIterator[str],
    *,
    is_error: bool = False,
) -> AsyncIterator[dict[str, str]]:
    """Convert an async text iterator into a stream of token/error events.

    Used when the caller already has an async text generator (e.g.
    `generate_stream_async` or `clarify_stream_async`) and just wants to
    forward every chunk as a `token` SSE event.
    """
    try:
        async for chunk in source:
            if not chunk:
                continue
            yield format_token_event(chunk)
    except Exception as exc:  # noqa: BLE001 — we want to surface any error
        yield format_error_event(str(exc))


def iter_to_sse(
    source: Iterator[str],
    *,
    is_error: bool = False,
) -> Iterator[dict[str, str]]:
    """Sync version of `aiter_to_sse`."""
    try:
        for chunk in source:
            if not chunk:
                continue
            yield format_token_event(chunk)
    except Exception as exc:  # noqa: BLE001
        yield format_error_event(str(exc))


__all__ = [
    "STAGE_ROUTING",
    "STAGE_GENERATING",
    "STAGE_DONE",
    "STAGE_ERROR",
    "EVENT_STAGE",
    "EVENT_TOKEN",
    "EVENT_DONE",
    "EVENT_ERROR",
    "EVENT_MESSAGE",
    "format_stage_event",
    "format_token_event",
    "format_message_event",
    "format_done_event",
    "format_error_event",
    "aiter_to_sse",
    "iter_to_sse",
]
