import json
from pathlib import Path

NB = Path(__file__).resolve().parents[1] / "venv/etc/jupyter/nbconfig/notebook.d/rag.ipynb"
ROOT = Path(__file__).resolve().parents[1].as_posix()

NEW_CODE = f'''import sys
from pathlib import Path
_root = Path(r"{ROOT}")
_src = _root / "src"
for _p in (_src, _root):
    if _p.is_dir() and str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

# Cần OPENAI_API_KEY trong venv/.env trước khi chạy cell này
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
from agentic_rag.retrieval import document_to_product

print("reflection_max:", REFLECTION_MAX_ITERATIONS, "trim_tokens:", CHAT_TRIM_MAX_TOKENS)

demo_docs = [
    Document(
        page_content="Whey Isolate hỗ trợ cơ, 45g protein mỗi liều.",
        metadata={{
            "id": "p1", "name": "Whey Isolate", "price": 1890000, "weight": 2270,
            "origin": "USA", "brand": "ProFit",
            "image_url": "https://example.com/img/whey.jpg",
            "product_url": "https://example.com/san-pham/whey-isolate",
        }},
    ),
]
store = InMemoryVectorStore(OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL))
store.add_documents(demo_docs)
retriever = store.as_retriever(search_kwargs={{"k": 4}})

retrievers = {{
    "nutrition": retriever,
    "shipping": retriever,
    "product": retriever,
    "general": retriever,
}}

graph = build_chat_graph(retrievers=retrievers, model=create_chat_model(temperature=0.2))

config = {{"configurable": {{"thread_id": "demo-thread"}}}}
out = graph.invoke(
    {{"messages": [], "user_query": "Gợi ý whey tầm 2 triệu", "reflection_count": 0}},
    config=config,
)
print("route_id:", out.get("route_id"))
print("answer:", out.get("final_answer") or out.get("draft_answer"))
print("products:", [document_to_product(d).model_dump() for d in out.get("documents", [])])
'''

nb = json.loads(NB.read_text(encoding="utf-8"))
for c in nb["cells"]:
    if "build_chat_graph" in "".join(c.get("source", [])):
        c["source"] = NEW_CODE.splitlines(keepends=True)
        print("updated integrated cell")
        break
NB.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
