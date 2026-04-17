"""LLM or template recommendations from insight summary."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from services.groq_lang import DEFAULT_GROQ_MODEL, _get_groq_client, _parse_json_payload

logger = logging.getLogger(__name__)


def _deterministic_recommendations(
    top_features: list[tuple[str, str, str]],
) -> list[str]:
    """Template strings from (feature, trend, classification)."""
    out: list[str] = []
    for feat, trend, clf in top_features[:8]:
        if clf == "systemic":
            out.append(f"Address systemic {feat} issues ({trend}); align ops and comms.")
        elif clf == "emerging":
            out.append(f"Track emerging {feat} pattern ({trend}); validate with support tickets.")
        elif trend != "stable":
            out.append(f"Review {feat} feedback trend ({trend}).")
    if not out:
        out.append("No strong multi-window shifts detected; keep monitoring standard KPIs.")
    return out[:8]


def generate_recommendations(
    summary: dict[str, Any],
    trends_preview: list[tuple[str, str, str]],
) -> list[str]:
    """
    Use Groq for JSON list of strings when configured; else templates.

    `summary` is a small JSON-serializable dict for the LLM.
    `trends_preview` is (feature, trend, classification) for fallback ordering.
    """
    client = _get_groq_client()
    if client is None:
        return _deterministic_recommendations(trends_preview)

    model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL
    system_msg = (
        "You output only a single JSON object, no markdown. "
        'Key: "recommendations" — array of 3 to 8 short imperative action items '
        "for product/ops teams based on the provided metrics (trends, urgency, sentiment). "
        "Each string under 120 characters."
    )
    user_msg = "Metrics JSON:\n" + json.dumps(summary, ensure_ascii=False, default=str)

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
        raw = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning("Groq recommendations failed: %s", type(exc).__name__)
        return _deterministic_recommendations(trends_preview)

    payload = _parse_json_payload(raw)
    if not payload:
        return _deterministic_recommendations(trends_preview)

    recs = payload.get("recommendations")
    if not isinstance(recs, list):
        return _deterministic_recommendations(trends_preview)

    cleaned = [str(x).strip() for x in recs if str(x).strip()]
    return cleaned[:8] if cleaned else _deterministic_recommendations(trends_preview)
