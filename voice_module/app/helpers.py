"""Small helpers that must not live in `utils.py` (module name collision with `utils/`)."""

from __future__ import annotations

import re


def extract_video_id(url: str) -> str | None:
    """Extract an 11-character YouTube video id from a URL or raw id string."""
    if not url or not str(url).strip():
        return None
    s = str(url).strip()
    if re.fullmatch(r"[0-9A-Za-z_-]{11}", s):
        return s
    pattern = r"(?:v=|/)([0-9A-Za-z_-]{11})"
    match = re.search(pattern, s)
    return match.group(1) if match else None
