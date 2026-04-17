"""Upload endpoints: CSV, JSON, manual text."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile

from models.schema import IngestionResponse
from services.normalizer import normalize_dataframe
from services.parser import parse_csv, parse_json, parse_manual

router = APIRouter(prefix="/upload", tags=["ingestion"])


@router.post("/csv", response_model=IngestionResponse)
async def upload_csv(file: UploadFile = File(...)) -> IngestionResponse:
    raw = await file.read()
    df = parse_csv(raw)
    reviews, invalid = normalize_dataframe(df, source="csv")
    return IngestionResponse(
        reviews=reviews,
        source="csv",
        count=len(reviews),
        invalid_rows=invalid,
    )


@router.post("/json", response_model=IngestionResponse)
async def upload_json(file: UploadFile = File(...)) -> IngestionResponse:
    raw = await file.read()
    df = parse_json(raw)
    reviews, invalid = normalize_dataframe(df, source="json")
    return IngestionResponse(
        reviews=reviews,
        source="json",
        count=len(reviews),
        invalid_rows=invalid,
    )


@router.post("/manual", response_model=IngestionResponse)
async def upload_manual(text: str = Form(...)) -> IngestionResponse:
    df = parse_manual(text)
    reviews, invalid = normalize_dataframe(df, source="manual")
    return IngestionResponse(
        reviews=reviews,
        source="manual",
        count=len(reviews),
        invalid_rows=invalid,
    )
