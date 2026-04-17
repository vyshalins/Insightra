"""Bayesian-style sentiment shrinkage and volume weighting."""

from __future__ import annotations

import os


def shrink_mean(raw_mean: float, n: int, *, prior: float = 0.0, strength: int | None = None) -> float:
    """Pull raw mean toward prior; higher strength = more shrinkage."""
    if strength is None:
        raw = os.getenv("INSIGHTS_BIAS_STRENGTH", "12")
        try:
            strength = max(1, int(raw))
        except ValueError:
            strength = 12
    if n <= 0:
        return prior
    return (strength * prior + n * raw_mean) / (strength + n)


def volume_weight(n: int, *, min_full: int | None = None) -> float:
    raw = os.getenv("INSIGHTS_MIN_VOLUME_FOR_FULL_WEIGHT", "30")
    try:
        min_full = min_full or max(1, int(raw))
    except ValueError:
        min_full = 30
    return max(0.0, min(1.0, n / min_full))
