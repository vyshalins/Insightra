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
| `POST` | `/upload/analyze-fakes` | JSON body: either `{"reviews": [<ReviewRecord>, ...]}` from a prior ingestion response, or `{"session_id": "<id>"}` to score normalized rows from that chunk session (capped by `FAKE_ANALYZE_MAX_ROWS`) |
| `POST` | `/upload/analyze-insights` | Same JSON shape as analyze-fakes: trends across two time windows, urgency index, bias-adjusted sentiment, recommendations (capped by `INSIGHTS_MAX_ROWS`) |
| `POST` | `/fetch/youtube` | JSON body `{"url": "<youtube url or video id>"}` — requires `YOUTUBE_API_KEY` |

YouTube: set environment variable `YOUTUBE_API_KEY` before calling `/fetch/youtube`.

Sample CSV: [samples/reviews_sample.csv](samples/reviews_sample.csv).

## Hybrid fake review detection

After preprocessing, `POST /upload/analyze-fakes` scores each review with **rules** (always on), optional **Hugging Face sequence classification** (RoBERTa or any `AutoModelForSequenceClassification` weights), and optional **sentence-transformer** batch similarity (near-duplicate / campaign signal). Scores are **fused** and compared to `FAKE_THRESHOLD`.

Environment variables (all optional unless noted):

| Variable | Default | Purpose |
|----------|---------|---------|
| `FAKE_THRESHOLD` | `0.6` | `fake_confidence` above this ⇒ `is_fake` |
| `FAKE_FUSION_W_ML` | `0.7` | Fusion weight for ML probability (normalized with rules when ML is on) |
| `FAKE_FUSION_W_RULES` | `0.3` | Fusion weight for rule score |
| `FAKE_SIMILARITY_BOOST` | `0.12` | Added to fused score when SBERT finds a neighbor above threshold |
| `FAKE_ANALYZE_MAX_ROWS` | `2000` | Max reviews when resolving from `session_id` or truncating inline `reviews` |
| `FAKE_DETECT_ENABLE_ML` | unset | Set to `1` to load HF classifier |
| `FAKE_ROBERTA_MODEL_ID` | `roberta-base` | Hugging Face model id (use your fine-tuned fake/real checkpoint in production) |
| `FAKE_ROBERTA_MAX_LENGTH` | `256` | Tokenizer max length |
| `FAKE_ROBERTA_BATCH_SIZE` | `8` | Inference batch size |
| `FAKE_DETECT_ENABLE_SBERT` | unset | Set to `1` to run batch similarity |
| `FAKE_SBERT_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |
| `FAKE_SBERT_SIM_THRESHOLD` | `0.92` | Cosine similarity threshold for `near_duplicate_campaign` |

## Review insights (`POST /upload/analyze-insights`)

Time-bucketed lexicon trends (packaging, delivery, quality, battery, price, service), TextBlob sentiment, optional fake-rate in the **current** window, weighted **urgency score** (0–100), Bayesian-shrunk **adjusted sentiment**, and **recommendations** (Groq JSON list when `GROQ_API_KEY` is set; else templates).

| Variable | Default | Purpose |
|----------|---------|---------|
| `INSIGHTS_MAX_ROWS` | `2000` | Max reviews per request (inline or from `session_id` resolution) |
| `INSIGHTS_WINDOW_SIZE` | `50` | Reviews per window (previous vs current), when enough rows exist |
| `INSIGHTS_ANOMALY_MODE` | `none` | `none`, `zscore` (across-feature z on \|delta\|), or `iforest` (2D prev/current rates) |
| `INSIGHTS_USE_FAKE` | unset | Set to `1` to blend fake-detection rate into urgency (extra work on current window) |
| `INSIGHTS_WEIGHT_NEG_SENTIMENT` | `0.4` | Urgency fusion weight |
| `INSIGHTS_WEIGHT_TREND` | `0.4` | Urgency fusion weight |
| `INSIGHTS_WEIGHT_FAKE` | `0.2` | Urgency fusion weight |
| `INSIGHTS_BIAS_STRENGTH` | `12` | Prior strength for sentiment shrinkage toward neutral |
| `INSIGHTS_MIN_VOLUME_FOR_FULL_WEIGHT` | `30` | Denominator cap for volume confidence |

## Preprocessing layer (ingestion pipeline)

All ingestion routes feed the same preprocessing pipeline in this strict order:

1. basic cleaning (lowercase, URL/html removal, whitespace cleanup, emoji aliasing)
2. language detection (**langdetect** when installed) and English translation (**Groq only for non-English** text when `GROQ_API_KEY` is set; English skips Groq for speed)
3. spell correction
4. sentence segmentation
5. exact + near-duplicate removal

### Groq (language + translation)

Set in `voice_module/.env` (or the process environment):

- `GROQ_API_KEY` — when set, **non-English** rows (per langdetect) use Groq for **translation to English** only. English text does **not** call Groq, which speeds up large English-only CSVs.
- `GROQ_MODEL` — optional; defaults to `llama-3.1-8b-instant` if unset.
- `GROQ_LANGDETECT_MIN_CHARS` — optional; default `18`. Shorter cleaned strings are treated as English without calling langdetect or Groq (avoids flaky detection on tiny snippets).
- `GROQ_SKIP_TRANSLATION_LANGS` — optional; comma-separated ISO 639-1 **base** codes that skip Groq (default `en`). Example: `en` or `en,de` if German should pass through untranslated.

If **`langdetect` is not installed**, behavior matches the legacy path: a **single Groq call** per row does detection plus translation when Groq is configured.

If `GROQ_API_KEY` is missing or Groq errors, the pipeline uses **langdetect** for `detected_language` when available and **does not translate** (`translated` stays false). Ingestion remains synchronous; non-English rows still hit Groq rate limits when translating.

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

