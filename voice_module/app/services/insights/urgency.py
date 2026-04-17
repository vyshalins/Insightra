"""Global urgency score and per-feature urgency items."""

from __future__ import annotations

import os

from models.schema import TrendFeatureResult, UrgencyItem
from services.insights.classification import classification_to_severity


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


def _normalize_weights(w1: float, w2: float, w3: float) -> tuple[float, float, float]:
    s = w1 + w2 + w3
    if s <= 0:
        return 0.4, 0.4, 0.2
    return w1 / s, w2 / s, w3 / s


def compute_global_urgency_score(
    neg_sentiment_frac: float,
    max_abs_delta: float,
    fake_rate: float,
) -> float:
    """
    Map components to 0-100 scale and fuse.

    neg_sentiment_frac: 0-1
    max_abs_delta: max |delta| across features (0-1 rate delta)
    fake_rate: 0-1
    """
    w1, w2, w3 = _normalize_weights(
        _env_float("INSIGHTS_WEIGHT_NEG_SENTIMENT", 0.4),
        _env_float("INSIGHTS_WEIGHT_TREND", 0.4),
        _env_float("INSIGHTS_WEIGHT_FAKE", 0.2),
    )
    neg_component = neg_sentiment_frac * 100.0
    trend_component = min(100.0, max_abs_delta * 100.0)
    fake_component = fake_rate * 100.0
    return max(0.0, min(100.0, w1 * neg_component + w2 * trend_component + w3 * fake_component))


def urgency_level_from_score(score: float) -> str:
    if score > 80.0:
        return "high"
    if score >= 50.0:
        return "medium"
    return "low"


def build_urgency_items(trends: list[TrendFeatureResult], top_k: int = 6) -> list[UrgencyItem]:
    """Top features by |delta| with rule-based actions."""
    ranked = sorted(trends, key=lambda t: abs(t.delta), reverse=True)[:top_k]
    items: list[UrgencyItem] = []
    for t in ranked:
        sev = classification_to_severity(t.classification)
        score_feat = min(100.0, abs(t.delta) * 100.0 * 2.0 + (30.0 if t.classification == "systemic" else 0.0))
        if sev == "high":
            u = "high"
        elif sev == "medium":
            u = "medium"
        else:
            u = "low"
        action = _action_for_feature(t.feature, t.trend, t.classification)
        items.append(
            UrgencyItem(
                feature=t.feature,
                urgency=u,
                score=round(score_feat, 2),
                action=action,
            )
        )
    return items


def _action_for_feature(feature: str, trend: str, classification: str) -> str:
    if classification == "systemic":
        return f"Prioritize investigation of {feature} (sustained shift in recent reviews)."
    if classification == "emerging":
        return f"Monitor {feature} closely; trend is {trend}."
    return f"Watch {feature}; change looks like noise-level fluctuation."
