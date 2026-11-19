import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Eraser, Sparkles } from 'lucide-react';
import api from '../api';
import useWebSocket from '../hooks/useWebSocket';
import { getWsBaseUrl } from '../utils/wsUrl';

function DoodleBoard() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [coupleId, setCoupleId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('couple_id') : null));
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ec4899'); // default pink
    const [brushSize, setBrushSize] = useState(4);
    const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'

    const lastPosData = useRef(null);
    const lastSendTimeRef = useRef(0);
    const sendMessageRef = useRef(null);

    const WS_URL = getWsBaseUrl();

    // 1. Drawing helper using normalized (0.0 to 1.0) coordinates
    const renderStroke = useCallback((nx0, ny0, nx1, ny1, strokeColor, strokeWidth) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.beginPath();
        ctx.moveTo(nx0 * w, ny0 * h);
        ctx.lineTo(nx1 * w, ny1 * h);

        ctx.strokeStyle = strokeColor === 'eraser' ? '#080612' : strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (strokeColor === 'eraser') {
            ctx.globalCompositeOperation = "destination-out";
        } else {
            ctx.globalCompositeOperation = "source-over";
        }

        ctx.stroke();
        ctx.closePath();
    }, []);

    // 2. WebSocket listener for live partner strokes
    const onWSMessage = useCallback((data) => {
        if (!data) return;
        if (data.type === 'doodle_draw') {
            renderStroke(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
        } else if (data.type === 'doodle_clear') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [renderStroke]);

    const { sendMessage, isConnected } = useWebSocket(
        coupleId ? `${WS_URL}/ws/chat/${coupleId}` : null,
        onWSMessage
    );
    sendMessageRef.current = sendMessage;

    // 3. Auth & Setup
    useEffect(() => {
        api.get('/dashboard').then(res => {
            if (!res.data.linked) {
                navigate('/dashboard');
                return;
            }
            if (res.data.couple_id) {
                setCoupleId(res.data.couple_id);
                try { localStorage.setItem('couple_id', res.data.couple_id); } catch {}
            }
        }).catch(() => navigate('/dashboard'));
    }, [navigate]);

    // 4. Canvas Resizing with ratio preservation
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const canvas = canvasRef.current;
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                tempCanvas.width = canvas.width || rect.width;
                tempCanvas.height = canvas.height || rect.height;
                if (canvas.width > 0 && canvas.height > 0) {
                    tempCtx.drawImage(canvas, 0, 0);
                }

                canvas.width = rect.width;
                canvas.height = rect.height;

                if (tempCanvas.width > 0 && tempCanvas.height > 0) {
                    canvas.getContext('2d').drawImage(tempCanvas, 0, 0, rect.width, rect.height);
                }
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // 5. Normalized Coordinate Extractor
    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        let clientX = e.clientX;
        let clientY = e.clientY;

        if (clientX === undefined && e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        if (clientX === undefined || clientY === undefined) return null;

        return {
            nx: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
            ny: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        };
    };

    const startDrawing = (e) => {
        const pos = getCoordinates(e);
        if (!pos) return;
        setIsDrawing(true);
        lastPosData.current = pos;
        lastSendTimeRef.current = performance.now();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPosData.current = null;
    };

    const handlePointerMove = (e) => {
        if (!isDrawing || !lastPosData.current) return;
        const pos = getCoordinates(e);
        if (!pos) return;

        const currentColor = tool === 'eraser' ? 'eraser' : color;
        const p0 = lastPosData.current;
        const p1 = pos;

        // Render locally immediately for responsive 120fps feel
        renderStroke(p0.nx, p0.ny, p1.nx, p1.ny, currentColor, brushSize);

        // Throttle WebSocket dispatch to max 40 events/sec to prevent connection drops
        const now = performance.now();
        if (now - lastSendTimeRef.current >= 25) {
            lastSendTimeRef.current = now;
            sendMessageRef.current?.({
                type: 'doodle_draw',
                x0: p0.nx,
                y0: p0.ny,
                x1: p1.nx,
                y1: p1.ny,
                color: currentColor,
                size: brushSize
            });
        }

        lastPosData.current = pos;
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        sendMessageRef.current?.({ type: 'doodle_clear' });
    };

    const COLORS = [
        '#ef4444', // red
        '#ec4899', // pink
        '#8b5cf6', // purple
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // yellow
        '#ffffff', // white
    ];

    return (
        <div className="flex flex-col h-[100dvh] bg-[#080612] text-white select-none overflow-hidden">
            {/* Top Navigation & Tool Palette */}
            <header className="flex items-center justify-between px-3 py-2.5 bg-black/40 backdrop-blur-md border-b border-white/10 z-20">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/hub')}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        title="Back to Hub"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-bold flex items-center gap-1.5 text-white">
                            <span>Shared Canvas</span>
                            <Sparkles size={14} className="text-pink-400" />
                        </h1>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Colors */}
                    <div className="flex gap-1.5 px-1.5">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => { setTool('pen'); setColor(c); }}
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-transform ${tool === 'pen' && color === c ? 'scale-125 ring-2 ring-white/60 shadow-lg' : 'hover:scale-110 opacity-80'}`}
                                style={{ backgroundColor: c }}
                                title="Pen Color"
                            />
                        ))}
                    </div>

                    <div className="w-px h-5 bg-white/20 mx-0.5" />

                    {/* Sizes */}
                    <div className="flex items-center gap-1.5 px-1">
                        {[2, 4, 8, 14].map(sz => (
                            <button
                                key={sz}
                                type="button"
                                onClick={() => setBrushSize(sz)}
                                className={`flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors ${brushSize === sz ? 'bg-white/20' : ''}`}
                            >
                                <div className="bg-white rounded-full aspect-square" style={{ width: sz + 1, height: sz + 1 }} />
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-5 bg-white/20 mx-0.5" />

                    {/* Eraser */}
                    <button
                        type="button"
                        onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
                        className={`p-1.5 sm:p-2 rounded-full transition-colors ${tool === 'eraser' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/40' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Eraser"
                    >
                        <Eraser size={18} />
                    </button>
                </div>

                {/* Clear Canvas */}
                <button
                    type="button"
                    onClick={clearBoard}
                    className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
                >
                    <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
                </button>
            </header>

            {/* Canvas Area */}
            <main ref={containerRef} className="flex-1 relative cursor-crosshair touch-none bg-[#0B0E14]">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    onPointerDown={startDrawing}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                />
                
                {/* Live Sync Status Pill */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 pointer-events-none shadow-lg">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="text-[11px] font-mono text-gray-200">
                        {isConnected ? 'Live Sync Active 🟢' : 'Connecting to Partner... 🟡'}
                    </span>
                </div>
            </main>
        </div>
    );
}

export default DoodleBoard;
