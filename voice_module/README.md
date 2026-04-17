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
- `app/transcribe.py` - Whisper transcription
- `app/llm_engine.py` - LLM-based analysis
- `app/utils.py` - Helpers (including audio conversion)

