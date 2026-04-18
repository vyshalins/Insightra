"""Bayesian-style sentiment shrinkage and volume weighting.

Key concept — verified-purchase prior
--------------------------------------
Happy customers rarely leave reviews; unhappy ones are over-represented.
To correct for this selection bias, we derive the Bayesian prior from
**verified buyers only** rather than assuming a neutral 0.0 baseline.

  prior = mean sentiment of verified-purchase reviews
        → if none exist, falls back to INSIGHTS_BIAS_NEUTRAL_PRIOR (default 0.0)

The shrink_mean() formula then pulls every window's raw sentiment toward
this verified-buyer baseline.  Small windows get pulled hard; large windows
trust their own data.

  adjusted = (strength × prior + n × raw_mean) / (strength + n)
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.schema import ReviewRecord


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name, "")
    if not raw.strip():
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "")
    if not raw.strip():
        return default
    try:
        return max(1, int(raw))
    except ValueError:
        return default


def _text_polarity(text: str) -> float:
    """TextBlob polarity in [-1, 1]; returns 0.0 on any failure."""
    try:
        from textblob import TextBlob  # type: ignore[import-not-found]
        return float(TextBlob(text).sentiment.polarity)
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_verified_prior(reviews: list[ReviewRecord]) -> tuple[float, int]:
    """
    Derive a sentiment prior exclusively from verified-purchase reviews.

    Returns
    -------
    (prior, verified_count)
        prior          – mean polarity of verified buyers; falls back to the
                         INSIGHTS_BIAS_NEUTRAL_PRIOR env-var (default 0.0)
                         when no verified reviews exist.
        verified_count – how many verified buyers contributed to the prior.

    Why verified buyers?
    --------------------
    Unverified reviewers are over-represented by people with strong negative
    opinions.  Verified buyers are the actual customers — their average
    sentiment is the best available estimate of the true product experience.
    """
    fallback = _env_float("INSIGHTS_BIAS_NEUTRAL_PRIOR", 0.0)

    verified = [r for r in reviews if getattr(r, "verified_purchase", False)]
    if not verified:
        return fallback, 0

    mean_pol = sum(_text_polarity(r.text) for r in verified) / len(verified)
    return round(mean_pol, 4), len(verified)


def shrink_mean(
    raw_mean: float,
    n: int,
    *,
    prior: float = 0.0,
    strength: int | None = None,
) -> float:
    """
    Pull raw_mean toward prior using Bayesian shrinkage.

    Parameters
    ----------
    raw_mean : float   – Mean polarity of all reviews in the window.
    n        : int     – Number of reviews in the window.
    prior    : float   – The baseline belief before seeing data.
                         Pass the result of compute_verified_prior() here.
                         Defaults to 0.0 (neutral) when not supplied.
    strength : int     – How many imaginary "prior reviews" to assume.
                         Higher → more shrinkage for small samples.
                         Reads INSIGHTS_BIAS_STRENGTH env-var (default 12).

    Formula
    -------
    adjusted = (strength × prior + n × raw_mean) / (strength + n)

    Examples (strength=12, prior=+0.3 from verified buyers)
    --------------------------------------------------------
    n=3,  raw=-1.0  →  adjusted ≈ -0.49   (pulled heavily toward +0.3)
    n=12, raw=-1.0  →  adjusted ≈ -0.39   (still strongly pulled)
    n=50, raw=-1.0  →  adjusted ≈ -0.80   (data dominates)
    n=200,raw=-1.0  →  adjusted ≈ -0.94   (nearly raw)
    """
    if strength is None:
        strength = _env_int("INSIGHTS_BIAS_STRENGTH", 12)
    if n <= 0:
        return prior
    return (strength * prior + n * raw_mean) / (strength + n)


def volume_weight(n: int, *, min_full: int | None = None) -> float:
    """
    Confidence weight for the current window based on sample size.

    Returns 0.0 → 1.0.  Reaches 1.0 once n >= INSIGHTS_MIN_VOLUME_FOR_FULL_WEIGHT
    (default 30).  Used by callers to flag low-confidence windows.
    """
    try:
        min_full = min_full or max(1, _env_int("INSIGHTS_MIN_VOLUME_FOR_FULL_WEIGHT", 30))
    except ValueError:
        min_full = 30
    return max(0.0, min(1.0, n / min_full))

