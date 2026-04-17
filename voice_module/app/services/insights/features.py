"""Lexicon-based feature buckets for review text."""

from __future__ import annotations

from models.schema import ReviewRecord

# Keywords per theme (lowercase substring match).
FEATURE_LEXICON: dict[str, tuple[str, ...]] = {
    "packaging": ("packaging", "box", "damaged box", "crushed", "outer box", "bubble wrap"),
    "delivery": ("delivery", "shipping", "late", "courier", "logistics", "arrived late", "tracking"),
    "quality": ("quality", "defective", "broken", "poor quality", "cheap feel", "malfunction"),
    "battery": ("battery", "charge", "runtime", "power drain", "dies quickly"),
    "price": ("price", "expensive", "overpriced", "value for money", "refund", "cost"),
    "service": ("service", "support", "customer service", "rude", "unhelpful", "response"),
}


def review_mentions_feature(text: str, feature: str) -> bool:
    t = text.lower()
    for kw in FEATURE_LEXICON.get(feature, ()):
        if kw in t:
            return True
    return False


def feature_hit_counts(reviews: list[ReviewRecord]) -> dict[str, int]:
    """Count reviews mentioning each feature (a review can hit multiple features)."""
    counts = {f: 0 for f in FEATURE_LEXICON}
    for rec in reviews:
        for feat in FEATURE_LEXICON:
            if review_mentions_feature(rec.text, feat):
                counts[feat] += 1
    return counts


def window_feature_rates(reviews: list[ReviewRecord]) -> dict[str, float]:
    """Fraction of reviews in window that mention each feature."""
    n = len(reviews)
    if n == 0:
        return {f: 0.0 for f in FEATURE_LEXICON}
    counts = feature_hit_counts(reviews)
    return {f: counts[f] / n for f in FEATURE_LEXICON}
