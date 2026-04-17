def detect_emotion(text: str) -> str:
    text = text.lower()

    if any(word in text for word in ["angry", "frustrated", "not happy", "bad", "worst"]):
        return "Angry"

    elif any(word in text for word in ["happy", "good", "great", "satisfied", "excellent"]):
        return "Happy"

    elif any(word in text for word in ["okay", "fine", "average"]):
        return "Neutral"

    else:
        return "Neutral"