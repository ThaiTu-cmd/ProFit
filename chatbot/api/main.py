"""Shim — production app lives in `agentic_rag.api.main`."""

from agentic_rag.api.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("agentic_rag.api.main:app", host="0.0.0.0", port=8000, reload=True)
