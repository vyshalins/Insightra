"""Per-review polarity and window-level aggregates (TextBlob)."""

from __future__ import annotations

from models.schema import ReviewRecord


def _polarity(text: str) -> float:
    try:
        from textblob import TextBlob  # type: ignore[import-not-found]

        return float(TextBlob(text).sentiment.polarity)
    except Exception:
        return 0.0


def mean_polarity(reviews: list[ReviewRecord]) -> float:
    if not reviews:
        return 0.0
    return sum(_polarity(r.text) for r in reviews) / len(reviews)


def negative_fraction(reviews: list[ReviewRecord], threshold: float = -0.05) -> float:
    """Share of reviews with polarity below threshold (approx. negative tone)."""
    if not reviews:
        return 0.0
    n = sum(1 for r in reviews if _polarity(r.text) < threshold)
    return n / len(reviews)
