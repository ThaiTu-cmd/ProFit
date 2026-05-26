# Agentic RAG — hướng dẫn chạy

Kiến trúc production: package **`src/agentic_rag/`** (FastAPI, LangGraph, hybrid BM25+PGVector, RRF, Self-Query concepts, reflection, streaming).  
Lab notebook: `venv/etc/jupyter/nbconfig/notebook.d/rag.ipynb` — xem `notebooks/README.md`.

## 1. Cài dependency (khi sẵn sàng chạy)

```powershell
cd c:\Users\Admin\RAG_langchain_project
.\venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Biến môi trường

File: `venv\.env` hoặc project root `.env` — thay `<your-api-key>` bằng key thật.

```powershell
copy .env.example .env
# hoặc: copy venv\.env .env
```

## 3. Docker PGVector (bắt buộc cho retrieval thật)

```powershell
docker compose up -d
```

Sau khi Postgres chạy, tạo/kiểm tra dữ liệu mock và ingest:

```powershell
python scripts\verify_datasets.py
python scripts\ingest_pgvector.py
```

Nếu **chưa** có Postgres và chỉ cần thử UI nhanh, đặt trong `.env`:

```env
ALLOW_DEMO_RETRIEVER=true
```

Mặc định `ALLOW_DEMO_RETRIEVER=false` — API báo lỗi rõ nếu PGVector không kết nối được (tránh trả lời sai từ demo im lặng).

## 4. Tùy chỉnh routing / prompt (tùy chọn)

```powershell
copy config\routes.yaml.example config\routes.yaml
copy config\prompts.yaml.example config\prompts.yaml
```

Nếu **không** copy, code dùng default trong `agentic_rag.config` + `*.example`.

## 5. Model LLM (mặc định `gpt-5-nano`)

Trong `.env`:

```env
OPENAI_CHAT_MODEL=gpt-5-nano
```

## 6. Chạy API

```powershell
$env:PYTHONPATH = "c:\Users\Admin\RAG_langchain_project\src"
uvicorn agentic_rag.api.main:app --reload
```

Hoặc từ project root (shim `api/` tự thêm `src` vào path):

```powershell
$env:PYTHONPATH = "c:\Users\Admin\RAG_langchain_project"
uvicorn api.main:app --reload
```

- GET `/health` — không cần key  
- POST `/chat` — cần `OPENAI_API_KEY`  
- POST `/chat/stream` — stream LLM trực tiếp (không qua full graph)

## 7. Tài liệu kiến trúc

- `docs/PROJECT_MAP.md` — cấu trúc thư mục, module, technical debt  
- `docs/REQUEST_FLOW.md` — lifecycle HTTP  
- `docs/AI_PIPELINE.md` — memory, retrieval, product, reflection

## 8. Notebook

`venv\etc\jupyter\nbconfig\notebook.d\rag.ipynb` — import qua `api.*` (shim → `agentic_rag`). Đồng bộ cell tích hợp:

```powershell
python scripts\fix_notebook_integrated.py
```
