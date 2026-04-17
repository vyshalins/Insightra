"""YouTube comment ingestion."""

from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from helpers import extract_video_id
from models.schema import IngestionResponse
from services.chunking import DEFAULT_CHUNK_SIZE, create_session_and_process_first_chunk
from services.youtube_service import get_youtube_comments

router = APIRouter(prefix="/fetch", tags=["ingestion"])


class YouTubeFetchBody(BaseModel):
    url: str = Field(..., description="YouTube video URL or 11-char video id")


@router.post("/youtube", response_model=IngestionResponse)
async def fetch_youtube(body: YouTubeFetchBody) -> IngestionResponse:
    video_id = extract_video_id(body.url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Could not parse a valid YouTube video id from url.",
        )

    rows = get_youtube_comments(video_id)
    df = pd.DataFrame(rows)
    return create_session_and_process_first_chunk(
        df, source="youtube", chunk_size=DEFAULT_CHUNK_SIZE
    )
