import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Eraser } from 'lucide-react';
import api from '../api';
import useWebSocket from '../hooks/useWebSocket';

function DoodleBoard() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [coupleId, setCoupleId] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ec4899'); // default pink
    const [brushSize, setBrushSize] = useState(4);
    const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'

    const lastPosData = useRef(null);

    const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

    // 1. WebSocket Hook
    const { sendMessage } = useWebSocket(
        coupleId ? `${WS_URL}/ws/chat/${coupleId}` : null,
        (data) => {
            if (data.type === 'doodle_draw') {
                drawOnCanvas(data.x0, data.y0, data.x1, data.y1, data.color, data.size, false);
            } else if (data.type === 'doodle_clear') {
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
    );

    // 2. Auth & Setup
    useEffect(() => {
        api.get('/dashboard').then(res => {
            if (!res.data.linked) {
                navigate('/dashboard');
                return;
            }
            setCoupleId(res.data.couple_id);
        }).catch(() => navigate('/dashboard'));
    }, [navigate]);

    // 3. Canvas Resizing
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const canvas = canvasRef.current;
                // Keep existing drawing data if resizing
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = canvas.width || rect.width;
                tempCanvas.height = canvas.height || rect.height;
                if (canvas.width) {
                    tempCtx.drawImage(canvas, 0, 0);
                }

                canvas.width = rect.width;
                canvas.height = rect.height;

                if (tempCanvas.width) {
                    canvas.getContext('2d').drawImage(tempCanvas, 0, 0);
                }
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // 4. Drawing Logic
    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();

        // Scale mapping because internal width/height might differ from CSS
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        if (clientX === undefined) return null;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const drawOnCanvas = (x0, y0, x1, y1, strokeColor, strokeWidth, isLocal) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Drawing config
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);

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

        if (isLocal && coupleId) {
            // Broadcast over WS
            sendMessage({
                type: 'doodle_draw',
                x0, y0, x1, y1,
                color: strokeColor,
                size: strokeWidth
            });
        }
    };

    const startDrawing = (e) => {
        const pos = getCoordinates(e);
        if (!pos) return;
        setIsDrawing(true);
        lastPosData.current = pos;
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPosData.current = null;
    };

    const handlePointerMove = (e) => {
        if (!isDrawing || !lastPosData.current) return;

        const pos = getCoordinates(e);
        if (!pos) return;

        drawOnCanvas(
            lastPosData.current.x,
            lastPosData.current.y,
            pos.x,
            pos.y,
            tool === 'eraser' ? 'eraser' : color,
            brushSize,
            true
        );
        lastPosData.current = pos;
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (coupleId) {
            sendMessage({ type: 'doodle_clear' });
        }
    };

    const COLORS = [
        '#ef4444', // red
        '#ec4899', // pink
        '#8b5cf6', // purple
        '#3b82f6', // blue
        '#10b981', // green
        '#eab308', // yellow
        '#ffffff'  // white
    ];

    return (
        <div className="flex flex-col h-screen bg-[#080612] text-white overflow-hidden fixed inset-0">

            {/* Top Bar */}
            <header className="flex-none border-b border-white/10 bg-[#080612]/90 px-4 flex items-center justify-between h-16 z-20 shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-semibold hidden sm:block">Live Doodle</span>
                </div>

                {/* Tools */}
                <div className="flex items-center gap-1 sm:gap-4 bg-white/5 rounded-full px-2 py-1 border border-white/10">
                    {/* Colors */}
                    <div className="flex gap-1.5 px-2">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => { setTool('pen'); setColor(c); }}
                                className={`w-6 h-6 rounded-full transition-transform ${tool === 'pen' && color === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                                style={{ backgroundColor: c }}
                                title="Pen Color"
                            />
                        ))}
                    </div>

                    <div className="w-px h-6 bg-white/20 mx-1" />

                    {/* Sizes */}
                    <div className="flex items-center gap-2 px-2">
                        {[2, 4, 8, 16].map(sz => (
                            <button
                                key={sz}
                                onClick={() => setBrushSize(sz)}
                                className={`flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors ${brushSize === sz ? 'bg-white/20' : ''}`}
                            >
                                <div className="bg-white rounded-full aspect-square" style={{ width: sz + 2, height: sz + 2 }} />
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-white/20 mx-1" />

                    {/* Eraser */}
                    <button
                        onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
                        className={`p-2 rounded-full transition-colors ${tool === 'eraser' ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Eraser"
                    >
                        <Eraser size={20} />
                    </button>
                </div>

                <button
                    onClick={clearBoard}
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-full transition-colors"
                >
                    <Trash2 size={18} /> <span className="hidden sm:block">Clear</span>
                </button>
            </header>

            {/* Canvas Area */}
            <main ref={containerRef} className="flex-1 relative cursor-crosshair touch-none">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    onPointerDown={startDrawing}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                />
                {coupleId && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur border border-white/10 rounded-full px-3 py-1 pointer-events-none">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-mono text-emerald-100">Live Sync Engaged</span>
                    </div>
                )}
            </main>
        </div>
    );
}

export default DoodleBoard;
