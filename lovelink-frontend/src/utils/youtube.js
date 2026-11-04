/**
 * Client-side YouTube URL utilities mirroring backend utils/youtube.py
 */

const YT_PATTERNS = [
    /youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_\-]{11})/,
    /youtu\.be\/([A-Za-z0-9_\-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_\-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_\-]{11})/,
    /m\.youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_\-]{11})/,
];

export function extractYouTubeId(url) {
    if (!url) return null;
    for (const pattern of YT_PATTERNS) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export function getYouTubeThumbnail(videoId, quality = 'mqdefault') {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
