# Fallback audit (Agentic RAG)

Audit date: 2026-05-26. Goal: one production path (PGVector + route `source` filters), optional demo only when explicitly enabled.

## Removed or gated (inferior paths)

| Location | Before | After | Why |
|----------|--------|-------|-----|
| `agentic_rag.api.dependencies` | `get_retriever()` tried PGVector, **silent** fallback to single-doc `InMemoryVectorStore` | `build_route_retrievers()` — PGVector per route with `filter: {source: ...}`; demo only if `ALLOW_DEMO_RETRIEVER=true`, else `RetrieverConfigurationError` | Silent demo hid misconfiguration; all routes shared one retriever |
| `agentic_rag.api.dependencies` | One retriever wired 4× for every route | Four retrievers, metadata-scoped (`product_catalog`, `nutrition`, `policy`, `general`) | Route answers were not isolated |
| `agentic_rag.core.graph` `retrieve` | `retrievers.get(name) or retrievers.get("product")` | Raises `KeyError` if route retriever missing | Product fallback masked wiring bugs |
| `SETUP.md` | “API vẫn lên được” without PGVector | PGVector required for real RAG; demo opt-in documented | Misleading ops guidance |

## Kept (intentional, not inferior)

| Location | Behavior | Reason |
|----------|----------|--------|
| `agentic_rag.config.prompts` | `DEFAULT_PROMPTS` merged with `config/prompts.yaml` | Sensible defaults when YAML absent; YAML overrides |
| `agentic_rag.config.routes` | `DEFAULT_ROUTES` when `routes.yaml` missing | Same pattern; `config/routes.yaml` is source of truth in repo |
| `ENABLE_REFLECTION` / `skip_reflection` | Reflection off by default; product field fast-path skips reflection | Performance + deterministic SKU field answers |
| `agentic_rag.core.history` | `except` when parsing legacy product payloads | Backward-compatible checkpoints only |
| `api/*` shims | Re-export `agentic_rag` | Notebook/legacy imports; no duplicate logic |

## Demo retriever (opt-in only)

Set in `.env`:

```env
ALLOW_DEMO_RETRIEVER=true
```

Each route gets one in-memory document tagged with the correct `source`. **Not** for production Q&A quality.

## Production checklist

1. `docker compose up -d` (Postgres + pgvector)
2. `python scripts/verify_datasets.py` → `PASS`
3. `python scripts/ingest_pgvector.py`
4. `ALLOW_DEMO_RETRIEVER` unset or `false`
5. Restart API: `uvicorn agentic_rag.api.main:app --reload`

## Ingest `source` metadata (single collection)

| File | `metadata.source` | Route |
|------|-------------------|-------|
| `data/products.json` | `product_catalog` | `product` |
| `data/nutrition.json` | `nutrition` | `nutrition` |
| `data/faq_policy.json` | `policy` | `shipping` |
| `data/general.json` | `general` | `general` |
