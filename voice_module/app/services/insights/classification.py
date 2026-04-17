"""Trend direction and severity from delta magnitude (percentage points)."""

from __future__ import annotations


def classify_delta_pp(abs_delta_pp: float) -> str:
    """Classify |delta| expressed in percentage points (0-100 scale)."""
    if abs_delta_pp < 5.0:
        return "noise"
    if abs_delta_pp <= 20.0:
        return "emerging"
    return "systemic"


def trend_direction(delta: float, eps: float = 0.005) -> str:
    """Label rate-of-change direction (rates are 0-1 fractions)."""
    if delta > eps:
        return "spike"
    if delta < -eps:
        return "drop"
    return "stable"


def classification_to_severity(clf: str) -> str:
    return {"noise": "low", "emerging": "medium", "systemic": "high"}.get(clf, "low")
