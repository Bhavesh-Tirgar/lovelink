import re
from typing import Optional


# Compiled regex matching all common YouTube URL patterns
_YT_PATTERNS = [
    re.compile(r'(?:youtube\.com/watch\?(?:.*&)?v=)([A-Za-z0-9_\-]{11})'),
    re.compile(r'youtu\.be/([A-Za-z0-9_\-]{11})'),
    re.compile(r'youtube\.com/shorts/([A-Za-z0-9_\-]{11})'),
    re.compile(r'youtube\.com/embed/([A-Za-z0-9_\-]{11})'),
    re.compile(r'm\.youtube\.com/watch\?(?:.*&)?v=([A-Za-z0-9_\-]{11})'),
]


def extract_youtube_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from any common YouTube URL format."""
    if not url:
        return None
    for pattern in _YT_PATTERNS:
        match = pattern.search(url)
        if match:
            return match.group(1)
    return None


def get_youtube_thumbnail(video_id: str) -> str:
    """Return the maxresdefault thumbnail URL for a YouTube video."""
    return f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"


def get_youtube_embed_url(video_id: str, origin: str = "http://localhost:3000") -> str:
    """Return an embed URL with JS API enabled and clean player controls."""
    return (
        f"https://www.youtube.com/embed/{video_id}"
        f"?enablejsapi=1&origin={origin}&controls=0&rel=0&modestbranding=1"
    )
