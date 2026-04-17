"""Unit tests for preprocessing pipeline steps."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import services.groq_lang as groq_lang
from services.preprocessing import (
    PreprocessedText,
    clean_text,
    dedupe_exact,
    dedupe_near,
    preprocess_record,
    split_sentences,
)


def _clear_groq_cache() -> None:
    groq_lang._JSON_CACHE.clear()


def test_clean_text_removes_url_and_normalizes_case() -> None:
    raw = "OMG!!! delivery was sooo late 😡😡 check http://bad.com"
    cleaned = clean_text(raw)
    assert "http://bad.com" not in cleaned
    assert cleaned.startswith("omg")
    assert "late" in cleaned


def test_split_sentences_fallback() -> None:
    sentences = split_sentences("delivery was late. product damaged! very bad service?")
    assert len(sentences) >= 2
    assert sentences[0].startswith("delivery")


def test_dedupe_exact_removes_identical_sentences() -> None:
    records = [
        PreprocessedText("delivery late", "delivery late", "en", False),
        PreprocessedText("delivery late", "delivery late", "en", False),
        PreprocessedText("product bad", "product bad", "en", False),
    ]
    deduped, removed = dedupe_exact(records)
    assert len(deduped) == 2
    assert removed == 1


def test_dedupe_near_fallback_similarity() -> None:
    records = [
        PreprocessedText("delivery was late", "delivery was late", "en", False),
        PreprocessedText("delivery was very late", "delivery was very late", "en", False),
        PreprocessedText("great product", "great product", "en", False),
    ]
    deduped, removed = dedupe_near(records, threshold=0.8)
    assert len(deduped) <= 2
    assert removed >= 1


def test_preprocess_record_returns_sentence_outputs() -> None:
    _clear_groq_cache()
    with patch("services.preprocessing.groq_detect_and_translate", return_value=("en", "one line. two line.", False)):
        out = preprocess_record({"text": "One line. Two line."})
    assert len(out) >= 1
    assert out[0].original_text == "One line. Two line."


def test_groq_detect_and_translate_fallback_without_client() -> None:
    _clear_groq_cache()
    with patch.object(groq_lang, "_get_groq_client", return_value=None):
        lang, text, translated = groq_lang.groq_detect_and_translate("hello world unique-fallback-1")
    assert translated is False
    assert text == "hello world unique-fallback-1"
    assert isinstance(lang, str) and len(lang) >= 2


def test_groq_detect_and_translate_uses_mock_completion() -> None:
    _clear_groq_cache()
    mock_client = MagicMock()
    message = MagicMock()
    message.content = '{"translated_text":"this is a very good product","translated":true}'
    mock_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=message)]
    )
    with patch.object(groq_lang, "_langdetect_available", True):
        with patch.object(groq_lang, "_get_groq_client", return_value=mock_client):
            with patch.object(groq_lang, "_fallback_detect_language", return_value="hi"):
                lang, text, translated = groq_lang.groq_detect_and_translate(
                    "unique-hindi-test-xyz bahut accha long enough for langdetect path"
                )
                assert lang == "hi"
                assert translated is True
                assert "good" in text.lower() or "product" in text.lower()
                mock_client.chat.completions.create.assert_called_once()


def test_groq_detect_and_translate_english_skips_groq() -> None:
    _clear_groq_cache()
    mock_client = MagicMock()
    with patch.object(groq_lang, "_langdetect_available", True):
        with patch.object(groq_lang, "_get_groq_client", return_value=mock_client):
            with patch.object(groq_lang, "_fallback_detect_language", return_value="en"):
                lang, text, translated = groq_lang.groq_detect_and_translate(
                    "The delivery was late and the box was damaged completely here."
                )
                assert lang == "en"
                assert translated is False
                assert "late" in text.lower()
                mock_client.chat.completions.create.assert_not_called()


def test_preprocess_record_propagates_groq_metadata() -> None:
    _clear_groq_cache()
    with patch(
        "services.preprocessing.groq_detect_and_translate",
        return_value=("es", "good morning everyone", True),
    ):
        out = preprocess_record({"text": "Buenos dias a todos"})
    assert out
    assert out[0].detected_language == "es"
    assert out[0].translated is True
