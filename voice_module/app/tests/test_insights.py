"""Tests for review insights pipeline."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

import services.insights.absa as absa_mod
import services.insights.recommendations as rec_mod
from models.schema import ReviewRecord
from services.insights.absa import build_aspect_sentiment_windows
from services.insights.bucketing import split_windows
from services.insights.pipeline import analyze_insights
from services.insights.trends import build_trend_results


def _review(text: str, days_ago: float, rid: str, **kwargs: object) -> ReviewRecord:
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
        **kwargs,
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


def test_analyze_insights_includes_aspect_sentiment() -> None:
    def _fake_pol(sentence: str) -> float:
        low = sentence.lower()
        if "battery" in low and "hate" not in low:
            return 0.72
        if "delivery" in low:
            return -0.68
        return 0.05

    older = [_review("delivery was on time and packaging was fine.", 100.0 + float(i), f"o{i}") for i in range(4)]
    newer = [
        _review(
            "I love the battery performance. I hate the delivery experience.",
            1.0,
            "n0",
        )
    ]
    reviews = older + newer
    with patch.object(absa_mod, "_sentence_polarity", side_effect=_fake_pol):
        with patch.dict("os.environ", {"INSIGHTS_USE_FAKE": "0", "INSIGHTS_WINDOW_SIZE": "50"}, clear=False):
            out = analyze_insights(reviews)
    assert out.aspect_sentiment is not None
    curr = {r.feature: r for r in out.aspect_sentiment.current}
    assert "battery" in curr and curr["battery"].sample_count >= 1
    assert "delivery" in curr and curr["delivery"].sample_count >= 1
    assert curr["battery"].mean_polarity > curr["delivery"].mean_polarity


def test_aspect_sentiment_skips_ambiguous_when_enabled() -> None:
    prev = [_review("battery is good", 50.0, "p1")]
    curr = [
        _review("battery is bad", 1.0, "c1", preprocess_ambiguous=True),
        _review("battery is excellent", 1.0, "c2"),
    ]
    with patch.dict("os.environ", {"INSIGHTS_ABSA_SKIP_AMBIGUOUS": "1"}, clear=False):
        win = build_aspect_sentiment_windows(prev, curr)
    assert win.excluded_ambiguous_count >= 1
    bat = next(x for x in win.current if x.feature == "battery")
    assert bat.sample_count >= 1


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
    assert out.aspect_sentiment is not None
    assert isinstance(out.aspect_sentiment.current, list)


def test_recommendations_fallback_without_groq() -> None:
    with patch.object(rec_mod, "_get_groq_client", return_value=None):
        recs = rec_mod.generate_recommendations(
            {"urgency_score": 40.0},
            [("packaging", "spike", "systemic"), ("delivery", "stable", "noise")],
        )
    assert len(recs) >= 1
    assert any("packaging" in r.lower() for r in recs)


def test_absa_groq_batch_sets_groq_refined() -> None:
    prev = [_review("battery good", 50.0, "p1")]
    curr = [_review("battery bad and delivery late", 1.0, "c1")]
    mock_client = MagicMock()
    msg = MagicMock()
    msg.content = (
        '{"results":[{"review_id":"c1","aspects":['
        '{"feature":"battery","sentiment":"negative","confidence":0.9},'
        '{"feature":"delivery","sentiment":"negative","confidence":0.85}'
        "]}]}"
    )
    mock_client.chat.completions.create.return_value = MagicMock(choices=[MagicMock(message=msg)])
    with patch.object(absa_mod, "_get_groq_client", return_value=mock_client):
        with patch.dict(
            "os.environ",
            {"INSIGHTS_ABSA_GROQ": "1", "INSIGHTS_ABSA_SKIP_AMBIGUOUS": "0"},
            clear=False,
        ):
            win = build_aspect_sentiment_windows(prev, curr)
    assert win.groq_refined is True
    assert mock_client.chat.completions.create.called
    feats = {x.feature: x for x in win.current}
    assert "battery" in feats


def test_recommendations_groq_json() -> None:
    mock_client = MagicMock()
    msg = MagicMock()
    msg.content = '{"recommendations":["Fix packaging supplier","Improve delivery comms"]}'
    mock_client.chat.completions.create.return_value = MagicMock(choices=[MagicMock(message=msg)])
    with patch.object(rec_mod, "_get_groq_client", return_value=mock_client):
        recs = rec_mod.generate_recommendations({"urgency_score": 90.0}, [])
    assert len(recs) == 2
    assert mock_client.chat.completions.create.called
