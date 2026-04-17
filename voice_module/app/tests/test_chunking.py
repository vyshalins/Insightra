"""Chunk session service tests."""

from __future__ import annotations

import pandas as pd

from services.chunking import (
    MAX_CHUNK_SIZE,
    MIN_CHUNK_SIZE,
    create_session_and_process_first_chunk,
    process_next_chunk,
)


def test_chunk_size_bounds_are_enforced() -> None:
    df = pd.DataFrame([{"text": f"row-{idx}"} for idx in range(250)])
    first = create_session_and_process_first_chunk(df, source="csv", chunk_size=1)
    # Lower than min should clamp upward.
    assert first.chunk_size == MIN_CHUNK_SIZE
    assert first.processed_rows == MIN_CHUNK_SIZE

    second = process_next_chunk(first.session_id or "", chunk_size=50000)
    # Higher than max should clamp downward.
    assert second.chunk_size == MAX_CHUNK_SIZE
    assert second.processed_rows == 250
    assert second.remaining_rows == 0
