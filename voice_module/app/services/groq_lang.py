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
# False only when langdetect import failed; True when detect ran (success or caught per-text).
_langdetect_available: bool = False


def _fallback_detect_language(text: str) -> str:
    """Use langdetect when Groq is unavailable; never raises."""
    global _langdetect_detect, _langdetect_tried, _langdetect_available
    if not text.strip():
        return "en"
    if not _langdetect_tried:
        _langdetect_tried = True
        try:
            from langdetect import detect  # type: ignore[import-not-found]

            _langdetect_detect = detect
            _langdetect_available = True
        except Exception:
            _langdetect_detect = None
            _langdetect_available = False
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


def _langdetect_min_chars() -> int:
    raw = os.getenv("GROQ_LANGDETECT_MIN_CHARS", "18")
    try:
        return max(0, int(raw))
    except ValueError:
        return 18


def _skip_translation_lang_bases() -> set[str]:
    raw = os.getenv("GROQ_SKIP_TRANSLATION_LANGS", "en").strip().lower()
    if not raw:
        return {"en"}
    parts = []
    for part in raw.split(","):
        p = part.strip()
        if p:
            parts.append(p.split("-")[0].split("_")[0])
    return set(parts) if parts else {"en"}


def _base_lang(code: str) -> str:
    c = (code or "en").lower().strip()
    if not c:
        return "en"
    return c.split("-")[0].split("_")[0]


def _groq_translate_only(
    client: Any, stripped: str, source_lang: str, model: str
) -> tuple[str, str, bool] | None:
    """Call Groq for English translation only. Returns None on failure."""
    system_msg = (
        "You output only a single JSON object, no markdown, no commentary. "
        "Translate the input to fluent English. Preserve meaning and tone. "
        f'Source language (ISO 639-1 hint): "{source_lang}". '
        'Keys: "translated_text" (English string), '
        '"translated" (boolean, must be true when you translated).'
    )
    user_msg = f"Input text:\n{json.dumps(stripped, ensure_ascii=False)}"
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
            "Groq translation request failed (len=%s): %s",
            len(stripped),
            type(exc).__name__,
        )
        return None

    payload = _parse_json_payload(raw_content)
    if not payload:
        return None

    translated_text = str(payload.get("translated_text", "")).strip()
    if not translated_text:
        return None
    translated = bool(payload.get("translated", True))
    return (source_lang, translated_text, translated)


def _groq_full_detect_translate_legacy(
    client: Any, stripped: str, cache_key: str, model: str
) -> tuple[str, str, bool]:
    """Original single-call detect+translate when langdetect is not installed."""
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


def groq_detect_and_translate(text: str) -> tuple[str, str, bool]:
    """
    Return (language_code, text_for_downstream, translated_flag).

    langdetect runs first when installed: English (and other configured codes)
    skips Groq. Non-English with Groq configured uses a translation-only API call.

    When langdetect is unavailable, falls back to the legacy single Groq call
    (detect + translate) when Groq is configured.

    When GROQ_API_KEY is missing: langdetect (if available) + original text, translated=False.
    """
    stripped = text.strip()
    if not stripped:
        return "en", text, False

    cache_key = hashlib.sha256(stripped.encode("utf-8")).hexdigest()
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    if len(stripped) < _langdetect_min_chars():
        result = ("en", stripped, False)
        _cache_set(cache_key, result)
        return result

    lang_local = _fallback_detect_language(stripped)
    base = _base_lang(lang_local)
    skip_bases = _skip_translation_lang_bases()

    if _langdetect_available and base in skip_bases:
        out_lang = "en" if base == "en" else lang_local
        result = (out_lang, stripped, False)
        _cache_set(cache_key, result)
        return result

    client = _get_groq_client()
    if client is None:
        result = (lang_local, stripped, False)
        _cache_set(cache_key, result)
        return result

    model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL

    if not _langdetect_available:
        return _groq_full_detect_translate_legacy(client, stripped, cache_key, model)

    groq_result = _groq_translate_only(client, stripped, lang_local, model)
    if groq_result is None:
        logger.warning("Groq translation failed or returned empty JSON (len=%s)", len(stripped))
        result = (lang_local, stripped, False)
        _cache_set(cache_key, result)
        return result

    _cache_set(cache_key, groq_result)
    return groq_result
