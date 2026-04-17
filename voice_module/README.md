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

## Preprocessing layer (ingestion pipeline)

All ingestion routes feed the same preprocessing pipeline in this strict order:

1. basic cleaning (lowercase, URL/html removal, whitespace cleanup, emoji aliasing)
2. language detection and English translation (Groq when configured)
3. spell correction
4. sentence segmentation
5. exact + near-duplicate removal

### Groq (language + translation)

Set in `voice_module/.env` (or the process environment):

- `GROQ_API_KEY` — required for Groq-based detection + translation in one JSON response.
- `GROQ_MODEL` — optional; defaults to `llama-3.1-8b-instant` if unset.

If `GROQ_API_KEY` is missing or Groq errors, the pipeline falls back to **langdetect** for `detected_language` only and **does not translate** (`translated` stays false). Ingestion remains synchronous; large batches may hit Groq rate limits.

Output records include optional traceability metadata:

- `original_text`
- `detected_language`
- `translated`

Near-duplicate removal uses Sentence-BERT when available, with a safe string-similarity fallback.

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
- `app/services/groq_lang.py` - Groq JSON language detection + translation
- `app/services/normalizer.py` - Clean + normalize to unified schema
- `app/services/youtube_service.py` - YouTube Data API client
- `app/models/schema.py` - Pydantic models for ingestion responses
- `app/helpers.py` - YouTube video id extraction
- `app/transcribe.py` - Whisper transcription
- `app/llm_engine.py` - LLM-based analysis
- `app/utils.py` - Helpers (including audio conversion)

