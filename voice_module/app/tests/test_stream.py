"""WebSocket review stream tests."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.stream import router as stream_router
from routes.upload import router as upload_router


def _app() -> FastAPI:
    app = FastAPI()
    app.include_router(upload_router)
    app.include_router(stream_router)
    return app


def test_review_stream_sends_reviews_and_done() -> None:
    with TestClient(_app()) as client:
        up = client.post("/upload/manual", data={"text": "Alpha review\nBeta review\n"})
        assert up.status_code == 200
        payload = up.json()
        sid = payload["session_id"]
        assert sid

        with client.websocket_connect(
            f"/ws/review-stream?session_id={sid}&interval_ms=50"
        ) as ws:
            seen: list[str] = []
            while True:
                msg = ws.receive_json()
                if msg["type"] == "review":
                    seen.append(msg["review"]["text"])
                elif msg["type"] == "done":
                    assert msg["count"] == len(seen)
                    break
                else:
                    raise AssertionError(msg)

        assert "alpha review" in seen
        assert "beta review" in seen


def test_review_stream_unknown_session() -> None:
    with TestClient(_app()) as client:
        with client.websocket_connect(
            "/ws/review-stream?session_id=00000000-0000-0000-0000-000000000000&interval_ms=50"
        ) as ws:
            msg = ws.receive_json()
            assert msg["type"] == "error"
