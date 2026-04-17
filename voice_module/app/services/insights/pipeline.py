"""Orchestrate insights: bucketing, trends, urgency, bias, recommendations."""

from __future__ import annotations

import os

from models.schema import (
    BiasSummary,
    InsightsMeta,
    InsightsResponse,
    ReviewRecord,
)
from services.fake_detection.pipeline import analyze_reviews
from services.insights.bias import shrink_mean, volume_weight
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
    adjusted = shrink_mean(raw_mean, n_curr)
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

    return InsightsResponse(
        trends=trends,
        urgency_score=round(urgency_score, 2),
        urgency_level=urgency_level,
        urgency_items=urgency_items,
        bias=BiasSummary(
            raw_sentiment=round(raw_mean, 4),
            adjusted_sentiment=round(adjusted, 4),
            volume_weight=round(vol_w, 4),
        ),
        recommendations=recommendations,
        meta=meta,
        aspect_sentiment=aspect_sentiment,
    )
