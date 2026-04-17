from fastapi import FastAPI, UploadFile, File
import os

from transcribe import transcribe_audio
from utils import convert_to_wav
from llm_engine import analyze_with_llm

app = FastAPI()

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