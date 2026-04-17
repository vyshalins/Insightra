"""WebSocket: replay normalized reviews from a chunk session (simulated live stream)."""

from __future__ import annotations

import asyncio

import pandas as pd
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from services.chunking import get_session
from services.normalizer import normalize_dataframe

router = APIRouter(prefix="/ws", tags=["stream"])

_MIN_INTERVAL_MS = 50
_MAX_INTERVAL_MS = 60_000
_DEFAULT_INTERVAL_MS = 1500


def _parse_interval_ms(raw: str | None) -> int:
    if raw is None or not str(raw).strip():
        return _DEFAULT_INTERVAL_MS
    try:
        value = int(str(raw).strip())
    except ValueError:
        return _DEFAULT_INTERVAL_MS
    return max(_MIN_INTERVAL_MS, min(_MAX_INTERVAL_MS, value))


@router.websocket("/review-stream")
async def review_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    params = websocket.query_params
    sid = (params.get("session_id") or "").strip()
    if not sid:
        await websocket.send_json({"type": "error", "detail": "Missing session_id."})
        await websocket.close(code=4400)
        return

    try:
        session = get_session(sid)
    except HTTPException as exc:
        await websocket.send_json({"type": "error", "detail": exc.detail})
        await websocket.close(code=4404)
        return

    interval_ms = _parse_interval_ms(params.get("interval_ms"))
    df = pd.DataFrame(session.rows)
    reviews, _ = normalize_dataframe(df, source=session.source, dedupe=True)
    delay_sec = interval_ms / 1000.0

    try:
        for review in reviews:
            await asyncio.sleep(delay_sec)
            await websocket.send_json(
                {"type": "review", "review": review.model_dump(mode="json")}
            )
        await websocket.send_json({"type": "done", "count": len(reviews)})
        await websocket.close()
    except WebSocketDisconnect:
        return
