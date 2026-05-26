"""Patch rag.ipynb: hybrid search, RRF, integrated graph, product schema."""

import json
from pathlib import Path

NOTEBOOK = Path(__file__).resolve().parents[1] / "venv/etc/jupyter/nbconfig/notebook.d/rag.ipynb"

RRF_CODE = '''def reciprocal_rank_fusion(results: list[list], k=60, top_n=10):
    """Reciprocal Rank Fusion — gộp nhiều danh sách doc đã xếp hạng."""
    import hashlib
    scores = {}
    by_key = {}
    for result_list in results:
        for rank, doc in enumerate(result_list):
            key = doc.metadata.get("id") or hashlib.md5(doc.page_content.encode()).hexdigest()
            by_key[key] = doc
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank + 1)
    ordered = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
    return [by_key[key] for key in ordered[:top_n]]
'''

HYBRID_MD = """-10.3 Hybrid Search (BM25 + PGVector + RRF)
Chạy song song BM25 (khớp từ khóa: SKU, tên SP) và PGVector (ngữ nghĩa), hợp nhất bằng RRF.
Dùng khi câu hỏi mơ hồ / typo; bổ sung cho Self-Query (lọc metadata)."""

PATH_BOOTSTRAP = '''import sys
from pathlib import Path
_root = Path(r"c:/Users/Admin/RAG_langchain_project")
_src = _root / "src"
for _p in (_src, _root):
    if _p.is_dir() and str(_p) not in sys.path:
        sys.path.insert(0, str(_p))
'''

HYBRID_CODE = PATH_BOOTSTRAP + '''
from langchain_community.retrievers import BM25Retriever
from agentic_rag.retrieval import reciprocal_rank_fusion, hybrid_retrieve

# documents: list[Document] đã chunk từ pipeline -10
bm25_retriever = BM25Retriever.from_documents(documents)
bm25_retriever.k = 6

vector_retriever = db.as_retriever(search_kwargs={"k": 6})

def hybrid_search(query: str, top_n: int = 8):
    return hybrid_retrieve(query, bm25_retriever, vector_retriever, top_n=top_n)

# hybrid_search("Whey isolate 2kg giá dưới 2 triệu")
'''

INTEGRATED_MD = """## Pipeline tích hợp (Layer 1→5)
StateGraph end-to-end: memory trim → route → retrieve → generate → reflect (max 3) → JSON products.
Chạy API production: `uvicorn agentic_rag.api.main:app` (xem SETUP.md + docker-compose)."""

INTEGRATED_CODE = PATH_BOOTSTRAP + '''
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings

from agentic_rag.core.graph import build_chat_graph
from agentic_rag.config.settings import (
    OPENAI_EMBEDDING_MODEL,
    REFLECTION_MAX_ITERATIONS,
    CHAT_TRIM_MAX_TOKENS,
)
from agentic_rag.llm import create_chat_model
from agentic_rag.schemas.products import ProductItem
from agentic_rag.retrieval import document_to_product, postprocess_product_docs

print(f"Reflection max iterations: {REFLECTION_MAX_ITERATIONS}, trim max_tokens: {CHAT_TRIM_MAX_TOKENS}")

demo_docs = [
    Document(
        page_content="Whey Isolate hỗ trợ cơ, 45g protein mỗi liều.",
        metadata={
            "id": "p1", "name": "Whey Isolate", "price": 1890000, "weight": 2270,
            "origin": "USA", "brand": "ProFit",
            "image_url": "https://example.com/img/whey.jpg",
            "product_url": "https://example.com/san-pham/whey-isolate",
        },
    ),
]
store = InMemoryVectorStore(OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL))
store.add_documents(demo_docs)
retriever = store.as_retriever(search_kwargs={"k": 4})

graph = build_chat_graph(
    retrievers={{
        "nutrition": retriever,
        "shipping": retriever,
        "product": retriever,
        "general": retriever,
    }},
    model=create_chat_model(temperature=0.2),
)

config = {"configurable": {"thread_id": "demo-thread"}}
out = graph.invoke(
    {"messages": [], "user_query": "Gợi ý whey tầm 2 triệu", "reflection_count": 0},
    config=config,
)
products = [document_to_product(d) for d in out.get("documents", [])]
print("domain:", out.get("domain"))
print("answer:", out.get("final_answer") or out.get("draft_answer"))
print("products:", [p.model_dump() for p in products])
'''

PRODUCT_FIELDS_SNIPPET = '''    AttributeInfo(
        name="image_url",
        description="URL ảnh sản phẩm (thumbnail)",
        type="string",
    ),
    AttributeInfo(
        name="product_url",
        description="URL trang chi tiết sản phẩm",
        type="string",
    ),
'''

STRUCTURED_PRODUCT_CODE = PATH_BOOTSTRAP + '''
from agentic_rag.retrieval import document_to_product, postprocess_product_docs
from agentic_rag.schemas.products import ProductItem

def products_json_from_query(input_user: str) -> list[dict]:
    docs = postprocess_product_docs(retriever.invoke(input_user))
    return [document_to_product(d).model_dump() for d in docs]
'''


def make_cell(cell_type: str, source: str, cell_id: str | None = None):
    import uuid
    return {
        "cell_type": cell_type,
        "id": cell_id or str(uuid.uuid4())[:8],
        "metadata": {},
        "source": source if isinstance(source, list) else source.splitlines(keepends=True),
    }


def patch():
    nb = json.loads(NOTEBOOK.read_text(encoding="utf-8"))
    cells = nb["cells"]

    # Fix RRF in RAG fusion cell (~index 13)
    for i, c in enumerate(cells):
        src = "".join(c.get("source", []))
        if "def reciprocal_rank_fusion" in src and "# ... logic" in src:
            lines = src.splitlines(keepends=True)
            new_lines = []
            skip = False
            for line in lines:
                if line.strip().startswith("def reciprocal_rank_fusion"):
                    new_lines.append(RRF_CODE)
                    skip = True
                    continue
                if skip:
                    if line.strip().startswith("retrieval_chain"):
                        skip = False
                        new_lines.append(line)
                    continue
                new_lines.append(line)
            cells[i]["source"] = new_lines
            print(f"Patched RRF at cell {i}")

    # Insert hybrid after MultiVector block (after cell 8 code = index 8)
    insert_at = 9
    if not any("-10.3 Hybrid" in "".join(c.get("source", [])) for c in cells):
        cells.insert(insert_at, make_cell("markdown", HYBRID_MD))
        cells.insert(insert_at + 1, make_cell("code", HYBRID_CODE))
        print("Inserted hybrid cells at", insert_at)

    # Product schema: add image_url, product_url to fields cell
    for i, c in enumerate(cells):
        src = "".join(c.get("source", []))
        if "SelfQueryRetriever.from_llm" in src and "image_url" not in src:
            src = src.replace(
                '        name="brand",\n        description="Thương hiệu sản phẩm",\n        type="string",\n    ),\n]',
                '        name="brand",\n        description="Thương hiệu sản phẩm",\n        type="string",\n    ),\n' + PRODUCT_FIELDS_SNIPPET + "\n]",
            )
            cells[i]["source"] = src.splitlines(keepends=True)
            print(f"Patched product fields at cell {i}")

    # Post-process cell: add structured export after formatters
    for i, c in enumerate(cells):
        src = "".join(c.get("source", []))
        if "def get_custom_products" in src and "products_json_from_query" not in src:
            cells.insert(i + 1, make_cell("code", STRUCTURED_PRODUCT_CODE))
            print("Inserted ProductItem export after cell", i)
            break

    # MultiVector: PGByteStore comment -> code hint
    for i, c in enumerate(cells):
        src = "".join(c.get("source", []))
        if "#store  #sửa lại thành lưu trong PGByteStore" in src:
            src = src.replace(
                "#store  #sửa lại thành lưu trong PGByteStore",
                "# Production: from langchain_postgres import PGByteStore\n"
                "# store = PGByteStore(connection=connection)\n"
                "from langchain.storage import InMemoryStore\n"
                "store = InMemoryStore()  # dev; thay PGByteStore khi deploy",
            )
            cells[i]["source"] = src.splitlines(keepends=True)
            print(f"Patched PGByteStore hint at cell {i}")

    # Append integrated pipeline at end
    if not any("Pipeline tích hợp" in "".join(c.get("source", [])) for c in cells):
        cells.append(make_cell("markdown", INTEGRATED_MD))
        cells.append(make_cell("code", INTEGRATED_CODE))
        print("Appended integrated graph cells")

    nb["cells"] = cells
    NOTEBOOK.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Done:", NOTEBOOK)


if __name__ == "__main__":
    patch()
