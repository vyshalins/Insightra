"""Parse raw uploads into pandas DataFrames for normalization."""

from __future__ import annotations

import io
import json
from typing import Any

import pandas as pd
from fastapi import HTTPException


def _ensure_text_column(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    if "text" not in df.columns:
        raise HTTPException(
            status_code=400,
            detail='Missing required column "text" (case-insensitive).',
        )
    return df


def parse_csv(file_bytes: bytes) -> pd.DataFrame:
    if not file_bytes or not file_bytes.strip():
        raise HTTPException(status_code=400, detail="Empty CSV file.")
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400, detail=f"Invalid CSV: {exc!s}"
        ) from exc
    return _ensure_text_column(df)


def parse_json(file_bytes: bytes) -> pd.DataFrame:
    if not file_bytes or not file_bytes.strip():
        raise HTTPException(status_code=400, detail="Empty JSON file.")
    try:
        text = file_bytes.decode("utf-8")
        data: Any = json.loads(text)
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400, detail="JSON must be UTF-8 encoded."
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {exc!s}") from exc

    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise HTTPException(
            status_code=400,
            detail="JSON must be an object or array of objects.",
        )
    if not data:
        return pd.DataFrame()
    df = pd.DataFrame(data)
    return _ensure_text_column(df)


def parse_manual(text: str) -> pd.DataFrame:
    if not text or not str(text).strip():
        raise HTTPException(status_code=400, detail="Empty manual input.")
    lines = [ln.strip() for ln in str(text).splitlines() if ln.strip()]
    if not lines:
        raise HTTPException(
            status_code=400, detail="Manual input has no non-empty lines."
        )
    return pd.DataFrame([{"text": line} for line in lines])
