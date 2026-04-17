"""Optional Groq JSON context pass: sentiment, sarcasm, ambiguity, meaning, confidence."""

from __future__ import annotations

import hashlib
import logging
import os
import re
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any

from services.groq_lang import DEFAULT_GROQ_MODEL, _get_groq_client, _parse_json_payload

logger = logging.getLogger(__name__)

_CONTEXT_CACHE_MAX = 256
_CONTEXT_CACHE: OrderedDict[str, "GroqContextOutput"] = OrderedDict()


@dataclass(frozen=True)
class GroqContextOutput:
    """Structured LLM layer after translation; all optional when engine is off or on failure."""

    clean_text: str | None
    sentiment: str | None
    is_sarcastic: bool | None
    is_ambiguous: bool | None
    interpreted_meaning: str | None
    confidence: float | None


def _context_engine_enabled() -> bool:
    return os.getenv("GROQ_CONTEXT_ENGINE", "0").strip() == "1"


def _context_model() -> str:
    return (
        os.getenv("GROQ_CONTEXT_MODEL", "").strip()
        or os.getenv("GROQ_MODEL", "").strip()
        or DEFAULT_GROQ_MODEL
    )


def _clarity_score(text: str) -> float:
    """Heuristic 0..1 from length and punctuation (no extra deps)."""
    s = text.strip()
    if not s:
        return 0.0
    length = min(1.0, len(s) / 280.0)
    punct = 1.0 if re.search(r"[.!?,]", s) else 0.65
    return max(0.0, min(1.0, 0.55 * length + 0.45 * punct))


def _cache_get(key: str) -> GroqContextOutput | None:
    val = _CONTEXT_CACHE.get(key)
    if val is None:
        return None
    _CONTEXT_CACHE.move_to_end(key)
    return val


def _cache_set(key: str, value: GroqContextOutput) -> None:
    _CONTEXT_CACHE[key] = value
    _CONTEXT_CACHE.move_to_end(key)
    while len(_CONTEXT_CACHE) > _CONTEXT_CACHE_MAX:
        _CONTEXT_CACHE.popitem(last=False)


def _coerce_bool(v: Any) -> bool | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    if s in ("true", "yes", "1"):
        return True
    if s in ("false", "no", "0"):
        return False
    return None


def _coerce_confidence(v: Any) -> float | None:
    if v is None:
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return max(0.0, min(1.0, x))


def _normalize_payload(data: dict[str, Any]) -> GroqContextOutput:
    clean = str(data.get("clean_text", "") or "").strip() or None
    sentiment = str(data.get("sentiment", "") or "").strip().lower() or None
    if sentiment and sentiment not in ("positive", "negative", "neutral"):
        # keep nonstandard labels as-is for transparency
        pass
    return GroqContextOutput(
        clean_text=clean,
        sentiment=sentiment,
        is_sarcastic=_coerce_bool(data.get("is_sarcastic")),
        is_ambiguous=_coerce_bool(data.get("is_ambiguous")),
        interpreted_meaning=str(data.get("interpreted_meaning", "") or "").strip() or None,
        confidence=_coerce_confidence(data.get("confidence")),
    )


def groq_review_context(english_text: str) -> GroqContextOutput:
    """
    Run Groq JSON context engine on post-translation English text.

    When GROQ_CONTEXT_ENGINE is not ``1``, returns all-None output (no API calls).
    When Groq is unavailable or JSON fails, returns neutral defaults with no extra fields.
    """
    if not _context_engine_enabled():
        return GroqContextOutput(None, None, None, None, None, None)

    stripped = english_text.strip()
    if not stripped:
        return GroqContextOutput(None, None, None, None, None, None)

    model = _context_model()
    cache_key = hashlib.sha256(f"{model}:{stripped}".encode("utf-8")).hexdigest()
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    client = _get_groq_client()
    if client is None:
        out = GroqContextOutput(None, None, None, None, None, None)
        _cache_set(cache_key, out)
        return out

    system_msg = (
        "You are an NLP engine for short customer reviews. Output only one JSON object, no markdown. "
        "Keys: clean_text (normalized English), sentiment (one of: positive, negative, neutral), "
        "is_sarcastic (boolean), is_ambiguous (boolean), interpreted_meaning (short plain English), "
        "confidence (number 0 to 1 for your overall judgment)."
    )
    user_msg = f"Review:\n{stripped}"

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw_content = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning("Groq context request failed (len=%s): %s", len(stripped), type(exc).__name__)
        out = GroqContextOutput(None, None, None, None, None, None)
        _cache_set(cache_key, out)
        return out

    payload = _parse_json_payload(raw_content)
    if not payload:
        logger.warning("Groq context returned unparseable JSON (len=%s)", len(raw_content))
        out = GroqContextOutput(None, None, None, None, None, None)
        _cache_set(cache_key, out)
        return out

    base = _normalize_payload(payload)
    groq_conf = base.confidence
    clarity = _clarity_score(base.clean_text or stripped)
    calibrated: float | None
    if groq_conf is not None:
        calibrated = max(0.0, min(1.0, (groq_conf + clarity) / 2.0))
    else:
        calibrated = None

    out = GroqContextOutput(
        clean_text=base.clean_text,
        sentiment=base.sentiment,
        is_sarcastic=base.is_sarcastic,
        is_ambiguous=base.is_ambiguous,
        interpreted_meaning=base.interpreted_meaning,
        confidence=calibrated,
    )
    _cache_set(cache_key, out)
    return out
