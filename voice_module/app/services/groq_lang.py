"""Groq-based language detection and English translation for preprocessing."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from collections import OrderedDict
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
_CACHE_MAX = 256
_JSON_CACHE: OrderedDict[str, tuple[str, str, bool]] = OrderedDict()

_groq_client: Any = None
_groq_init_failed = False
_missing_key_logged = False
_langdetect_detect: Any | None = None
_langdetect_tried = False


def _fallback_detect_language(text: str) -> str:
    """Use langdetect when Groq is unavailable; never raises."""
    global _langdetect_detect, _langdetect_tried
    if not text.strip():
        return "en"
    if not _langdetect_tried:
        _langdetect_tried = True
        try:
            from langdetect import detect  # type: ignore[import-not-found]

            _langdetect_detect = detect
        except Exception:
            _langdetect_detect = None
    if _langdetect_detect is None:
        return "en"
    try:
        return str(_langdetect_detect(text)).lower().strip() or "en"
    except Exception:
        return "en"


def _get_groq_client() -> Any | None:
    global _groq_client, _groq_init_failed, _missing_key_logged
    if _groq_init_failed:
        return None
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        if not _missing_key_logged:
            logger.warning(
                "GROQ_API_KEY is not set; language detection uses langdetect only "
                "and translation is skipped until Groq is configured."
            )
            _missing_key_logged = True
        return None
    if _groq_client is None:
        try:
            from groq import Groq  # type: ignore[import-not-found]

            _groq_client = Groq(api_key=key)
        except Exception as exc:
            logger.warning("Groq client initialization failed: %s", type(exc).__name__)
            _groq_init_failed = True
            return None
    return _groq_client


def _parse_json_payload(raw: str) -> dict[str, Any] | None:
    if not raw or not raw.strip():
        return None
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    return data


def _cache_get(key: str) -> tuple[str, str, bool] | None:
    val = _JSON_CACHE.get(key)
    if val is None:
        return None
    _JSON_CACHE.move_to_end(key)
    return val


def _cache_set(key: str, value: tuple[str, str, bool]) -> None:
    _JSON_CACHE[key] = value
    _JSON_CACHE.move_to_end(key)
    while len(_JSON_CACHE) > _CACHE_MAX:
        _JSON_CACHE.popitem(last=False)


def groq_detect_and_translate(text: str) -> tuple[str, str, bool]:
    """
    Return (language_code, text_for_downstream, translated_flag).

    When GROQ_API_KEY is missing or Groq fails: langdetect (if available) + original text, translated=False.
    """
    stripped = text.strip()
    if not stripped:
        return "en", text, False

    cache_key = hashlib.sha256(stripped.encode("utf-8")).hexdigest()
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    client = _get_groq_client()
    if client is None:
        lang = _fallback_detect_language(stripped)
        result = (lang, stripped, False)
        _cache_set(cache_key, result)
        return result

    model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL
    system_msg = (
        "You output only a single JSON object, no markdown, no commentary. "
        'Keys: "language" (ISO 639-1 lowercase), '
        '"translated_text" (English; keep meaning; if input is English, keep it), '
        '"translated" (boolean, true only if you converted from a non-English language).'
    )
    user_msg = f"Input text (JSON string value follows):\n{json.dumps(stripped, ensure_ascii=False)}"

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw_content = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning(
            "Groq chat completion failed (len=%s): %s",
            len(stripped),
            type(exc).__name__,
        )
        lang = _fallback_detect_language(stripped)
        result = (lang, stripped, False)
        _cache_set(cache_key, result)
        return result

    payload = _parse_json_payload(raw_content)
    if not payload:
        logger.warning("Groq returned unparseable JSON (len=%s)", len(raw_content))
        lang = _fallback_detect_language(stripped)
        result = (lang, stripped, False)
        _cache_set(cache_key, result)
        return result

    lang = str(payload.get("language", "en")).lower().strip() or "en"
    translated_text = str(payload.get("translated_text", stripped)).strip()
    if not translated_text:
        translated_text = stripped
    translated = bool(payload.get("translated", False))

    result = (lang, translated_text, translated)
    _cache_set(cache_key, result)
    return result
