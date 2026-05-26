# Project map

Production package: **`src/agentic_rag/`**. Legacy import path **`api/`** (thin shims) keeps notebooks and old scripts working.

## Entrypoints

| Entry | Command / module |
|-------|------------------|
| API server | `uvicorn agentic_rag.api.main:app --reload` |
| Legacy shim | `uvicorn api.main:app --reload` (same app) |
| Health | `GET /health` |
| Chat | `POST /chat` |
| Stream | `POST /chat/stream` (direct LLM stream, not full graph) |
| Lab notebook | `venv/etc/jupyter/nbconfig/notebook.d/rag.ipynb` |
| Docker DB | `docker compose up -d` → PGVector on `:6024` |

**PYTHONPATH:** `c:\Users\Admin\RAG_langchain_project\src` (or project root — `api/__init__.py` auto-adds `src`).

## Folder responsibilities

| Path | Role |
|------|------|
| `src/agentic_rag/api/` | FastAPI routes, retriever/graph wiring |
| `src/agentic_rag/core/` | LangGraph state + compiled pipeline |
| `src/agentic_rag/retrieval/` | RRF, hybrid helper, product formatters |
| `src/agentic_rag/config/` | YAML routes/prompts + env settings |
| `src/agentic_rag/schemas/` | Pydantic HTTP + product models |
| `config/` | Operator copies: `routes.yaml`, `prompts.yaml` from `*.example` |
| `api/` | Backward-compatible re-exports only |
| `scripts/` | Notebook patch utilities |
| `notebooks/` | Pointer to lab `rag.ipynb` |
| `docs/` | Architecture docs (this file, REQUEST_FLOW, AI_PIPELINE) |

## Core modules

- **`agentic_rag.core.graph`** — `build_chat_graph()`: memory trim → route → retrieve → generate → reflect (≤3) → finish.
- **`agentic_rag.api.dependencies`** — PGVector retriever with in-memory demo fallback; cached graph.
- **`agentic_rag.retrieval.fusion`** — `reciprocal_rank_fusion`, `hybrid_retrieve` (BM25 + vector lists).
- **`agentic_rag.retrieval.products`** — `document_to_product`, `postprocess_product_docs` for product route.
- **`agentic_rag.config`** — Routes, prompts, `is_configured()` for custom YAML.

## Request flow (summary)

Client → FastAPI `/chat` → `get_graph()` → LangGraph invoke → JSON answer + products. See [REQUEST_FLOW.md](REQUEST_FLOW.md).

## AI pipeline (summary)

Thread memory (trim) → structured route → retriever by route → LLM with route prompt + context → reflection loop. See [AI_PIPELINE.md](AI_PIPELINE.md).

## Database layer

- **Production:** `langchain_postgres.PGVector` via `PGVECTOR_CONNECTION` / `PGVECTOR_COLLECTION`.
- **Fallback:** `InMemoryVectorStore` demo doc when PG is unreachable.
- **Notebook/lab:** Self-Query, MultiVector, BM25+vector+RRF patterns in `rag.ipynb`; hybrid helpers call `agentic_rag.retrieval`.

## Technical debt / duplication

| Issue | Resolution |
|-------|------------|
| Monolithic `api/config.py`, `api/retrieval.py`, `api/graph.py` | Split into `config/`, `retrieval/`, `core/`, `schemas/` under `agentic_rag` |
| RRF defined inline in notebook cells | Notebook keeps pedagogy copies; production uses `retrieval/fusion.py` |
| `api/` vs package naming collision | `api/` retained as shims only; real code under `agentic_rag` |
| `is_configured` missing in old `config.py` | Implemented in `agentic_rag.config` |
| `/chat/stream` bypasses graph | Documented as lightweight token stream (not agentic path) |
| Single retriever wired 4× in dependencies | Demo simplification; production should map route → distinct retriever/collection |
| `patch_rag_notebook.py` stale `retriever_nutrition=` kwargs | Notebook cells use `retrievers=` dict; patch script still has old snippet (run `fix_notebook_integrated.py` for graph cell) |

**Unused / dead:** No separate unused Python modules beyond replaced root `api/*.py` (now shims). `requirements-api.txt` superseded by `requirements.txt`.

## New modules rationale

| Module | Why |
|--------|-----|
| `config/settings.py` | Central env + `PROJECT_ROOT` / `CONFIG_DIR` (was embedded in monolithic config) |
| `config/routes.py` / `config/prompts.py` | Separate YAML concerns for routing vs prompts |
| `core/state.py` | `GraphState` + `RouteDecision` isolated from graph edges |
| `retrieval/fusion.py` | RRF/hybrid without product formatting noise |
| `retrieval/formatters.py` | Reusable price/weight display |
| `retrieval/products.py` | Document → `ProductItem` mapping |
| `schemas/chat.py` | HTTP contracts decoupled from FastAPI file |
| `schemas/products.py` | Shared product DTO for API and notebook |
| `api/dependencies.py` | Retriever/graph lifecycle out of route handlers |
| `api/` shims (root) | Zero-change imports for `rag.ipynb` (`from api.retrieval import …`) |
