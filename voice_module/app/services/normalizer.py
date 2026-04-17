"""Normalize parsed rows into unified review records."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import pandas as pd

from models.schema import ReviewRecord
from services.preprocessing import dedupe_exact, dedupe_near, preprocess_record


def _parse_timestamp(value: Any) -> datetime | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).strip()
    if not s:
        return None
    try:
        dt = pd.to_datetime(s, utc=True)
        if pd.isna(dt):
            return None
        return dt.to_pydatetime()
    except (ValueError, TypeError, OverflowError):
        return None


def _default_timestamp() -> datetime:
    return datetime.now(timezone.utc)


def normalize_dataframe(
    df: pd.DataFrame,
    source: str,
    *,
    lowercase_text: bool = True,
    dedupe: bool = True,
) -> tuple[list[ReviewRecord], int]:
    """
    Map dataframe rows to ReviewRecord list.

    Expected columns (case-insensitive column names normalized):
    - text (required conceptually; missing column handled in parser)
    - timestamp (optional)
    - product_id (optional)

    Returns (reviews, invalid_row_count).
    """
    if df.empty:
        return [], 0

    df = df.copy()
    # Normalize column names to lowercase for lookup
    df.columns = [str(c).strip().lower() for c in df.columns]

    if "text" not in df.columns:
        return [], int(len(df))

    reviews: list[ReviewRecord] = []
    invalid = 0

    sentence_records: list[dict[str, Any]] = []

    for _, row in df.iterrows():
        raw_text = row.get("text", "")
        if pd.isna(raw_text):
            raw_text = ""
        processed_sentences = preprocess_record({"text": str(raw_text)})
        if not processed_sentences:
            invalid += 1
            continue

        ts = _parse_timestamp(row.get("timestamp"))
        if ts is None:
            ts = _default_timestamp()

        pid = row.get("product_id")
        if pid is None or (isinstance(pid, float) and pd.isna(pid)):
            product_id = "unknown"
        else:
            product_id = str(pid).strip() or "unknown"

        for sentence in processed_sentences:
            text_value = sentence.sentence.lower() if lowercase_text else sentence.sentence
            if not text_value:
                invalid += 1
                continue
            sentence_records.append(
                {
                    "text": text_value,
                    "original_text": sentence.original_text,
                    "detected_language": sentence.detected_language,
                    "translated": sentence.translated,
                    "timestamp": ts,
                    "product_id": product_id,
                    "preprocessed": sentence,
                }
            )

    if not sentence_records:
        return [], invalid

    if dedupe:
        preprocessed_items = [item["preprocessed"] for item in sentence_records]
        deduped_exact, removed_exact = dedupe_exact(preprocessed_items)
        deduped_near, removed_near = dedupe_near(deduped_exact)
        invalid += removed_exact + removed_near

        keep_object_ids = {id(item) for item in deduped_near}
        sentence_records = [
            item
            for item in sentence_records
            if id(item["preprocessed"]) in keep_object_ids
        ]

    for item in sentence_records:
        pre = item["preprocessed"]
        reviews.append(
            ReviewRecord(
                review_id=str(uuid.uuid4()),
                text=item["text"],
                source=source,
                timestamp=item["timestamp"],
                product_id=item["product_id"],
                original_text=item["original_text"],
                detected_language=item["detected_language"],
                translated=item["translated"],
                preprocess_sentiment=pre.preprocess_sentiment,
                preprocess_sarcastic=pre.preprocess_sarcastic,
                preprocess_ambiguous=pre.preprocess_ambiguous,
                preprocess_meaning=pre.preprocess_meaning,
                preprocess_confidence=pre.preprocess_confidence,
            )
        )

    return reviews, invalid
