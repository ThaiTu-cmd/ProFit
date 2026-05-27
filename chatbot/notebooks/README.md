# Lab notebook

Production code lives under `src/agentic_rag/`.

The integrated lab notebook is kept at:

`venv/etc/jupyter/nbconfig/notebook.d/rag.ipynb`

It exercises the same techniques (hybrid BM25+vector, RRF, Self-Query, LangGraph, reflection) and imports via the `api/` compatibility shims (which forward to `agentic_rag`).

To patch notebook cells from production modules:

```powershell
python scripts/patch_rag_notebook.py
python scripts/fix_notebook_integrated.py
```
