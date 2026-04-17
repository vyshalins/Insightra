"""Split sorted reviews into previous vs current time windows."""

from __future__ import annotations

from models.schema import ReviewRecord


def split_windows(
    reviews: list[ReviewRecord],
    window_size: int,
) -> tuple[list[ReviewRecord], list[ReviewRecord]]:
    """
    Sort by timestamp ascending; return (previous_window, current_window).

    When fewer than 2 * window_size reviews, use a single split at midpoint
    so both buckets are non-empty when possible.
    """
    if window_size < 1:
        window_size = 1

    sorted_rev = sorted(reviews, key=lambda r: r.timestamp)
    n = len(sorted_rev)
    if n == 0:
        return [], []

    if n >= 2 * window_size:
        current = sorted_rev[-window_size:]
        previous = sorted_rev[-2 * window_size : -window_size]
        return previous, current

    if n == 1:
        return [], sorted_rev

    mid = max(1, n // 2)
    previous = sorted_rev[:mid]
    current = sorted_rev[mid:]
    return previous, current
