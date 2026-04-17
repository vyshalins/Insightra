"""Upload endpoints: CSV, JSON, manual text."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel, Field

from models.schema import IngestionResponse
from services.chunking import (
    DEFAULT_CHUNK_SIZE,
    create_session_and_process_first_chunk,
    process_next_chunk,
)
from services.parser import parse_csv, parse_json, parse_manual

router = APIRouter(prefix="/upload", tags=["ingestion"])


class NextChunkBody(BaseModel):
    session_id: str
    chunk_size: int | None = Field(default=None, ge=1, le=5000)


@router.post("/csv", response_model=IngestionResponse)
async def upload_csv(file: UploadFile = File(...)) -> IngestionResponse:
    raw = await file.read()
    df = parse_csv(raw)
    return create_session_and_process_first_chunk(
        df, source="csv", chunk_size=DEFAULT_CHUNK_SIZE
    )


@router.post("/json", response_model=IngestionResponse)
async def upload_json(file: UploadFile = File(...)) -> IngestionResponse:
    raw = await file.read()
    df = parse_json(raw)
    return create_session_and_process_first_chunk(
        df, source="json", chunk_size=DEFAULT_CHUNK_SIZE
    )


@router.post("/manual", response_model=IngestionResponse)
async def upload_manual(text: str = Form(...)) -> IngestionResponse:
    df = parse_manual(text)
    return create_session_and_process_first_chunk(
        df, source="manual", chunk_size=DEFAULT_CHUNK_SIZE
    )


@router.post("/chunk/next", response_model=IngestionResponse)
async def upload_next_chunk(body: NextChunkBody) -> IngestionResponse:
    return process_next_chunk(body.session_id, chunk_size=body.chunk_size)
