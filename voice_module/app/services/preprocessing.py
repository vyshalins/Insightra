"""Text preprocessing pipeline for ingestion records."""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from services.groq_context import groq_review_context
from services.groq_lang import groq_detect_and_translate


@dataclass
class PreprocessedText:
    """Processed sentence-level output for one review."""

    sentence: str
    original_text: str
    detected_language: str
    translated: bool
    preprocess_sentiment: str | None = None
    preprocess_sarcastic: bool | None = None
    preprocess_ambiguous: bool | None = None
    preprocess_meaning: str | None = None
    preprocess_confidence: float | None = None


_ENABLE_SPELLCHECK = os.getenv("PREPROCESS_ENABLE_SPELLCHECK", "0").strip() == "1"
_LIGHT_CLEAN = os.getenv("PREPROCESS_LIGHT_CLEAN", "0").strip() == "1"
_SENTENCE_MODEL: Any = None


def clean_text(text: str) -> str:
    """Normalize text with URL/HTML removal, emoji conversion, and casing."""
    if not text:
        return ""

    t = str(text).lower()
    t = re.sub(r"http\S+|www\.\S+", " ", t)
    t = re.sub(r"<[^>]+>", " ", t)

    # Convert emoji symbols to readable aliases (e.g. :angry_face:) when library exists.
    try:
        import emoji  # type: ignore[import-not-found]

        t = emoji.demojize(t, language="en")
        t = t.replace(":", " ")
        t = t.replace("_", " ")
    except ImportError:
        # Fallback: strip most non-word symbols while preserving whitespace.
        t = re.sub(r"[^\w\s.,!?-]", " ", t)

    # Compress repeated chars so "soooo" -> "soo".
    t = re.sub(r"(.)\1{2,}", r"\1\1", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def light_clean_text(text: str) -> str:
    """Strip URLs and demojize while preserving casing (opt-in via PREPROCESS_LIGHT_CLEAN)."""
    if not text:
        return ""
    t = str(text).strip()
    t = re.sub(r"http\S+|www\.\S+", " ", t)
    try:
        import emoji  # type: ignore[import-not-found]

        t = emoji.demojize(t, language="en")
    except ImportError:
        t = re.sub(r"[^\w\s.,!?-]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def correct_spelling(text: str) -> str:
    """Apply lightweight spell correction with graceful fallback."""
    if not text.strip():
        return ""
    if not _ENABLE_SPELLCHECK:
        return text
    # Guard rails: TextBlob correction is slow on long/noisy text.
    if len(text) > 120 or len(text.split()) > 18:
        return text

    try:
        from textblob import TextBlob  # type: ignore[import-not-found]

        return str(TextBlob(text).correct())
    except Exception:
        return text


def split_sentences(text: str) -> list[str]:
    """Split text into sentence-like chunks."""
    if not text.strip():
        return []

    try:
        import nltk  # type: ignore[import-not-found]
        from nltk.tokenize import sent_tokenize  # type: ignore[import-not-found]

        punkt_path = Path.home() / "nltk_data" / "tokenizers" / "punkt"
        if not punkt_path.exists():
            nltk.download("punkt", quiet=True)
        sentences = [s.strip() for s in sent_tokenize(text) if s.strip()]
        if sentences:
            return sentences
    except Exception:
        pass

    return [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]


def preprocess_record(review: dict[str, Any]) -> list[PreprocessedText]:
    """Run strict ordered preprocessing for one review and return sentences."""
    original_text = str(review.get("text", "") or "")
    cleaned = light_clean_text(original_text) if _LIGHT_CLEAN else clean_text(original_text)
    if not cleaned:
        return []

    lang, translated_text, translated = groq_detect_and_translate(cleaned)
    ctx = groq_review_context(translated_text)
    base_for_spell = (ctx.clean_text or translated_text).strip() or translated_text
    corrected = correct_spelling(base_for_spell)
    sentences = split_sentences(corrected)
    if not sentences:
        return []

    return [
        PreprocessedText(
            sentence=sentence,
            original_text=original_text,
            detected_language=lang,
            translated=translated,
            preprocess_sentiment=ctx.sentiment,
            preprocess_sarcastic=ctx.is_sarcastic,
            preprocess_ambiguous=ctx.is_ambiguous,
            preprocess_meaning=ctx.interpreted_meaning,
            preprocess_confidence=ctx.confidence,
        )
        for sentence in sentences
    ]


def dedupe_exact(records: list[PreprocessedText]) -> tuple[list[PreprocessedText], int]:
    """Remove exact duplicate sentence strings."""
    seen: set[str] = set()
    kept: list[PreprocessedText] = []
    removed = 0
    for record in records:
        key = hashlib.sha256(record.sentence.encode("utf-8")).hexdigest()
        if key in seen:
            removed += 1
            continue
        seen.add(key)
        kept.append(record)
    return kept, removed


def dedupe_near(
    records: list[PreprocessedText], *, threshold: float = 0.85
) -> tuple[list[PreprocessedText], int]:
    """Remove near-duplicates using embeddings; fallback to string similarity."""
    if not records:
        return [], 0

    try:
        import numpy as np
        from sentence_transformers import SentenceTransformer  # type: ignore[import-not-found]

        global _SENTENCE_MODEL
        if _SENTENCE_MODEL is None:
            _SENTENCE_MODEL = SentenceTransformer("all-MiniLM-L6-v2")

        vectors = _SENTENCE_MODEL.encode(
            [r.sentence for r in records],
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        vectors = vectors / norms
        kept_indices: list[int] = []
        removed = 0

        for index, vector in enumerate(vectors):
            duplicate = False
            for kept_idx in kept_indices:
                score = float(np.dot(vector, vectors[kept_idx]))
                if score >= threshold:
                    duplicate = True
                    break
            if duplicate:
                removed += 1
                continue
            kept_indices.append(index)

        return [records[i] for i in kept_indices], removed
    except Exception:
        pass

    kept: list[PreprocessedText] = []
    removed = 0

    for record in records:
        is_duplicate = False
        for candidate in kept:
            similarity = SequenceMatcher(None, record.sentence, candidate.sentence).ratio()
            if similarity >= threshold:
                is_duplicate = True
                break
        if is_duplicate:
            removed += 1
            continue
        kept.append(record)

    return kept, removed
