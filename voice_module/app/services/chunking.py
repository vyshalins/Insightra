"""Session-based chunk processing for large ingestion datasets."""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any

import pandas as pd
from fastapi import HTTPException

from models.schema import IngestionResponse, ReviewRecord
from services.normalizer import normalize_dataframe

DEFAULT_CHUNK_SIZE = 300
MIN_CHUNK_SIZE = 100
MAX_CHUNK_SIZE = 1000
SESSION_TTL_SECONDS = 30 * 60


@dataclass
class ChunkSession:
    session_id: str
    source: str
    rows: list[dict[str, Any]]
    total_rows: int
    processed_rows: int = 0
    invalid_rows: int = 0
    seen_texts: list[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_access_at: float = field(default_factory=time.time)


_SESSIONS: dict[str, ChunkSession] = {}
_SESSIONS_LOCK = threading.Lock()


def _bounded_chunk_size(size: int | None) -> int:
    if size is None:
        return DEFAULT_CHUNK_SIZE
    return max(MIN_CHUNK_SIZE, min(MAX_CHUNK_SIZE, int(size)))


def _is_near_duplicate(text: str, seen_texts: list[str], threshold: float = 0.85) -> bool:
    for existing in seen_texts:
        if SequenceMatcher(None, text, existing).ratio() >= threshold:
            return True
    return False


def cleanup_expired_sessions() -> None:
    now = time.time()
    with _SESSIONS_LOCK:
        stale_ids = [
            session_id
            for session_id, session in _SESSIONS.items()
            if now - session.last_access_at > SESSION_TTL_SECONDS
        ]
        for session_id in stale_ids:
            _SESSIONS.pop(session_id, None)


def create_session(df: pd.DataFrame, source: str) -> ChunkSession:
    cleanup_expired_sessions()
    session = ChunkSession(
        session_id=str(uuid.uuid4()),
        source=source,
        rows=df.to_dict(orient="records"),
        total_rows=int(len(df)),
    )
    with _SESSIONS_LOCK:
        _SESSIONS[session.session_id] = session
    return session


def get_session(session_id: str) -> ChunkSession:
    cleanup_expired_sessions()
    with _SESSIONS_LOCK:
        session = _SESSIONS.get(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Chunk session not found or expired.")
        session.last_access_at = time.time()
        return session


def _build_response(
    session: ChunkSession, reviews: list[ReviewRecord], chunk_size: int
) -> IngestionResponse:
    remaining_rows = max(0, session.total_rows - session.processed_rows)
    return IngestionResponse(
        reviews=reviews,
        source=session.source,
        count=len(reviews),
        invalid_rows=session.invalid_rows,
        session_id=session.session_id,
        total_rows=session.total_rows,
        processed_rows=session.processed_rows,
        remaining_rows=remaining_rows,
        chunk_size=chunk_size,
        has_more=remaining_rows > 0,
    )


def process_next_chunk(session_id: str, chunk_size: int | None = None) -> IngestionResponse:
    session = get_session(session_id)
    bounded = _bounded_chunk_size(chunk_size)

    if session.processed_rows >= session.total_rows:
        return _build_response(session, [], bounded)

    end_index = min(session.total_rows, session.processed_rows + bounded)
    chunk_rows = session.rows[session.processed_rows : end_index]
    chunk_df = pd.DataFrame(chunk_rows)
    normalized, invalid_chunk = normalize_dataframe(chunk_df, source=session.source, dedupe=True)
    session.processed_rows = end_index

    # Additional cross-chunk dedupe to prevent duplicates across chunk boundaries.
    accepted: list[ReviewRecord] = []
    dropped = 0
    for review in normalized:
        text = review.text.strip()
        if not text:
            dropped += 1
            continue
        if text in session.seen_texts or _is_near_duplicate(text, session.seen_texts):
            dropped += 1
            continue
        session.seen_texts.append(text)
        accepted.append(review)

    session.invalid_rows += invalid_chunk + dropped
    session.last_access_at = time.time()
    return _build_response(session, accepted, bounded)


def create_session_and_process_first_chunk(
    df: pd.DataFrame, source: str, chunk_size: int | None = None
) -> IngestionResponse:
    session = create_session(df, source=source)
    return process_next_chunk(session.session_id, chunk_size=chunk_size)
