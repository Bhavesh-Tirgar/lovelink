import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, onMessage) => {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectCountRef = useRef(0);
    const isMountedRef = useRef(true);
    const onMessageRef = useRef(onMessage);

    // Keep onMessageRef up to date without triggering reconnections
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // Max 5 retries: 2s, 4s, 8s, 16s, 30s
    const getBackoffDelay = (attempt) => {
        const delays = [2000, 4000, 8000, 16000, 30000];
        return delays[Math.min(attempt, delays.length - 1)];
    };

    const connect = useCallback(() => {
        if (!isMountedRef.current) return;

        if (reconnectCountRef.current > 6) {
            console.warn("[WS] Reached max reconnect attempts for:", url);
            return;
        }

        const token = localStorage.getItem('token');
        if (!token || !url) return;

        // Clean up previous socket if any
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.close(1000, "Reconnecting");
        }

        const connectUrl = url.includes('?') ? `${url}&token=${token}` : `${url}?token=${token}`;
        const ws = new WebSocket(connectUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!isMountedRef.current) return;
            console.log("[WS] Connected to:", url);
            setIsConnected(true);
            reconnectCountRef.current = 0;
        };

        ws.onmessage = (event) => {
            if (!isMountedRef.current) return;
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') {
                    setIsConnected(true);
                } else if (onMessageRef.current) {
                    onMessageRef.current(data);
                }
            } catch (error) {
                console.error("[WS] Error parsing message:", error);
            }
        };

        ws.onclose = (event) => {
            if (!isMountedRef.current) return;
            console.log("[WS] Closed", event.code, event.reason);
            setIsConnected(false);
            wsRef.current = null;

            // Reconnect if not cleanly closed with 1000
            if (event.code !== 1000) {
                const attempt = reconnectCountRef.current;
                const delay = getBackoffDelay(attempt);
                console.log(`[WS] Reconnecting in ${delay}ms... (Attempt ${attempt + 1})`);
                reconnectCountRef.current += 1;
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) connect();
                }, delay);
            }
        };

        ws.onerror = (error) => {
            console.warn("[WS] Error encountered on:", url);
            setIsConnected(false);
        };
    }, [url]);

    useEffect(() => {
        isMountedRef.current = true;
        reconnectCountRef.current = 0;

        if (url) {
            connect();
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.close(1000, "Clean cleanup");
                wsRef.current = null;
            }
        };
    }, [url, connect]);

    const sendMessage = useCallback((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        } else {
            console.warn("[WS] Not connected, message not sent:", data);
        }
    }, []);

    return { sendMessage, isConnected };
};

export default useWebSocket;
