"""Ingestion API and service tests (no Whisper import)."""

from __future__ import annotations

import io
import json
from unittest.mock import patch

import pandas as pd
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from routes.upload import router as upload_router
from routes.youtube import router as youtube_router
from services.normalizer import normalize_dataframe
from services.parser import parse_csv, parse_json, parse_manual


@pytest.fixture()
def ingestion_client() -> TestClient:
    app = FastAPI()
    app.include_router(upload_router)
    app.include_router(youtube_router)
    return TestClient(app)


def test_parse_csv_and_normalize() -> None:
    raw = b"text,product_id\nHello world,p1\n"
    df = parse_csv(raw)
    reviews, invalid = normalize_dataframe(df, source="csv")
    assert invalid == 0
    assert len(reviews) == 1
    assert reviews[0].text == "hello world"
    assert reviews[0].product_id == "p1"
    assert reviews[0].source == "csv"


def test_parse_csv_missing_text_column_raises() -> None:
    raw = b"foo,bar\n1,2\n"
    with pytest.raises(HTTPException) as exc_info:
        parse_csv(raw)
    assert exc_info.value.status_code == 400


def test_parse_manual() -> None:
    df = parse_manual("Line one\nLine two\n")
    reviews, invalid = normalize_dataframe(df, source="manual")
    assert invalid == 0
    assert len(reviews) == 2
    assert reviews[0].text == "line one"


def test_upload_csv_endpoint(ingestion_client: TestClient) -> None:
    csv_bytes = b"text,timestamp\nReview one,2024-01-01T00:00:00Z\n"
    response = ingestion_client.post(
        "/upload/csv",
        files={"file": ("reviews.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "csv"
    assert data["count"] == 1
    assert len(data["reviews"]) == 1
    assert data["reviews"][0]["text"] == "review one"


def test_upload_csv_empty_returns_400(ingestion_client: TestClient) -> None:
    response = ingestion_client.post(
        "/upload/csv",
        files={"file": ("empty.csv", io.BytesIO(b"   \n"), "text/csv")},
    )
    assert response.status_code == 400


def test_upload_json_endpoint(ingestion_client: TestClient) -> None:
    payload = [{"text": "Great product", "product_id": "x"}]
    response = ingestion_client.post(
        "/upload/json",
        files={
            "file": (
                "data.json",
                io.BytesIO(json.dumps(payload).encode("utf-8")),
                "application/json",
            )
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["reviews"][0]["text"] == "great product"


def test_upload_manual_endpoint(ingestion_client: TestClient) -> None:
    response = ingestion_client.post(
        "/upload/manual",
        data={"text": "One\nTwo\n"},
    )
    assert response.status_code == 200
    assert response.json()["count"] == 2


@patch("routes.youtube.get_youtube_comments")
def test_fetch_youtube_endpoint(
    mock_comments: pytest.Mock, ingestion_client: TestClient
) -> None:
    mock_comments.return_value = [
        {"text": "Nice video", "timestamp": "2024-01-01T00:00:00Z"},
    ]
    response = ingestion_client.post(
        "/fetch/youtube",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "youtube"
    assert data["count"] == 1
    assert "nice video" in data["reviews"][0]["text"]


def test_dedupe_normalize() -> None:
    df = pd.DataFrame(
        [
            {"text": "same", "timestamp": "2024-01-01T00:00:00Z"},
            {"text": "same", "timestamp": "2024-01-01T00:00:00Z"},
        ]
    )
    reviews, invalid = normalize_dataframe(df, source="csv")
    assert len(reviews) == 1
    assert invalid == 1
