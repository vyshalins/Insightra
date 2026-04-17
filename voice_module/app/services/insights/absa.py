"""Aspect-based sentiment: sentence split, lexicon features, TextBlob polarity; optional Groq."""

from __future__ import annotations

import json
import logging
import os
from collections import defaultdict

from models.schema import AspectSentimentFeature, AspectSentimentWindows, ReviewRecord
from services.groq_lang import DEFAULT_GROQ_MODEL, _get_groq_client, _parse_json_payload
from services.insights.features import FEATURE_LEXICON, review_mentions_feature
from services.preprocessing import split_sentences

logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "")
    if not str(raw).strip():
        return default
    return str(raw).strip().lower() in ("1", "true", "yes", "on")


def _sentence_polarity(text: str) -> float:
    try:
        from textblob import TextBlob  # type: ignore[import-not-found]

        return float(TextBlob(text).sentiment.polarity)
    except Exception:
        return 0.0


def _label_from_polarity(p: float) -> str:
    if p > 0.05:
        return "positive"
    if p < -0.05:
        return "negative"
    return "neutral"


def _heuristic_confidence(mean_polarity: float, sample_count: int) -> float:
    strength = abs(mean_polarity)
    volume = min(12, max(0, sample_count))
    base = 0.25 + 0.12 * volume + 0.45 * strength
    return max(0.0, min(1.0, base))


def _groq_sentiment_to_delta(sentiment: str) -> float:
    s = (sentiment or "").strip().lower()
    if s == "positive":
        return 0.82
    if s == "negative":
        return -0.82
    return 0.0


def collect_aspect_polarity_hits(review: ReviewRecord, *, skip_ambiguous: bool) -> list[tuple[str, float]]:
    """Per sentence: lexicon feature hits paired with that sentence's polarity."""
    if skip_ambiguous and review.preprocess_ambiguous is True:
        return []
    text = (review.text or "").strip()
    if not text:
        return []
    sentences = split_sentences(text) or ([text] if text else [])
    sarcastic = review.preprocess_sarcastic is True
    hits: list[tuple[str, float]] = []
    for sentence in sentences:
        if not sentence.strip():
            continue
        pol = _sentence_polarity(sentence)
        if sarcastic:
            pol *= 0.85
        for feat in FEATURE_LEXICON:
            if review_mentions_feature(sentence, feat):
                hits.append((feat, pol))
    return hits


def _aggregate_hits(
    reviews: list[ReviewRecord], *, skip_ambiguous: bool
) -> dict[str, tuple[float, int]]:
    """feature -> (sum_polarity, count)."""
    sums: dict[str, float] = defaultdict(float)
    counts: dict[str, int] = defaultdict(int)
    for rec in reviews:
        for feat, pol in collect_aspect_polarity_hits(rec, skip_ambiguous=skip_ambiguous):
            sums[feat] += pol
            counts[feat] += 1
    out: dict[str, tuple[float, int]] = {}
    for feat in FEATURE_LEXICON:
        c = counts[feat]
        if c > 0:
            out[feat] = (sums[feat] / c, c)
    return out


def _features_to_rows(
    agg: dict[str, tuple[float, int]],
    groq_conf_by_feature: dict[str, float] | None,
    groq_sentiment_by_feature: dict[str, str] | None,
) -> list[AspectSentimentFeature]:
    rows: list[AspectSentimentFeature] = []
    for feat in FEATURE_LEXICON:
        if feat not in agg:
            continue
        mean_p, cnt = agg[feat]
        gconf = groq_conf_by_feature.get(feat) if groq_conf_by_feature else None
        gsent = groq_sentiment_by_feature.get(feat) if groq_sentiment_by_feature else None
        blended_mean = mean_p
        if gconf is not None and gsent and gconf >= 0.55:
            blended_mean = max(-1.0, min(1.0, 0.68 * mean_p + 0.32 * _groq_sentiment_to_delta(gsent)))
        label = _label_from_polarity(blended_mean)
        conf = _heuristic_confidence(mean_p, cnt)
        if gconf is not None:
            conf = max(0.0, min(1.0, 0.55 * conf + 0.45 * gconf))
        rows.append(
            AspectSentimentFeature(
                feature=feat,
                sentiment_label=label,
                mean_polarity=round(blended_mean, 4),
                sample_count=cnt,
                confidence=round(conf, 4),
            )
        )
    return rows


def _groq_batch_aspect_sentiment(
    reviews: list[ReviewRecord],
) -> tuple[dict[str, float], dict[str, str]] | None:
    """
    One Groq call: per-review aspects with sentiment + confidence.
    Returns merged maps feature -> max confidence / dominant sentiment across reviews.
    """
    client = _get_groq_client()
    if client is None:
        return None

    max_items = max(1, _env_int("INSIGHTS_ABSA_GROQ_MAX_REVIEWS", 12))
    subset = reviews[:max_items]
    if not subset:
        return None

    model = (os.getenv("INSIGHTS_ABSA_GROQ_MODEL", "") or os.getenv("GROQ_MODEL", "") or DEFAULT_GROQ_MODEL).strip()
    allowed = ", ".join(FEATURE_LEXICON.keys())
    system_msg = (
        "You output only one JSON object, no markdown. "
        'Schema: {"results":[{"review_id":string,"aspects":[{"feature":string,"sentiment":string,"confidence":number}]}]}. '
        f"feature must be one of: {allowed}. "
        "sentiment must be one of: positive, negative, neutral. "
        "confidence in [0,1]. Only include aspects clearly grounded in that review's text."
    )
    payload_in = [
        {"review_id": r.review_id, "text": (r.text or "")[:650]} for r in subset if (r.text or "").strip()
    ]
    if not payload_in:
        return None

    user_msg = "Reviews JSON:\n" + json.dumps(payload_in, ensure_ascii=False)

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.15,
            response_format={"type": "json_object"},
        )
        raw = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning("ABSA Groq batch failed: %s", type(exc).__name__)
        return None

    data = _parse_json_payload(raw)
    if not data:
        return None
    results = data.get("results")
    if not isinstance(results, list):
        return None

    conf_acc: dict[str, list[float]] = defaultdict(list)
    sent_votes: dict[str, list[str]] = defaultdict(list)

    for item in results:
        if not isinstance(item, dict):
            continue
        aspects = item.get("aspects")
        if not isinstance(aspects, list):
            continue
        for asp in aspects:
            if not isinstance(asp, dict):
                continue
            feat = str(asp.get("feature", "")).strip().lower()
            if feat not in FEATURE_LEXICON:
                continue
            sent = str(asp.get("sentiment", "")).strip().lower()
            if sent not in ("positive", "negative", "neutral"):
                continue
            try:
                conf = float(asp.get("confidence", 0.0))
            except (TypeError, ValueError):
                conf = 0.0
            conf = max(0.0, min(1.0, conf))
            conf_acc[feat].append(conf)
            sent_votes[feat].append(sent)

    if not conf_acc:
        return None

    conf_out: dict[str, float] = {}
    sent_out: dict[str, str] = {}
    for feat, confs in conf_acc.items():
        conf_out[feat] = sum(confs) / len(confs)
        votes = sent_votes[feat]
        # majority sentiment
        pos = sum(1 for v in votes if v == "positive")
        neg = sum(1 for v in votes if v == "negative")
        neu = sum(1 for v in votes if v == "neutral")
        if neg >= pos and neg >= neu:
            sent_out[feat] = "negative"
        elif pos >= neu:
            sent_out[feat] = "positive"
        else:
            sent_out[feat] = "neutral"

    return conf_out, sent_out


def build_aspect_sentiment_windows(
    previous: list[ReviewRecord],
    current: list[ReviewRecord],
) -> AspectSentimentWindows:
    """Build per-window per-feature aspect sentiment; optional Groq refinement on current window."""
    skip_ambiguous = _env_bool("INSIGHTS_ABSA_SKIP_AMBIGUOUS", True)
    excluded = 0
    if skip_ambiguous:
        excluded = sum(1 for r in previous + current if r.preprocess_ambiguous is True)

    prev_agg = _aggregate_hits(previous, skip_ambiguous=skip_ambiguous)
    curr_agg = _aggregate_hits(current, skip_ambiguous=skip_ambiguous)

    groq_conf: dict[str, float] | None = None
    groq_sent: dict[str, str] | None = None
    groq_used = False
    if _env_bool("INSIGHTS_ABSA_GROQ", False) and current:
        merged = _groq_batch_aspect_sentiment(current)
        if merged is not None:
            groq_conf, groq_sent = merged
            groq_used = True

    prev_rows = _features_to_rows(prev_agg, None, None)
    curr_rows = _features_to_rows(curr_agg, groq_conf, groq_sent if groq_used else None)

    return AspectSentimentWindows(
        previous=prev_rows,
        current=curr_rows,
        groq_refined=groq_used,
        excluded_ambiguous_count=excluded if skip_ambiguous else 0,
    )
