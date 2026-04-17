"""Lightweight textual features for rule-based fake signals."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class TextFeatures:
    word_count: int
    unique_word_ratio: float
    max_token_run: int
    exclamation_ratio: float
    generic_phrase_hits: int
    digit_ratio: float
    punctuation_ratio: float


def extract_features(text: str) -> TextFeatures:
    """Derive numeric features from cleaned review text."""
    t = (text or "").strip()
    if not t:
        return TextFeatures(
            word_count=0,
            unique_word_ratio=1.0,
            max_token_run=0,
            exclamation_ratio=0.0,
            generic_phrase_hits=0,
            digit_ratio=0.0,
            punctuation_ratio=0.0,
        )

    words = t.split()
    n = len(words)
    unique = len(set(words))
    unique_ratio = unique / n if n else 1.0

    max_run = 0
    if words:
        current = 1
        for i in range(1, n):
            if words[i] == words[i - 1]:
                current += 1
                max_run = max(max_run, current)
            else:
                current = 1
        max_run = max(max_run, 1)

    excl = t.count("!")
    excl_ratio = excl / max(len(t), 1)

    generic_hits = _count_generic_phrases(t)

    alnum = sum(1 for c in t if c.isalnum())
    digits = sum(1 for c in t if c.isdigit())
    digit_ratio = digits / max(alnum, 1)

    punct = sum(1 for c in t if c in "!?.,")
    punct_ratio = punct / max(len(t), 1)

    return TextFeatures(
        word_count=n,
        unique_word_ratio=unique_ratio,
        max_token_run=max_run,
        exclamation_ratio=excl_ratio,
        generic_phrase_hits=generic_hits,
        digit_ratio=digit_ratio,
        punctuation_ratio=punct_ratio,
    )


_GENERIC_PHRASES = (
    "nice product",
    "good quality",
    "great product",
    "highly recommend",
    "must buy",
    "best ever",
    "love this product",
    "amazing product",
    "five stars",
    "10/10",
    "works great",
    "as described",
    "fast shipping",
    "great seller",
)


def _count_generic_phrases(text_lower: str) -> int:
    return sum(1 for phrase in _GENERIC_PHRASES if phrase in text_lower)


def emoji_or_symbol_density(original_text: str | None) -> float:
    """Rough density of non-alphanumeric symbols in raw text (spam / hype)."""
    if not original_text:
        return 0.0
    raw = original_text.strip()
    if not raw:
        return 0.0
    symbols = len(re.findall(r"[^\w\s]", raw, flags=re.UNICODE))
    return symbols / max(len(raw), 1)
