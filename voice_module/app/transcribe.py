"""Whisper transcription logic (step 1)."""

import whisper

# Load once (global)
model = whisper.load_model("base")

def transcribe_audio(file_path: str) -> str:
    result = model.transcribe(file_path)
    return result["text"]