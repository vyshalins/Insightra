"""Tests for review insights pipeline."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

import services.insights.recommendations as rec_mod
from models.schema import ReviewRecord
from services.insights.bucketing import split_windows
from services.insights.pipeline import analyze_insights
from services.insights.trends import build_trend_results


def _review(text: str, days_ago: float, rid: str) -> ReviewRecord:
    ts = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return ReviewRecord(
        review_id=rid,
        text=text,
        source="test",
        timestamp=ts,
        product_id="p1",
        original_text=text,
        detected_language="en",
        translated=False,
    )


def test_split_windows_two_full_buckets() -> None:
    rows = [_review("ok", float(100 - i), f"r{i}") for i in range(100)]
    prev, curr = split_windows(rows, 50)
    assert len(prev) == 50
    assert len(curr) == 50


def test_build_trend_spike_packaging() -> None:
    prev_rates = {"packaging": 0.08, "delivery": 0.1}
    curr_rates = {"packaging": 0.38, "delivery": 0.1}
    # Only full lexicon in build_trend_results - pass through pipeline rates from features module
    from services.insights.features import FEATURE_LEXICON

    pr = {f: prev_rates.get(f, 0.0) for f in FEATURE_LEXICON}
    cr = {f: curr_rates.get(f, 0.0) for f in FEATURE_LEXICON}
    trends = build_trend_results(pr, cr, "none")
    pack = next(t for t in trends if t.feature == "packaging")
    assert pack.delta > 0.2
    assert pack.trend == "spike"
    assert pack.classification == "systemic"


def test_analyze_insights_urgency_and_bias() -> None:
    older = [
        _review("delivery was fine packaging ok", 100 + i, f"o{i}") for i in range(30)
    ]
    newer = [
        _review("packaging damaged box crushed terrible packaging", 10 + i, f"n{i}") for i in range(30)
    ]
    reviews = older + newer
    with patch.dict("os.environ", {"INSIGHTS_USE_FAKE": "0", "INSIGHTS_WINDOW_SIZE": "25"}, clear=False):
        out = analyze_insights(reviews)
    assert out.meta.current_window_size >= 1
    assert out.urgency_score >= 0.0
    assert out.urgency_level in ("low", "medium", "high")
    assert isinstance(out.bias.raw_sentiment, float)
    assert isinstance(out.bias.adjusted_sentiment, float)
    assert out.recommendations


def test_recommendations_fallback_without_groq() -> None:
    with patch.object(rec_mod, "_get_groq_client", return_value=None):
        recs = rec_mod.generate_recommendations(
            {"urgency_score": 40.0},
            [("packaging", "spike", "systemic"), ("delivery", "stable", "noise")],
        )
    assert len(recs) >= 1
    assert any("packaging" in r.lower() for r in recs)


def test_recommendations_groq_json() -> None:
    mock_client = MagicMock()
    msg = MagicMock()
    msg.content = '{"recommendations":["Fix packaging supplier","Improve delivery comms"]}'
    mock_client.chat.completions.create.return_value = MagicMock(choices=[MagicMock(message=msg)])
    with patch.object(rec_mod, "_get_groq_client", return_value=mock_client):
        recs = rec_mod.generate_recommendations({"urgency_score": 90.0}, [])
    assert len(recs) == 2
    assert mock_client.chat.completions.create.called
