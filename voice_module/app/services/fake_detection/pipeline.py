"""End-to-end fake detection for a list of ReviewRecord."""

from __future__ import annotations

from mlflow_tracker import tracker
from models.schema import FakeReviewResult, ReviewRecord
from services.fake_detection import fusion
from services.fake_detection.roberta_model import predict_fake_probabilities
from services.fake_detection.rules import build_explanation, compute_rule_score_and_signals
from services.fake_detection.similarity import batch_near_duplicate_flags


def analyze_reviews(reviews: list[ReviewRecord]) -> list[FakeReviewResult]:
    """Run rules + optional ML + optional SBERT, then fuse and decide per review."""
    if not reviews:
        return []

    texts = [r.text for r in reviews]
    ml_probs = predict_fake_probabilities(texts)
    pids = [r.product_id for r in reviews]
    sim_flags = batch_near_duplicate_flags(texts, product_ids=pids)

    results: list[FakeReviewResult] = []
    ml_used = any(p is not None for p in ml_probs)

    for idx, rec in enumerate(reviews):
        rule_score, signals = compute_rule_score_and_signals(
            rec.text,
            original_text=rec.original_text,
        )
        ml_p = ml_probs[idx] if idx < len(ml_probs) else None
        sim_hit = sim_flags[idx] if idx < len(sim_flags) else False

        if sim_hit and "near_duplicate_campaign" not in signals:
            signals = [*signals, "near_duplicate_campaign"]

        fused = fusion.fuse_scores(ml_p, rule_score)
        fused = fusion.apply_similarity_boost(fused, sim_hit)
        decision = fusion.decide(fused)
        explanation = build_explanation(signals, ml_used=ml_used, similarity_hit=sim_hit)

        results.append(
            FakeReviewResult(
                review_id=rec.review_id,
                is_fake=decision.is_fake,
                fake_confidence=round(decision.fake_confidence, 4),
                rule_score=round(rule_score, 4),
                ml_fake_prob=round(ml_p, 4) if ml_p is not None else None,
                fake_signals=signals,
                explanation=explanation,
                similarity_neighbor=sim_hit,
            )
        )

    # ── MLflow: log fake-detection aggregate metrics ──────────────────────────
    total = len(results)
    fake_count = sum(1 for r in results if r.is_fake)
    sim_hits = sum(1 for f in sim_flags if f)
    tracker.log_metrics({
        "fake_detection_total_reviewed": float(total),
        "fake_count": float(fake_count),
        "fake_rate": round(fake_count / total, 4) if total else 0.0,
        "similarity_hits": float(sim_hits),
        "ml_model_used": float(ml_used),
    })
    # ─────────────────────────────────────────────────────────────────────────

    return results
