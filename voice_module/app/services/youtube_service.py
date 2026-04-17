"""Fetch YouTube comment threads via Data API v3."""

from __future__ import annotations

import os
from typing import Any

from fastapi import HTTPException


def get_youtube_comments(video_id: str, *, max_results: int = 100) -> list[dict[str, Any]]:
    api_key = os.getenv("YOUTUBE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="YOUTUBE_API_KEY is not configured on the server.",
        )

    try:
        from googleapiclient.discovery import build  # type: ignore[import-untyped]
        from googleapiclient.errors import HttpError  # type: ignore[import-untyped]
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="google-api-python-client is not installed.",
        ) from exc

    youtube = build("youtube", "v3", developerKey=api_key, cache_discovery=False)
    comments: list[dict[str, Any]] = []

    try:
        request = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=max_results,
        )
        response = request.execute()
    except HttpError as exc:
        status = getattr(exc, "resp", None)
        code = getattr(status, "status", None) if status else None
        if code == 403:
            raise HTTPException(
                status_code=502,
                detail="YouTube API quota exceeded or API key invalid.",
            ) from exc
        if code == 404:
            raise HTTPException(
                status_code=404,
                detail="Video not found or comments disabled.",
            ) from exc
        raise HTTPException(
            status_code=502, detail=f"YouTube API error: {exc!s}"
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502, detail=f"YouTube fetch failed: {exc!s}"
        ) from exc

    for item in response.get("items", []):
        snippet = item.get("snippet", {}).get("topLevelComment", {}).get(
            "snippet", {}
        )
        text = snippet.get("textDisplay", "")
        ts = snippet.get("publishedAt", "")
        comments.append({"text": text, "timestamp": ts})

    return comments
