"""Upload endpoints: CSV, JSON, manual text."""

from __future__ import annotations

import os

import pandas as pd
from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel, Field, model_validator

from mlflow_tracker import tracker
from models.schema import (
    FakeBatchResponse,
    IngestionResponse,
    InsightsResponse,
    ReviewRecord,
)
from services.chunking import (
    DEFAULT_CHUNK_SIZE,
    create_session_and_process_first_chunk,
    get_session,
    process_next_chunk,
)
from services.fake_detection.pipeline import analyze_reviews
from services.insights.pipeline import analyze_insights
from services.normalizer import normalize_dataframe
from services.parser import parse_csv, parse_json, parse_manual

router = APIRouter(prefix="/upload", tags=["ingestion"])


class NextChunkBody(BaseModel):
    session_id: str
    chunk_size: int | None = Field(default=None, ge=1, le=5000)


class ReviewBatchRequest(BaseModel):
    """Inline reviews from a prior ingestion response, or a chunk session id."""

    reviews: list[ReviewRecord] | None = None
    session_id: str | None = None

    @model_validator(mode="after")
    def require_input(self) -> ReviewBatchRequest:
        has_reviews = bool(self.reviews)
        has_session = bool(self.session_id and str(self.session_id).strip())
        if not has_reviews and not has_session:
            raise ValueError("Provide non-empty `reviews` or a `session_id`.")
        return self


# Backwards-compatible alias for callers / OpenAPI generators.
FakeAnalyzeRequest = ReviewBatchRequest


def _resolve_reviews_batch(body: ReviewBatchRequest, max_rows: int) -> list[ReviewRecord]:
    if body.reviews:
        if len(body.reviews) > max_rows:
            return list(body.reviews)[:max_rows]
        return list(body.reviews)
    sid = str(body.session_id).strip()
    session = get_session(sid)
    df = pd.DataFrame(session.rows)
    if len(df) > max_rows:
        df = df.iloc[:max_rows].copy()
    reviews, _ = normalize_dataframe(df, source=session.source, dedupe=False)
    return reviews


@router.post("/analyze-fakes", response_model=FakeBatchResponse)
async def analyze_fakes(body: ReviewBatchRequest) -> FakeBatchResponse:
    """Hybrid fake review scores (rules + optional RoBERTa + optional SBERT)."""
    max_rows = int(os.getenv("FAKE_ANALYZE_MAX_ROWS", "2000"))
    reviews = _resolve_reviews_batch(body, max_rows)
    with tracker.run(
        run_name="fake_detection_run",
        tags={"pipeline": "fake_detection", "source": body.session_id or "inline"},
    ):
        tracker.log_param("model_type", "rule_based+roberta+sbert")
        tracker.log_param("dataset_size", len(reviews))
        results = analyze_reviews(reviews)
    return FakeBatchResponse(results=results, count=len(results))


@router.post("/analyze-insights", response_model=InsightsResponse)
async def analyze_insights_route(body: ReviewBatchRequest) -> InsightsResponse:
    """Trends, urgency, bias-adjusted sentiment, and recommendations across time windows."""
    max_rows = int(os.getenv("INSIGHTS_MAX_ROWS", "2000"))
    reviews = _resolve_reviews_batch(body, max_rows)
    with tracker.run(
        run_name="insights_analysis_run",
        tags={"pipeline": "insights", "source": body.session_id or "inline"},
    ):
        response = analyze_insights(reviews)
    return response


@router.post("/csv", response_model=IngestionResponse)
async def upload_csv(file: UploadFile = File(...)) -> IngestionResponse:
    raw = await file.read()
    df = parse_csv(raw)
    return create_session_and_process_first_chunk(
        df, source="csv", chunk_size=DEFAULT_CHUNK_SIZE
    )


@router.post("/json", response_model=IngestionResponse)
async def upload_json(file: UploadFile = File(...)) -> IngestionResponse:
    raw = await file.read()
    df = parse_json(raw)
    return create_session_and_process_first_chunk(
        df, source="json", chunk_size=DEFAULT_CHUNK_SIZE
    )


@router.post("/manual", response_model=IngestionResponse)
async def upload_manual(text: str = Form(...)) -> IngestionResponse:
    df = parse_manual(text)
    return create_session_and_process_first_chunk(
        df, source="manual", chunk_size=DEFAULT_CHUNK_SIZE
    )


@router.post("/chunk/next", response_model=IngestionResponse)
async def upload_next_chunk(body: NextChunkBody) -> IngestionResponse:
    return process_next_chunk(body.session_id, chunk_size=body.chunk_size)
