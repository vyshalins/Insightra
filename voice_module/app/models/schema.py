"""Unified review schema and API response envelopes."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ReviewRecord(BaseModel):
    """Canonical shape for all ingested reviews."""

    review_id: str
    text: str
    source: str
    timestamp: datetime
    product_id: str = Field(default="unknown")
    original_text: str | None = Field(
        default=None, description="Raw review text before preprocessing"
    )
    detected_language: str | None = Field(
        default=None, description="Detected language code (ISO-like)"
    )
    translated: bool = Field(
        default=False, description="True when text was translated to English"
    )
    preprocess_sentiment: str | None = Field(
        default=None, description="Optional Groq context engine: positive | negative | neutral"
    )
    preprocess_sarcastic: bool | None = Field(
        default=None, description="Optional Groq context: likely sarcastic"
    )
    preprocess_ambiguous: bool | None = Field(
        default=None, description="Optional Groq context: ambiguous wording"
    )
    preprocess_meaning: str | None = Field(
        default=None, description="Optional Groq context: interpreted meaning in plain English"
    )
    preprocess_confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional Groq context confidence (calibrated with a simple clarity heuristic)",
    )
    verified_purchase: bool = Field(
        default=False,
        description="True when the reviewer is a confirmed buyer (e.g. Amazon Verified Purchase). "
                    "Used by the bias adjuster to derive a data-driven sentiment prior instead of "
                    "assuming neutral — corrects for the over-representation of unhappy reviewers.",
    )

    @field_validator("text", mode="before")
    @classmethod
    def strip_text(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("product_id", mode="before")
    @classmethod
    def empty_product_to_unknown(cls, v: Any) -> str:
        if v is None:
            return "unknown"
        s = str(v).strip()
        return s if s else "unknown"


class FakeReviewResult(BaseModel):
    """Per-review hybrid fake detection output."""

    review_id: str
    is_fake: bool
    fake_confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Fused score after rules, optional ML, and similarity boost",
    )
    rule_score: float = Field(ge=0.0, le=1.0)
    ml_fake_prob: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="RoBERTa / HF classifier fake probability when ML enabled",
    )
    fake_signals: list[str] = Field(default_factory=list)
    explanation: str = ""
    similarity_neighbor: bool = Field(
        default=False,
        description="True when SBERT finds a high-similarity neighbor in this batch",
    )


class FakeBatchResponse(BaseModel):
    """Response from POST /upload/analyze-fakes."""

    results: list[FakeReviewResult]
    count: int


class TrendFeatureResult(BaseModel):
    """Per-feature trend between two time windows."""

    feature: str
    prev_rate: float = Field(ge=0.0, le=1.0, description="Fraction of prev window mentioning feature")
    current_rate: float = Field(ge=0.0, le=1.0, description="Fraction of current window mentioning feature")
    delta: float = Field(description="current_rate - prev_rate (-1..1)")
    trend: str = Field(description="stable | spike | drop")
    classification: str = Field(description="noise | emerging | systemic (by |delta| in pp)")
    z_score: float | None = Field(default=None, description="Across-feature z-score of |delta| when enabled")


class UrgencyItem(BaseModel):
    """Per-feature urgency derived from trend magnitude."""

    feature: str
    urgency: str = Field(description="low | medium | high")
    score: float = Field(ge=0.0, le=100.0)
    action: str = ""


class BiasSummary(BaseModel):
    """Sentiment shrinkage and volume confidence."""

    raw_sentiment: float = Field(description="Mean polarity in current window (-1..1)")
    adjusted_sentiment: float = Field(description="Bayesian-shrunk mean; pulled toward verified-buyer prior")
    volume_weight: float = Field(ge=0.0, le=1.0, description="Reliability weight from sample size")
    verified_prior: float = Field(
        default=0.0,
        description="Prior used for shrinkage: mean sentiment of verified buyers, "
                    "or INSIGHTS_BIAS_NEUTRAL_PRIOR (default 0.0) when none exist.",
    )
    verified_count: int = Field(
        default=0,
        ge=0,
        description="Number of verified-purchase reviews that contributed to the prior.",
    )


class InsightsMeta(BaseModel):
    current_window_size: int = 0
    previous_window_size: int = 0
    total_input_reviews: int = 0
    anomaly_mode: str = "none"
    notes: str = ""


class AspectSentimentFeature(BaseModel):
    """Lexicon-matched aspect with sentence-level TextBlob polarity aggregate."""

    feature: str
    sentiment_label: str = Field(description="positive | negative | neutral (from mean polarity)")
    mean_polarity: float = Field(ge=-1.0, le=1.0, description="Mean sentence polarity for hits of this feature")
    sample_count: int = Field(ge=0, description="Number of sentence-level feature hits in window")
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Heuristic confidence; blended with Groq when INSIGHTS_ABSA_GROQ=1",
    )


class AspectSentimentWindows(BaseModel):
    """Aspect-based sentiment for previous vs current insight windows."""

    previous: list[AspectSentimentFeature] = Field(default_factory=list)
    current: list[AspectSentimentFeature] = Field(default_factory=list)
    groq_refined: bool = Field(
        default=False,
        description="True when optional Groq batch refined current-window aspect confidences",
    )
    excluded_ambiguous_count: int = Field(
        default=0,
        ge=0,
        description="Reviews skipped for ABSA when preprocess_ambiguous and skip flag is on",
    )


class InsightsResponse(BaseModel):
    """Trends, urgency, bias-adjusted sentiment, and recommendations."""

    trends: list[TrendFeatureResult]
    urgency_score: float = Field(ge=0.0, le=100.0, description="Global 0-100 urgency index")
    urgency_level: str = Field(description="low | medium | high")
    urgency_items: list[UrgencyItem] = Field(default_factory=list)
    bias: BiasSummary
    recommendations: list[str] = Field(default_factory=list)
    meta: InsightsMeta = Field(default_factory=InsightsMeta)
    aspect_sentiment: AspectSentimentWindows = Field(
        default_factory=AspectSentimentWindows,
        description="Sentence-level lexicon aspects with polarity; optional Groq refinement",
    )


class IngestionResponse(BaseModel):
    """Response after parsing + normalization."""

    reviews: list[ReviewRecord]
    source: str
    count: int
    invalid_rows: int = Field(
        default=0,
        description="Rows skipped (empty text after cleaning, duplicates, etc.)",
    )
    session_id: str | None = Field(
        default=None,
        description="Chunk-processing session id for loading remaining rows",
    )
    total_rows: int = Field(default=0, description="Total rows in uploaded dataset")
    processed_rows: int = Field(
        default=0, description="Rows processed so far in current chunk session"
    )
    remaining_rows: int = Field(
        default=0, description="Rows not processed yet in current chunk session"
    )
    chunk_size: int = Field(default=300, description="Chunk size used for processing")
    has_more: bool = Field(
        default=False, description="True when additional rows are available to process"
    )
