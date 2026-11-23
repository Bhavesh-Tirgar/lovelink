import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Camera, RefreshCw, Send, X, Flame, Sparkles, 
    Heart, Eye, Upload
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../api';

// Web Audio sound synthesizer for authentic shutter sound & snap chimes
const playSnapSound = (type) => {
    try {
        const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        if (type === 'shutter') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'send') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'pop') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch {}
};

const FILTERS = [
    { id: 'normal', name: 'Original', style: {} },
    { id: 'love', name: '💖 Love Glow', style: { filter: 'sepia(0.2) saturate(1.4) hue-rotate(-15deg) contrast(1.05)' } },
    { id: 'golden', name: '✨ Golden Hour', style: { filter: 'sepia(0.35) saturate(1.5) contrast(1.1) brightness(1.05)' } },
    { id: 'vintage', name: '🎞️ 90s Retro', style: { filter: 'contrast(1.2) saturate(0.85) sepia(0.25)' } },
    { id: 'blush', name: '🌸 Blush Petals', style: { filter: 'hue-rotate(330deg) saturate(1.3) brightness(1.05)' } },
    { id: 'noir', name: '🖤 Noir Chic', style: { filter: 'grayscale(1) contrast(1.3)' } },
];

export default function Snap() {
    const [viewMode, setViewMode] = useState('camera'); // 'camera' | 'inbox'
    const [facingMode, setFacingMode] = useState('user');
    const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
    const [capturedImage, setCapturedImage] = useState(null);
    const [caption, setCaption] = useState('');
    const [isViewOnce, setIsViewOnce] = useState(true);
    const snapTimer = 5; // 5s standard ephemeral timer
    const [sending, setSending] = useState(false);
    
    // Streaks and Feed State
    const [streak, setStreak] = useState(0);
    const [snaps, setSnaps] = useState([]);
    const [activeSnapViewing, setActiveSnapViewing] = useState(null);
    const [viewProgress, setViewProgress] = useState(100);
    const [cameraActive, setCameraActive] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    })();
    const partnerName = user?.partner_name || "Partner";

    // ── 1. Fetch Feed & Streaks ─────────────────────────────────────────────────
    const fetchFeed = useCallback(async () => {
        try {
            const res = await api.get('/snap/feed');
            if (res.data) {
                setSnaps(res.data.snaps || []);
                setStreak(res.data.streak || 0);
            }
        } catch {
            // fallback
        }
    }, []);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    // ── 2. Camera Lifecycle ─────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        if (capturedImage || viewMode !== 'camera') return;
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
                setCameraActive(true);
            }
        } catch (err) {
            console.warn("Camera init deferred, fallback to file upload:", err);
            setCameraActive(false);
        }
    }, [facingMode, capturedImage, viewMode]);

    useEffect(() => {
        startCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [startCamera]);

    const toggleFacingMode = () => {
        playSnapSound('pop');
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    // ── 3. Photo Capture ────────────────────────────────────────────────────────
    const takePhoto = () => {
        playSnapSound('shutter');
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Memory-safe scaling: clamp max resolution to 1280 to prevent Android OOM
        let targetW = video.videoWidth || 720;
        let targetH = video.videoHeight || 1280;
        const maxDimension = 1280;
        if (targetW > maxDimension || targetH > maxDimension) {
            if (targetW > targetH) {
                targetH = Math.round((targetH * maxDimension) / targetW);
                targetW = maxDimension;
            } else {
                targetW = Math.round((targetW * maxDimension) / targetH);
                targetH = maxDimension;
            }
        }
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
        setCapturedImage(dataUrl);

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            setCameraActive(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const rawData = reader.result;
            // Downscale uploaded gallery photos to prevent massive Base64 memory bloating
            const img = new Image();
            img.onload = () => {
                const offscreenCanvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;
                const maxDim = 1280;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                offscreenCanvas.width = w;
                offscreenCanvas.height = h;
                const ctx = offscreenCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const compressedUrl = offscreenCanvas.toDataURL('image/jpeg', 0.80);
                setCapturedImage(compressedUrl);
                playSnapSound('pop');
            };
            img.src = rawData;
        };
        reader.readAsDataURL(file);
    };

    const retakePhoto = () => {
        playSnapSound('pop');
        setCapturedImage(null);
        setCaption('');
        startCamera();
    };

    // ── 4. Send Snap to Partner ─────────────────────────────────────────────────
    const handleSendSnap = async () => {
        if (!capturedImage) return;
        setSending(true);
        playSnapSound('send');

        try {
            const res = await api.post('/snap/send', {
                media_url: capturedImage,
                caption: caption.trim(),
                filter: selectedFilter.id,
                duration: isViewOnce ? 0 : snapTimer,
                is_view_once: isViewOnce
            });

            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });

            toast.success(`Snap sent to ${partnerName}! 💖`, { icon: '📸' });
            if (res.data?.streak) {
                setStreak(res.data.streak);
            }
            setCapturedImage(null);
            setCaption('');
            fetchFeed();
            startCamera();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Could not send snap");
        } finally {
            setSending(false);
        }
    };

    // ── 5. Open & View Ephemeral Snap ───────────────────────────────────────────
    const openSnap = async (snap) => {
        playSnapSound('pop');
        setActiveSnapViewing(snap);
        setViewProgress(100);

        try {
            await api.post(`/snap/${snap.id}/open`);
            setSnaps(prev => prev.map(s => s.id === snap.id ? { ...s, status: 'opened' } : s));
        } catch {}

        const durationSec = snap.is_view_once ? 6 : (snap.duration || 6);
        const startTime = Date.now();
        const totalMs = durationSec * 1000;

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / totalMs) * 100);
            setViewProgress(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                setActiveSnapViewing(null);
                fetchFeed();
            }
        }, 50);
    };

    const closeViewer = () => {
        setActiveSnapViewing(null);
        fetchFeed();
    };

    const reactToActiveSnap = async (emoji = "❤️") => {
        playSnapSound('pop');
        confetti({ particleCount: 50, spread: 60 });
        if (activeSnapViewing) {
            try {
                await api.post(`/snap/${activeSnapViewing.id}/react`, { reaction: emoji });
            } catch {}
        }
    };

    const unviewedPartnerSnaps = snaps.filter(
        s => s.sender_id !== user?.id && s.status === 'delivered'
    );

    return (
        <div className="relative min-h-[100dvh] bg-black text-white overflow-hidden select-none">
            {/* Top Snap Bar */}
            <div className="absolute top-0 inset-x-0 z-40 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                {/* Snap Streak Badge */}
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                    <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span className="text-sm font-black text-white">{streak}</span>
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Streak</span>
                </div>

                {/* View Switcher: Camera vs Inbox */}
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xl p-1 rounded-full border border-white/15">
                    <button
                        onClick={() => { setViewMode('camera'); startCamera(); }}
                        className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                            viewMode === 'camera' ? 'bg-amber-400 text-black shadow-md' : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        📸 Camera
                    </button>
                    <button
                        onClick={() => { setViewMode('inbox'); fetchFeed(); }}
                        className={`relative px-3 py-1 rounded-full text-xs font-black transition-all ${
                            viewMode === 'inbox' ? 'bg-amber-400 text-black shadow-md' : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        <span>📬 Snaps</span>
                        {unviewedPartnerSnaps.length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                                {unviewedPartnerSnaps.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* VIEW 1: CAMERA & CAPTURE VIEWPORT */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {viewMode === 'camera' && (
                <div className="relative w-full h-[100dvh] flex flex-col justify-between">
                    {/* Viewfinder Video Stream or Frozen Captured Image */}
                    <div className="relative w-full h-full overflow-hidden bg-[#0c0d14]">
                        {!capturedImage ? (
                            <>
                                <video
                                    ref={videoRef}
                                    playsInline
                                    muted
                                    autoPlay
                                    style={selectedFilter.style}
                                    className={`w-full h-full object-cover transition-all ${
                                        facingMode === 'user' ? '-scale-x-100' : ''
                                    }`}
                                />
                                {!cameraActive && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-sm">
                                        <Camera className="w-16 h-16 text-amber-400 mb-3 animate-bounce" />
                                        <p className="text-sm font-bold text-gray-200">Camera preview unavailable in this browser</p>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="mt-4 px-5 py-2.5 rounded-2xl bg-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-2 active:scale-95 transition"
                                        >
                                            <Upload className="w-4 h-4" />
                                            <span>Upload / Take Photo</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="relative w-full h-full">
                                <img
                                    src={capturedImage}
                                    alt="Snap"
                                    style={selectedFilter.style}
                                    className="w-full h-full object-cover"
                                />

                                {/* Draggable/Editable Romantic Caption Bar */}
                                <div className="absolute bottom-36 inset-x-4 flex justify-center">
                                    <div className="w-full max-w-sm px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 shadow-2xl flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            placeholder={`Add sweet note for ${partnerName}... 💖`}
                                            className="w-full bg-transparent text-sm font-bold text-white placeholder-gray-400 outline-none"
                                            maxLength={80}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Filter Selector Pills (before capture) */}
                    {!capturedImage && (
                        <div className="absolute bottom-28 inset-x-0 z-30 flex items-center justify-center gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
                            {FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => { playSnapSound('pop'); setSelectedFilter(f); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap backdrop-blur-xl transition-all ${
                                        selectedFilter.id === f.id
                                            ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40 scale-105 border border-amber-300'
                                            : 'bg-black/60 text-gray-300 border border-white/10 hover:bg-black/80'
                                    }`}
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Bottom Action Controls */}
                    <div className="absolute bottom-6 inset-x-0 z-30 px-6 flex items-center justify-between pb-[env(safe-area-inset-bottom)]">
                        {!capturedImage ? (
                            <>
                                {/* Gallery / File Upload */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white hover:bg-white/10 active:scale-90 transition"
                                    title="Choose from gallery"
                                >
                                    <Upload className="w-5 h-5 text-gray-200" />
                                </button>

                                {/* Big Shutter Button */}
                                <motion.button
                                    whileTap={{ scale: 0.88 }}
                                    onClick={takePhoto}
                                    className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] group active:scale-95 transition"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white group-hover:bg-amber-300 transition-colors" />
                                </motion.button>

                                {/* Flip Camera */}
                                <button
                                    onClick={toggleFacingMode}
                                    className="p-3.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white hover:bg-white/10 active:scale-90 transition"
                                    title="Flip camera"
                                >
                                    <RefreshCw className="w-5 h-5 text-gray-200" />
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Retake / Discard */}
                                <button
                                    onClick={retakePhoto}
                                    className="p-3.5 rounded-full bg-black/70 backdrop-blur-xl border border-white/20 text-white hover:bg-white/10 active:scale-90 transition flex items-center gap-1.5 text-xs font-bold"
                                >
                                    <X className="w-4 h-4" />
                                    <span>Retake</span>
                                </button>

                                {/* View Once / Timer Toggle */}
                                <button
                                    onClick={() => { playSnapSound('pop'); setIsViewOnce(!isViewOnce); }}
                                    className={`px-4 py-2.5 rounded-2xl backdrop-blur-xl border text-xs font-black flex items-center gap-2 transition ${
                                        isViewOnce
                                            ? 'bg-rose-500/25 border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                                            : 'bg-white/10 border-white/20 text-white'
                                    }`}
                                >
                                    <Eye className="w-4 h-4" />
                                    <span>{isViewOnce ? 'View Once ⏱️' : 'Keep'}</span>
                                </button>

                                {/* Send Snap */}
                                <motion.button
                                    whileTap={{ scale: 0.92 }}
                                    disabled={sending}
                                    onClick={handleSendSnap}
                                    className="px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-sm shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center gap-2 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                                >
                                    <span>{sending ? 'Sending...' : 'Send'}</span>
                                    <Send className="w-4 h-4 fill-black" />
                                </motion.button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* VIEW 2: SNAP INBOX & EPHEMERAL FEED */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {viewMode === 'inbox' && (
                <div className="pt-24 pb-32 px-4 max-w-md mx-auto space-y-6 overflow-y-auto max-h-[100dvh]">
                    {/* Streaks Card */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 via-black to-black border border-amber-500/30 text-center space-y-3 shadow-2xl">
                        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-3xl shadow-inner animate-pulse">
                            🔥
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">{streak} Day Love Streak!</h2>
                            <p className="text-xs text-gray-300 mt-1">
                                {streak > 0 
                                    ? `You and ${partnerName} are on fire! Don't let your streak break today.`
                                    : `Send a snap to ${partnerName} to ignite your couple streak today!`}
                            </p>
                        </div>
                        <button
                            onClick={() => { setViewMode('camera'); startCamera(); }}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-400/25 active:scale-95 transition"
                        >
                            📸 Send New Snap Now
                        </button>
                    </div>

                    {/* Unopened Partner Snaps */}
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 px-1 mb-3">
                            New Snaps ({unviewedPartnerSnaps.length})
                        </h3>

                        {unviewedPartnerSnaps.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
                                <Sparkles className="w-8 h-8 text-gray-500 mx-auto" />
                                <p className="text-xs text-gray-400">All caught up! No unopened snaps right now.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {unviewedPartnerSnaps.map(snap => (
                                    <div
                                        key={snap.id}
                                        onClick={() => openSnap(snap)}
                                        className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 to-black border-2 border-rose-500/60 flex items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-rose-950/50 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 to-rose-500 animate-spin-slow">
                                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xl">
                                                    📸
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition">
                                                    New Snap from {snap.sender_name}
                                                </h4>
                                                <p className="text-xs text-rose-300 font-medium">
                                                    {snap.is_view_once ? "⏱️ View Once • Tap to open" : "✨ Tap to view"}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-xl bg-rose-500/30 text-rose-300 font-bold text-xs">
                                            Open
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Snaps History */}
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 px-1 mb-3">
                            Recent Snaps
                        </h3>
                        <div className="space-y-2">
                            {snaps.map(snap => {
                                const isMe = snap.sender_id === user?.id;
                                return (
                                    <div
                                        key={snap.id}
                                        className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-base">
                                                {isMe ? "📤" : "📥"}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">
                                                    {isMe ? `Sent to ${partnerName}` : `Received from ${snap.sender_name}`}
                                                </p>
                                                <p className="text-[11px] text-gray-400">
                                                    {snap.status === 'opened' ? "Opened ⏱️" : "Delivered 📬"}
                                                    {snap.caption ? ` • "${snap.caption}"` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        {snap.reaction && (
                                            <span className="text-lg">{snap.reaction}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* FULLSCREEN EPHEMERAL SNAP VIEWER MODAL */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {activeSnapViewing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black flex flex-col justify-between"
                    >
                        {/* Top Progress Bar */}
                        <div className="absolute top-0 inset-x-0 z-50 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                            <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-75 ease-linear"
                                    style={{ width: `${viewProgress}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2 text-xs font-bold text-white drop-shadow">
                                <span>{activeSnapViewing.sender_name}</span>
                                <button onClick={closeViewer} className="p-1 hover:bg-white/20 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Full-bleed Photo */}
                        <div
                            onDoubleClick={() => reactToActiveSnap("❤️")}
                            className="relative w-full h-full flex items-center justify-center cursor-pointer select-none"
                        >
                            <img
                                src={activeSnapViewing.media_url}
                                alt="Snap View"
                                className="w-full h-full object-cover"
                            />

                            {/* Caption Banner */}
                            {activeSnapViewing.caption && (
                                <div className="absolute bottom-28 inset-x-4 flex justify-center pointer-events-none">
                                    <div className="px-5 py-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/25 shadow-2xl text-center">
                                        <p className="text-base font-extrabold text-white">
                                            {activeSnapViewing.caption}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Reaction Bar */}
                        <div className="absolute bottom-6 inset-x-0 z-50 px-6 flex items-center justify-between pb-[env(safe-area-inset-bottom)]">
                            <button
                                onClick={() => reactToActiveSnap("❤️")}
                                className="p-3.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white hover:scale-110 active:scale-95 transition"
                            >
                                <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                            </button>

                            <button
                                onClick={() => {
                                    closeViewer();
                                    setViewMode('camera');
                                    startCamera();
                                }}
                                className="px-5 py-3 rounded-full bg-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition"
                            >
                                <Camera className="w-4 h-4" />
                                <span>Snap Back</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
