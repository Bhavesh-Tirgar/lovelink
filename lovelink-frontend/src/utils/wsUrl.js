/**
 * Utility to reliably compute the WebSocket base URL across local dev and production (Vercel/Render).
 */
export const getWsBaseUrl = () => {
    // 1. Explicit env variable for WS URL
    if (process.env.REACT_APP_WS_URL) {
        return process.env.REACT_APP_WS_URL.replace(/\/$/, '');
    }

    // 2. Derive from API URL
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL
            .replace(/^http:\/\//i, 'ws://')
            .replace(/^https:\/\//i, 'wss://')
            .replace(/\/$/, '');
    }

    // 3. Fallback based on browser environment
    if (typeof window !== 'undefined') {
        const isHttps = window.location.protocol === 'https:';
        // If hosted on Vercel or any remote domain, connect to the production Render backend
        if (
            window.location.hostname.includes('vercel.app') ||
            (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
        ) {
            return 'wss://lovelink-sfzx.onrender.com';
        }
        return `${isHttps ? 'wss://' : 'ws://'}${window.location.hostname}:8000`;
    }

    return 'ws://localhost:8000';
};
