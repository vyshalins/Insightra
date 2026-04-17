from transcribe import transcribe_audio
from utils import convert_to_wav
from llm_engine import analyze_with_llm
import sys

print("Script started")

def run_voice_pipeline(audio_path: str):
    print("\nProcessing Audio...\n")

    if audio_path.endswith(".m4a"):
        print("Converting .m4a to .wav...")
        audio_path = convert_to_wav(audio_path)

    text = transcribe_audio(audio_path)

    result = analyze_with_llm(text)

    print("Transcript:")
    print(text)

    print("\nEmotion:")
    print(result["emotion"])

    issues = result.get("issues", [])
    actions = result.get("actions", [])

    print("\nDetected Issues:")
    if not issues:
        print("No major issues detected (Positive/Informational feedback)")
    else:
        print(issues)

    print("\nRecommended Actions:")
    if not actions:
        print("No immediate action required")
    else:
        for action in actions:
            print("-", action)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide audio file path")
        print("Example: python test_transcribe.py ../samples/test.m4a")
    else:
        audio_path = sys.argv[1]
        run_voice_pipeline(audio_path)