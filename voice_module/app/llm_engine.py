import requests
import json
import re

def analyze_with_llm(text: str):
    prompt = f"""
You are a business intelligence assistant.

Analyze the following customer feedback and return:

1. Emotion (Angry, Happy, Neutral)
2. Issues (list)
3. Recommended Actions (list)

Text:
{text}

IMPORTANT:
Respond ONLY in valid JSON format.
Do NOT add any extra text.

Example:
{{
    "emotion": "Angry",
    "issues": ["Delivery Delay"],
    "actions": ["Improve delivery system"]
}}
"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }
    )

    raw_output = response.json()["response"]
    print("\nRAW LLM OUTPUT:\n", raw_output)
    # Extract JSON using regex
    try:
        json_match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if json_match:
            clean_json = json_match.group(0)
            return json.loads(clean_json)
    except:
        pass

    # fallback
    return {
        "emotion": "Unknown",
        "issues": ["Parsing Error"],
        "actions": ["Retry"]
    }