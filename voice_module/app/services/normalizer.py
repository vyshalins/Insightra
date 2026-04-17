"""Normalize parsed rows into unified review records."""

from __future__ import annotations

import hashlib
import re
import uuid
from datetime import datetime, timezone
from typing import Any

import pandas as pd

from models.schema import ReviewRecord


def clean_text(text: str, *, lowercase: bool = True) -> str:
    """Remove URLs, strip noise; optional lowercase."""
    if not text:
        return ""
    t = re.sub(r"http\S+", "", str(text))
    t = re.sub(r"\s+", " ", t).strip()
    if lowercase:
        t = t.lower()
    return t


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

    seen_hashes: set[str] = set()
    reviews: list[ReviewRecord] = []
    invalid = 0

    for _, row in df.iterrows():
        raw_text = row.get("text", "")
        if pd.isna(raw_text):
            raw_text = ""
        cleaned = clean_text(str(raw_text), lowercase=lowercase_text)
        if not cleaned:
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

        dedupe_key = hashlib.sha256(
            f"{cleaned}|{ts.isoformat()}".encode("utf-8")
        ).hexdigest()
        if dedupe and dedupe_key in seen_hashes:
            invalid += 1
            continue
        if dedupe:
            seen_hashes.add(dedupe_key)

        reviews.append(
            ReviewRecord(
                review_id=str(uuid.uuid4()),
                text=cleaned,
                source=source,
                timestamp=ts,
                product_id=product_id,
            )
        )

    return reviews, invalid
