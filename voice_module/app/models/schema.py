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
