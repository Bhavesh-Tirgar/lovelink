import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, onMessage) => {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    // Use a ref so reconnect count never triggers re-renders or dep changes
    const reconnectCountRef = useRef(0);

    // Max 5 retries, with exponential backoff: 2s, 4s, 8s, 16s, 30s
    const getBackoffDelay = (attempt) => {
        const delays = [2000, 4000, 8000, 16000, 30000];
        return delays[Math.min(attempt, delays.length - 1)];
    };

    const connect = useCallback(() => {
        if (reconnectCountRef.current > 5) {
            console.error("WebSocket reached max reconnect attempts");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token || !url) return;

        // Close any existing connection cleanly before opening a new one
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            wsRef.current.onclose = null; // suppress the reconnect handler
            wsRef.current.close(1000, "Reconnecting");
        }

        const connectUrl = `${url}?token=${token}`;
        const ws = new WebSocket(connectUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("[WS] Connected");
            setIsConnected(true);
            reconnectCountRef.current = 0; // Reset without triggering re-render
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') {
                    setIsConnected(true);
                } else {
                    onMessage(data);
                }
            } catch (error) {
                console.error("[WS] Error parsing message:", error);
            }
        };

        ws.onclose = (event) => {
            console.log("[WS] Closed", event.code, event.reason);
            setIsConnected(false);
            wsRef.current = null;

            // Don't reconnect on intentional closure (code 1000)
            if (event.code !== 1000) {
                const attempt = reconnectCountRef.current;
                const delay = getBackoffDelay(attempt);
                console.log(`[WS] Reconnecting in ${delay}ms... (Attempt ${attempt + 1})`);
                reconnectCountRef.current += 1;
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            }
        };

        ws.onerror = (error) => {
            console.error("[WS] Error:", error);
            // onclose will fire after onerror and handle reconnect
        };
    }, [url, onMessage]); // reconnectCount is a ref now — no longer a dep!

    useEffect(() => {
        if (!url) return;
        connect();

        return () => {
            reconnectCountRef.current = 6; // Prevent any pending reconnect
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.onclose = null; // Suppress reconnect handler
                wsRef.current.close(1000, "Component unmounted");
            }
        };
    }, [connect]);

    const sendMessage = useCallback((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        } else {
            console.warn("[WS] Not connected, message not sent");
        }
    }, []);

    return { sendMessage, isConnected };
};

export default useWebSocket;
