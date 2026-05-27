# Important Files (Project Guide)

Tài liệu này mô tả nhanh các file “xương sống” của dự án agentic RAG ecommerce assistant, và chúng làm gì dựa theo các hàm/chức năng chính bên trong.

## API layer

### `src/agentic_rag/api/main.py`
- Expose HTTP endpoints:
  - `GET /health`: trả trạng thái key, PGVector connection, routes, reflection config, model name.
  - `GET /playground`: UI test nhanh trên trình duyệt (chat box).
  - `GET /chat/history/{thread_id}`: đọc checkpoint của LangGraph theo `thread_id` và trả history đã lọc (user + assistant).
  - `POST /chat`: đường chính; gọi graph `invoke()`, map docs → `products`, trả `history`, `latency_ms` (và timing breakdown nếu admin).
  - `POST /chat/stream`: stream raw LLM (không qua graph RAG).
- Chức năng quan trọng:
  - `_graph_config(thread_id)`: config checkpoint key cho LangGraph.
  - `_resolve_user_id(...)`: resolve user_id từ body/header (admin gating).

### `src/agentic_rag/api/dependencies.py`
- Khởi tạo retriever + compiled graph (cache bằng `@lru_cache`):
  - `get_pgvector_retriever()`: PGVector retriever (k=6) dùng `OpenAIEmbeddings`.
  - `get_retriever()`: try PGVector, fail thì fallback in-memory demo.
  - `get_graph()`: build LangGraph bằng `build_chat_graph(retrievers=..., model=...)`.

## Graph / agent core

### `src/agentic_rag/core/state.py`
- Định nghĩa state của LangGraph:
  - `GraphState.messages`: dùng reducer `add_messages` để **append transcript** qua các lượt chat theo `thread_id`.
  - `RouteDecision`: structured output cho router (`nutrition|shipping|product|general`).

### `src/agentic_rag/core/graph.py`
- Pipeline chính (LangGraph):
  - `route_query(state)`: gọi router LLM, có mang theo history (dạng text) để hiểu “cái đó/loại vừa nói”.
  - `retrieve(state)`: gọi retriever theo route; route `product` có bước chuẩn bị docs + nhận diện “product_field” (giá/xuất xứ/vị...).
  - `generate(state)`: build prompt gồm system + history đã filter/trim + context RAG; có “fast-path” trả lời 1 trường (giá/weight/origin/flavor/url...) bằng metadata để giảm bịa và giảm latency.
  - `reflect(state)`: (nếu bật) critique → rewrite tối đa `REFLECTION_MAX_ITERATIONS`; critique instruction đọc từ `config/prompts.yaml` qua `get_reflection_instruction()`.
  - `finish(state)`: finalize answer, đính kèm token_usage vào transcript message.
- Điểm quan trọng về history:
  - Transcript user+assistant được lưu trong checkpoint; LLM chỉ nhận **bản đã filter/trim** (không overwrite checkpoint).

### `src/agentic_rag/core/message_filter.py`
- “Filtering Messages pattern”:
  - `user_message()`, `assistant_message()`: chuẩn hóa message `name=user/assistant` để lọc transcript.
  - `get_full_transcript()`: lấy đúng user+assistant messages.
  - `filter_messages_for_llm()`: trim history theo token budget (`CHAT_TRIM_MAX_TOKENS`).
  - `build_llm_chat_messages()`: system + trimmed history + một HumanMessage chứa context; có rule “cấm bịa, không biết nói không biết”.

### `src/agentic_rag/core/history.py`
- `messages_to_history(...)`: chuyển checkpoint messages → API history (ChatTurn list), lọc bỏ message nội bộ; parse `products` và (admin-only) `token_usage`.

### `src/agentic_rag/core/token_usage.py`
- `TokenUsageCallbackHandler`: hook vào callbacks để cộng token_usage cho từng LLM call.
- `is_admin_user()`: chỉ user trong `ADMIN_USER_IDS` mới thấy `token_usage`/timings breakdown.

## Retrieval / RAG formatting

### `src/agentic_rag/retrieval/products.py`
- Logic “doc → ProductItem” và lọc catalog:
  - `is_catalog_product()`: phân biệt doc sản phẩm vs FAQ/policy.
  - `document_to_product()`: map metadata → `ProductItem` (name, price_display, weight_display, origin, brand,...).
  - `documents_to_products()`: lấy tối đa N sản phẩm để trả API.
  - `prepare_product_retrieval_docs()`: phối catalog + ít FAQ tùy kiểu câu hỏi (tư vấn vs hỏi 1 trường).

### `src/agentic_rag/retrieval/context.py`
- Compact context cho LLM và “fast-path” trả lời 1 trường:
  - `detect_product_field_intent()`: nhận diện intent hỏi price/weight/origin/brand/flavor/url...
  - `format_documents_for_llm()`: format context cho route `product` thành block dễ đọc.
  - `try_field_answer()`: trả lời deterministic dựa vào metadata (giảm bịa + giảm latency).
  - `format_user_context()`: format user_context (cart/order) để thêm vào system prompt nếu có.

## Config

### `src/agentic_rag/config/settings.py`
- Đọc env:
  - `PGVECTOR_CONNECTION`, `PGVECTOR_COLLECTION`
  - `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL`
  - `CHAT_TRIM_MAX_TOKENS`, `CHAT_HISTORY_MAX_TURNS`
  - `ENABLE_REFLECTION`, `REFLECTION_MAX_ITERATIONS`

### `src/agentic_rag/config/routes.py`
- Load `config/routes.yaml` (hoặc `.example`), cho router mapping `route_id` → retriever name + system prompt key.

### `src/agentic_rag/config/prompts.py`
- Load `config/prompts.yaml` (hoặc `.example`):
  - `get_prompt(key)`: system prompt theo route.
  - `get_router_instruction()`: instruction cho router LLM.
  - `get_reflection_instruction()`: instruction cho reflect critique.

## Schemas

### `src/agentic_rag/schemas/chat.py`
- Pydantic models cho HTTP:
  - `ChatRequest`: `message`, `thread_id`, `user_id`, `user_context`.
  - `ChatResponse`: `answer`, `route_id`, `products`, `history`, `product_field`, `latency_ms`, `token_usage` (admin), `timings_ms` (admin).

### `src/agentic_rag/schemas/products.py`
- `ProductItem`: payload sản phẩm trả về cho UI.

## Data / ingestion

### `scripts/ingest_pgvector.py`
- Script nạp JSON → PGVector:
  - Đọc `data/products.json` và `data/faq_policy.json`
  - Convert mỗi record → `Document(page_content, metadata)`
  - `PGVECTOR_CONNECTION` + `PGVECTOR_COLLECTION` xác định đích nạp.
- Mục tiêu: đảm bảo metadata đầy đủ (price/weight/origin/brand/flavor/serving...) để chatbot trả lời “không bịa”.

