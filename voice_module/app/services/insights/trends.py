"""Build trend rows with optional anomaly scoring."""

from __future__ import annotations

import statistics

import numpy as np
from sklearn.ensemble import IsolationForest

from models.schema import TrendFeatureResult
from services.insights.classification import classify_delta_pp, trend_direction
from services.insights.features import FEATURE_LEXICON


def build_trend_results(
    prev_rates: dict[str, float],
    curr_rates: dict[str, float],
    anomaly_mode: str,
) -> list[TrendFeatureResult]:
    rows: list[TrendFeatureResult] = []
    for feat in FEATURE_LEXICON:
        pr = float(prev_rates.get(feat, 0.0))
        cr = float(curr_rates.get(feat, 0.0))
        delta = cr - pr
        abs_pp = abs(delta) * 100.0
        rows.append(
            TrendFeatureResult(
                feature=feat,
                prev_rate=round(pr, 4),
                current_rate=round(cr, 4),
                delta=round(delta, 4),
                trend=trend_direction(delta),
                classification=classify_delta_pp(abs_pp),
                z_score=None,
            )
        )

    mode = (anomaly_mode or "none").strip().lower()
    if mode == "zscore" and len(rows) >= 2:
        abs_d = [abs(t.delta) for t in rows]
        mean = statistics.fmean(abs_d)
        var = statistics.pvariance(abs_d) if len(abs_d) > 1 else 0.0
        std = var**0.5
        if std > 1e-9:
            rows = [
                t.model_copy(
                    update={"z_score": round((abs(t.delta) - mean) / std, 4)},
                )
                for t in rows
            ]
    elif mode == "iforest" and len(rows) >= 3:
        x = np.array([[t.prev_rate, t.current_rate] for t in rows], dtype=np.float64)
        contamination = min(0.25, max(2 / len(rows), 0.1))
        try:
            model = IsolationForest(random_state=42, contamination=contamination)
            model.fit(x)
            scores = model.decision_function(x)
            rows = [
                t.model_copy(update={"z_score": round(float(s), 4)})
                for t, s in zip(rows, scores, strict=True)
            ]
        except Exception:
            pass

    return rows
