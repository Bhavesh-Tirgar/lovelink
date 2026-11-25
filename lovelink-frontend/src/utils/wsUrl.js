/**
 * Utility to reliably compute the WebSocket base URL across local dev and production (Vercel/Render).
 */
export const getWsBaseUrl = () => {
    // 1. Explicit env variable for WS URL
    if (process.env.REACT_APP_WS_URL) {
        return process.env.REACT_APP_WS_URL.replace(/\/+$/, '');
    }

    // 2. Derive from API URL
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL
            .replace(/^http:\/\//i, 'ws://')
            .replace(/^https:\/\//i, 'wss://')
            .replace(/\/+$/, '');
    }

    // 3. Fallback based on browser environment
    if (typeof window !== 'undefined') {
        // Only use local development websocket if specifically accessed via localhost:3000 in browser
        if (
            window.location.hostname === 'localhost' &&
            window.location.port === '3000' &&
            window.location.protocol !== 'capacitor:' &&
            !window['Capacitor']?.isNativePlatform?.() &&
            !navigator.userAgent.includes('Capacitor')
        ) {
            return 'ws://localhost:8000';
        }
    }

    return 'wss://lovelink-xzg7.onrender.com';
};
