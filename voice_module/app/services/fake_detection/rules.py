"""Rule-based scoring and human-readable signal tags."""

from __future__ import annotations

from services.fake_detection.features import emoji_or_symbol_density, extract_features


def compute_rule_score_and_signals(
    text: str,
    *,
    original_text: str | None = None,
) -> tuple[float, list[str]]:
    """
    Return (rule_score in [0, 1], signal tags).

    Multiple weak signals accumulate with diminishing returns (capped at 1.0).
    """
    feats = extract_features(text)
    signals: list[str] = []
    partial_scores: list[float] = []

    # Very short
    if feats.word_count > 0 and feats.word_count < 3:
        signals.append("very_short_text")
        partial_scores.append(0.25)

    # Low lexical diversity (repetition / spammy)
    if feats.word_count >= 4 and feats.unique_word_ratio < 0.45:
        signals.append("low_lexical_diversity")
        partial_scores.append(0.22)

    # Same word repeated many times in a row
    if feats.max_token_run >= 4:
        signals.append("repeated_tokens")
        partial_scores.append(0.22)

    # Extreme hype punctuation
    if feats.exclamation_ratio > 0.08 or text.count("!") >= 4:
        signals.append("extreme_punctuation")
        partial_scores.append(0.18)

    # Generic / template-like
    if feats.generic_phrase_hits >= 2:
        signals.append("generic_phrases")
        partial_scores.append(0.2)
    elif feats.generic_phrase_hits == 1 and feats.word_count <= 8:
        signals.append("generic_phrases")
        partial_scores.append(0.15)

    # Digit-heavy (SKU spam patterns)
    if feats.digit_ratio > 0.35 and feats.word_count >= 3:
        signals.append("digit_heavy")
        partial_scores.append(0.12)

    # Symbol / emoji density on original
    sym_d = emoji_or_symbol_density(original_text)
    if sym_d > 0.2:
        signals.append("symbol_or_emoji_heavy")
        partial_scores.append(0.18)

    # Combine with soft cap (avoid everything maxing instantly)
    raw = sum(partial_scores)
    rule_score = min(1.0, raw * 0.95)
    return rule_score, signals


def build_explanation(signals: list[str], ml_used: bool, similarity_hit: bool) -> str:
    """Short explanation for UX / interviews."""
    parts: list[str] = []
    if signals:
        parts.append("Rules: " + ", ".join(s.replace("_", " ") for s in signals))
    if ml_used:
        parts.append("ML classifier blended into score.")
    if similarity_hit:
        parts.append("High similarity to another review in this batch.")
    if not parts:
        return "No strong fake signals detected by rules."
    return " ".join(parts)
