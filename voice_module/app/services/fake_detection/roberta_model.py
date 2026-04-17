"""Optional RoBERTa (or HF sequence classifier) inference — lazy-loaded."""

from __future__ import annotations

import os
from typing import Any

_MODEL: Any = None
_TOKENIZER: Any = None
_MODEL_ID: str | None = None


def _ml_enabled() -> bool:
    return os.getenv("FAKE_DETECT_ENABLE_ML", "").strip() == "1"


def _model_id() -> str:
    return os.getenv("FAKE_ROBERTA_MODEL_ID", "roberta-base").strip() or "roberta-base"


def _load_model() -> tuple[Any, Any]:
    global _MODEL, _TOKENIZER, _MODEL_ID
    mid = _model_id()
    if _MODEL is not None and _TOKENIZER is not None and _MODEL_ID == mid:
        return _TOKENIZER, _MODEL

    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(mid)
    model = AutoModelForSequenceClassification.from_pretrained(mid)
    model.eval()
    _TOKENIZER = tokenizer
    _MODEL = model
    _MODEL_ID = mid
    return tokenizer, model


def predict_fake_probabilities(texts: list[str]) -> list[float | None]:
    """
    Return per-text fake probability in [0, 1], or None on failure / disabled.

    Assumes binary classification with logits index 1 = fake (common convention).
    If num_labels != 2, uses softmax max as a weak proxy.
    """
    if not _ml_enabled() or not texts:
        return [None] * len(texts)

    try:
        import torch
        from torch.nn.functional import softmax

        tokenizer, model = _load_model()
        max_len = int(os.getenv("FAKE_ROBERTA_MAX_LENGTH", "256"))
        batch_size = int(os.getenv("FAKE_ROBERTA_BATCH_SIZE", "8"))
        out: list[float | None] = []

        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            enc = tokenizer(
                batch,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=max_len,
            )
            with torch.no_grad():
                logits = model(**enc).logits
            probs = softmax(logits, dim=-1)
            n_labels = probs.shape[-1]
            for i in range(probs.shape[0]):
                if n_labels >= 2:
                    # Prefer class index 1 as "fake"
                    fake_p = float(probs[i, 1].item()) if n_labels > 1 else float(probs[i, 0].item())
                else:
                    fake_p = float(probs[i, 0].item())
                out.append(fake_p)
        return out
    except Exception:
        return [None] * len(texts)
