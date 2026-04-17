"""Optional SBERT batch similarity for near-duplicate / campaign detection."""

from __future__ import annotations

import os
from typing import Any

_MODEL: Any = None
_MODEL_NAME: str | None = None


def _sbert_enabled() -> bool:
    return os.getenv("FAKE_DETECT_ENABLE_SBERT", "").strip() == "1"


def _model_name() -> str:
    return (
        os.getenv("FAKE_SBERT_MODEL", "sentence-transformers/all-MiniLM-L6-v2").strip()
        or "sentence-transformers/all-MiniLM-L6-v2"
    )


def _load_sbert() -> Any:
    global _MODEL, _MODEL_NAME
    name = _model_name()
    if _MODEL is not None and _MODEL_NAME == name:
        return _MODEL
    from sentence_transformers import SentenceTransformer

    _MODEL = SentenceTransformer(name)
    _MODEL_NAME = name
    return _MODEL


def _threshold() -> float:
    raw = os.getenv("FAKE_SBERT_SIM_THRESHOLD", "0.92")
    try:
        return float(raw)
    except ValueError:
        return 0.92


def batch_near_duplicate_flags(
    texts: list[str],
    product_ids: list[str] | None = None,
) -> list[bool]:
    """
    For each review, True if cosine similarity to another review in the batch
    (optionally same product_id) exceeds threshold.
    """
    n = len(texts)
    if not _sbert_enabled() or n < 2:
        return [False] * n

    try:
        import numpy as np

        model = _load_sbert()
        embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        # Normalize for cosine similarity via dot product
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1e-12
        emb = embeddings / norms
        sim = emb @ emb.T
        thr = _threshold()
        flags = [False] * n
        pids = product_ids if product_ids and len(product_ids) == n else None

        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                if pids is not None and pids[i] != pids[j]:
                    continue
                if float(sim[i, j]) >= thr:
                    flags[i] = True
                    break
        return flags
    except Exception:
        return [False] * n
