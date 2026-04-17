import os
from pathlib import Path

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from routes.stream import router as stream_router
from routes.upload import router as upload_router
from routes.youtube import router as youtube_router
from transcribe import transcribe_audio
from utils import convert_to_wav
from llm_engine import analyze_with_llm


def load_local_env() -> None:
    """Load key=value pairs from voice_module/.env into process env."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        cleaned = value.strip().strip('"').strip("'")
        existing = os.environ.get(key)
        if existing is None or not existing.strip():
            os.environ[key] = cleaned


load_local_env()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(youtube_router)
app.include_router(stream_router)

UPLOAD_FOLDER = "temp"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.post("/voice/analyze")
async def analyze_voice(file: UploadFile = File(...)):
    
    # Save uploaded file
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Convert if needed
    if file_path.endswith(".m4a"):
        file_path = convert_to_wav(file_path)

    # Step 1: Transcribe
    text = transcribe_audio(file_path)

    # Step 2: LLM Analysis
    result = analyze_with_llm(text)

    return {
        "transcript": text,
        "emotion": result.get("emotion", "Unknown"),
        "issues": result.get("issues", []),
        "actions": result.get("actions", [])
    }