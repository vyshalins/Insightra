"""Fuse ML + rule scores with env-driven weights and threshold."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def fusion_weights(*, ml_available: bool) -> tuple[float, float]:
    """Return (w_ml, w_rules) normalized to sum to 1 when both active."""
    w_ml = _env_float("FAKE_FUSION_W_ML", 0.7)
    w_rules = _env_float("FAKE_FUSION_W_RULES", 0.3)
    if not ml_available:
        return 0.0, 1.0
    total = w_ml + w_rules
    if total <= 0:
        return 0.0, 1.0
    return w_ml / total, w_rules / total


def fuse_scores(ml_prob: float | None, rule_score: float) -> float:
    """Weighted fusion in [0, 1]."""
    ml_available = ml_prob is not None
    w_ml, w_rules = fusion_weights(ml_available=ml_available)
    ml_part = (ml_prob if ml_prob is not None else 0.0) * w_ml
    rule_part = rule_score * w_rules
    return max(0.0, min(1.0, ml_part + rule_part))


def apply_similarity_boost(base_score: float, has_near_duplicate: bool) -> float:
    if not has_near_duplicate:
        return base_score
    boost = _env_float("FAKE_SIMILARITY_BOOST", 0.12)
    return max(0.0, min(1.0, base_score + boost))


def decision_threshold() -> float:
    return _env_float("FAKE_THRESHOLD", 0.6)


@dataclass(frozen=True)
class FinalDecision:
    is_fake: bool
    fake_confidence: float


def decide(score: float) -> FinalDecision:
    thr = decision_threshold()
    return FinalDecision(is_fake=score > thr, fake_confidence=score)
