"""Tests for hybrid fake review detection (rules + fusion + API)."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from models.schema import ReviewRecord
from routes.upload import router as upload_router
from services.fake_detection import fusion
from services.fake_detection.pipeline import analyze_reviews
from services.fake_detection.rules import compute_rule_score_and_signals


@pytest.fixture()
def upload_client() -> TestClient:
    app = FastAPI()
    app.include_router(upload_router)
    return TestClient(app)


def _review(text: str, rid: str = "r1") -> ReviewRecord:
    return ReviewRecord(
        review_id=rid,
        text=text,
        source="test",
        timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
        product_id="p1",
        original_text=text,
        detected_language="en",
        translated=False,
    )


def test_rules_flag_very_short() -> None:
    score, signals = compute_rule_score_and_signals("hi there", original_text=None)
    assert "very_short_text" in signals
    assert score > 0


def test_rules_repetition() -> None:
    score, signals = compute_rule_score_and_signals(
        "good good good good quality product here",
        original_text=None,
    )
    assert "repeated_tokens" in signals or "low_lexical_diversity" in signals
    assert score > 0.1


def test_fusion_without_ml() -> None:
    with patch.dict(os.environ, {"FAKE_FUSION_W_ML": "0.7", "FAKE_FUSION_W_RULES": "0.3"}, clear=False):
        fused = fusion.fuse_scores(None, 0.5)
    assert abs(fused - 0.5) < 1e-6


def test_decide_threshold() -> None:
    with patch.dict(os.environ, {"FAKE_THRESHOLD": "0.5"}, clear=False):
        assert fusion.decide(0.51).is_fake is True
        assert fusion.decide(0.5).is_fake is False


@patch("services.fake_detection.pipeline.predict_fake_probabilities")
@patch("services.fake_detection.pipeline.batch_near_duplicate_flags")
def test_pipeline_rules_only(mock_sim: object, mock_ml: object) -> None:
    mock_ml.return_value = [None]
    mock_sim.return_value = [False]
    rec = _review("nice product great quality highly recommend best ever")
    out = analyze_reviews([rec])
    assert len(out) == 1
    assert out[0].review_id == rec.review_id
    assert len(out[0].fake_signals) >= 1
    assert out[0].ml_fake_prob is None
    assert out[0].explanation


def test_analyze_fakes_endpoint(upload_client: TestClient) -> None:
    body = {
        "reviews": [
            {
                "review_id": "a1",
                "text": "nice product good quality",
                "source": "manual",
                "timestamp": "2024-01-01T00:00:00Z",
                "product_id": "x",
                "original_text": None,
                "detected_language": "en",
                "translated": False,
            }
        ]
    }
    r = upload_client.post("/upload/analyze-fakes", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert len(data["results"]) == 1
    assert "review_id" in data["results"][0]


def test_analyze_fakes_validation(upload_client: TestClient) -> None:
    r = upload_client.post("/upload/analyze-fakes", json={})
    assert r.status_code == 422


def test_analyze_fakes_via_session_id(upload_client: TestClient) -> None:
    import io

    raw = b"text,product_id\nspam spam spam spam here,p1\n"
    up = upload_client.post(
        "/upload/csv",
        files={"file": ("t.csv", io.BytesIO(raw), "text/csv")},
    )
    assert up.status_code == 200
    sid = up.json()["session_id"]
    r = upload_client.post("/upload/analyze-fakes", json={"session_id": sid})
    assert r.status_code == 200
    assert r.json()["count"] >= 1
