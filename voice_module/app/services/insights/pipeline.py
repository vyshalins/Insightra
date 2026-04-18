"""Orchestrate insights: bucketing, trends, urgency, bias, recommendations."""

from __future__ import annotations

import os

from mlflow_tracker import tracker

from models.schema import (
    BiasSummary,
    InsightsMeta,
    InsightsResponse,
    ReviewRecord,
)
from services.fake_detection.pipeline import analyze_reviews
from services.insights.bias import compute_verified_prior, shrink_mean, volume_weight
from services.insights.absa import build_aspect_sentiment_windows
from services.insights.bucketing import split_windows
from services.insights.features import window_feature_rates
from services.insights.recommendations import generate_recommendations
from services.insights.sentiment import mean_polarity, negative_fraction
from services.insights.trends import build_trend_results
from services.insights.urgency import (
    build_urgency_items,
    compute_global_urgency_score,
    urgency_level_from_score,
)


def analyze_insights(reviews: list[ReviewRecord]) -> InsightsResponse:
    window = int(os.getenv("INSIGHTS_WINDOW_SIZE", "50"))
    anomaly_mode = os.getenv("INSIGHTS_ANOMALY_MODE", "none").strip().lower()

    # ── MLflow: log pipeline parameters ──────────────────────────────────────
    tracker.log_params({
        "model_type": "rule_based+roberta",
        "dataset_size": len(reviews),
        "window_size": window,
        "anomaly_mode": anomaly_mode,
        "preprocessing_steps": "cleaning,translation,deduplication",
        "fake_detection_enabled": os.getenv("INSIGHTS_USE_FAKE", "0").strip() == "1",
    })
    # ─────────────────────────────────────────────────────────────────────────

    previous, current = split_windows(reviews, window)
    prev_rates = window_feature_rates(previous)
    curr_rates = window_feature_rates(current)
    trends = build_trend_results(prev_rates, curr_rates, anomaly_mode)

    max_abs_delta = max((abs(t.delta) for t in trends), default=0.0)
    neg_frac = negative_fraction(current)

    fake_rate = 0.0
    if os.getenv("INSIGHTS_USE_FAKE", "").strip() == "1" and current:
        fake_results = analyze_reviews(current)
        fake_rate = sum(1 for r in fake_results if r.is_fake) / len(fake_results)

    urgency_score = compute_global_urgency_score(neg_frac, max_abs_delta, fake_rate)
    urgency_level = urgency_level_from_score(urgency_score)
    urgency_items = build_urgency_items(trends)

    raw_mean = mean_polarity(current)
    n_curr = len(current)

    # ── Derive prior from verified buyers in the current window ──────────────
    verified_prior, verified_count = compute_verified_prior(current)
    # ────────────────────────────────────────────────────────────

    adjusted = shrink_mean(raw_mean, n_curr, prior=verified_prior)
    vol_w = volume_weight(n_curr)

    meta = InsightsMeta(
        current_window_size=len(current),
        previous_window_size=len(previous),
        total_input_reviews=len(reviews),
        anomaly_mode=anomaly_mode,
        notes="",
    )
    if len(reviews) < 4:
        meta.notes = "Few reviews; windows use an adaptive split (see bucketing)."

    top_preview = [
        (t.feature, t.trend, t.classification)
        for t in sorted(trends, key=lambda x: abs(x.delta), reverse=True)
    ]
    summary = {
        "urgency_score": urgency_score,
        "urgency_level": urgency_level,
        "negative_fraction_current": neg_frac,
        "max_abs_delta": max_abs_delta,
        "fake_rate_current": fake_rate,
        "top_trends": top_preview[:6],
        "raw_sentiment": raw_mean,
        "adjusted_sentiment": adjusted,
    }
    recommendations = generate_recommendations(summary, top_preview)
    aspect_sentiment = build_aspect_sentiment_windows(previous, current)

    # ── MLflow: log computed metrics ──────────────────────────────────────────
    tracker.log_metrics({
        "urgency_score": round(urgency_score, 4),
        "negative_fraction": round(neg_frac, 4),
        "fake_rate": round(fake_rate, 4),
        "raw_sentiment": round(raw_mean, 4),
        "adjusted_sentiment": round(adjusted, 4),
        "volume_weight": round(vol_w, 4),
        "max_abs_trend_delta": round(max_abs_delta, 4),
        "current_window_size": float(len(current)),
        "previous_window_size": float(len(previous)),
        "total_reviews": float(len(reviews)),
        "total_trends_detected": float(len(trends)),
        "urgency_items_count": float(len(urgency_items)),
        "verified_prior": round(verified_prior, 4),
        "verified_buyer_count": float(verified_count),
    })
    tracker.set_tag("urgency_level", urgency_level)
    tracker.set_tag("bias_prior_source", "verified_buyers" if verified_count > 0 else "neutral_fallback")
    # ─────────────────────────────────────────────────────────────────────────

    return InsightsResponse(
        trends=trends,
        urgency_score=round(urgency_score, 2),
        urgency_level=urgency_level,
        urgency_items=urgency_items,
        bias=BiasSummary(
            raw_sentiment=round(raw_mean, 4),
            adjusted_sentiment=round(adjusted, 4),
            volume_weight=round(vol_w, 4),
            verified_prior=round(verified_prior, 4),
            verified_count=verified_count,
        ),
        recommendations=recommendations,
        meta=meta,
        aspect_sentiment=aspect_sentiment,
    )
