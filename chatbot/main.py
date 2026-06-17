"""FastAPI chatbot — summarize history + rewrite prompt + stream từng ký tự.

Protocol khớp ChatWidget (frontend):
  POST /chat/stream   body: { message, thread_id, user_id, history? }
  -> SSE: event=meta     data={"summary": "..."}
          event=token    data="<char>"          (stream từng ký tự của prompt đã rewrite)
          event=done      data={"final": "...", "summary": "..."}
"""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from openai import APIError

from config import OPENAI_API_KEY
from summarize import stream_rewrite_prompt, summarize_history

app = FastAPI(title="ProFit Chatbot", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sse(event: str, data) -> bytes:
    if isinstance(data, (dict, list)):
        payload = json.dumps(data, ensure_ascii=False)
    else:
        payload = str(data)
    return f"event: {event}\ndata: {payload}\n\n".encode("utf-8")


@app.get("/health")
async def health():
    return JSONResponse(
        {
            "status": "ok",
            "openai_key_set": bool(OPENAI_API_KEY) and not OPENAI_API_KEY.startswith("<"),
        }
    )


@app.post("/chat/stream")
async def chat_stream(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}

    message = (body.get("message") or "").strip()
    history = body.get("history") or []
    thread_id = body.get("thread_id") or "web"
    user_id = body.get("user_id") or "web_user"

    if not message:
        async def _err():
            yield _sse("error", "message is required")
        return StreamingResponse(_err(), media_type="text/event-stream")

    if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("<"):
        async def _no_key():
            yield _sse("error", "OPENAI_API_KEY chưa cấu hình trong chatbot/.env")
        return StreamingResponse(_no_key(), media_type="text/event-stream")

    async def _stream() -> AsyncIterator[bytes]:
        try:
            yield _sse("meta", {"thread_id": thread_id, "user_id": user_id, "stage": "summarize"})
            summary = await summarize_history(history)
            yield _sse("meta", {"stage": "summarize_done", "summary": summary})
        except APIError as e:
            yield _sse("error", f"Summarize lỗi OpenAI: {e}")
            return
        except Exception as e:
            yield _sse("error", f"Summarize thất bại: {e}")
            return

        rewritten_parts: list[str] = []
        try:
            async for token in stream_rewrite_prompt(message, summary):
                rewritten_parts.append(token)
                # stream từng ký tự của token (token OpenAI thường là 1 vài ký tự,
                # nhưng để đảm bảo UI hiển thị "từng ký tự", ta tách nhỏ thêm).
                for ch in token:
                    yield _sse("token", ch)
                    await asyncio.sleep(0.008)
        except APIError as e:
            yield _sse("error", f"Rewrite lỗi OpenAI: {e}")
            return
        except Exception as e:
            yield _sse("error", f"Rewrite thất bại: {e}")
            return

        final = "".join(rewritten_parts).strip() or message
        yield _sse("done", {"final": final, "summary": summary})

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9876)