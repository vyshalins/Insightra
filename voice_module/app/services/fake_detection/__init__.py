"""Hybrid fake-review detection: rules + optional ML + optional SBERT."""

from services.fake_detection.pipeline import analyze_reviews

__all__ = ["analyze_reviews"]
