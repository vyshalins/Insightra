# voice_module

FastAPI backend for audio transcription and analysis.

## Run Backend

Install dependencies from `voice_module`, then start Uvicorn from the `app` folder (imports like `from transcribe import` expect the working directory to be `app`):

```bash
cd voice_module
pip install -r requirements.txt
cd app
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API endpoint used by the frontend:

- `POST /voice/analyze` with `multipart/form-data` field `file`

## Data input layer (reviews ingestion)

Unified review records: `review_id`, `text`, `source`, `timestamp`, `product_id` (defaults to `unknown`).

| Method | Path | Description |
|--------|------|---------------|
| `POST` | `/upload/csv` | `multipart/form-data` field `file` — CSV with a `text` column (case-insensitive); optional `timestamp`, `product_id` |
| `POST` | `/upload/json` | `file` — JSON array of objects (or one object), each with `text` |
| `POST` | `/upload/manual` | `application/x-www-form-urlencoded` field `text` — one review per non-empty line |
| `POST` | `/fetch/youtube` | JSON body `{"url": "<youtube url or video id>"}` — requires `YOUTUBE_API_KEY` |

YouTube: set environment variable `YOUTUBE_API_KEY` before calling `/fetch/youtube`.

Sample CSV: [samples/reviews_sample.csv](samples/reviews_sample.csv).

### Tests

From `voice_module/app`:

```bash
python -m pytest tests/ -v
```

### Note on `helpers.py`

`app/utils.py` already exists for voice helpers. YouTube URL parsing lives in `app/helpers.py` to avoid a `utils/` package name clash with `utils.py`.

## React Frontend

A React app is available at `../frontend`.

From `frontend`:

```bash
npm install
npm run dev
```

Default frontend URL is `http://localhost:5173`.
Backend CORS is configured to allow this origin.

## Optional Frontend API Base URL

Set `VITE_API_BASE_URL` in a `.env` file under `frontend` if your backend runs on a different host/port:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Structure

- `app/main.py` - FastAPI entry point
- `app/routes/upload.py` - CSV / JSON / manual upload routes
- `app/routes/youtube.py` - YouTube comments route
- `app/services/parser.py` - Parse uploads to DataFrames
- `app/services/normalizer.py` - Clean + normalize to unified schema
- `app/services/youtube_service.py` - YouTube Data API client
- `app/models/schema.py` - Pydantic models for ingestion responses
- `app/helpers.py` - YouTube video id extraction
- `app/transcribe.py` - Whisper transcription
- `app/llm_engine.py` - LLM-based analysis
- `app/utils.py` - Helpers (including audio conversion)

