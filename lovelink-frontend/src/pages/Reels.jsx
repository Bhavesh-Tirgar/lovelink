import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Heart, Volume2, VolumeX, Plus, 
    ArrowLeft, Link2, Unlink, Trash2, X, Film,
    ChevronDown, ChevronUp, RefreshCw, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../api';
import { getWsBaseUrl } from '../utils/wsUrl';
import AmbientAuraGlow from '../components/ui/AmbientAuraGlow';

export default function Reels() {
    const navigate = useNavigate();

    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true); // Default to muted so mobile browsers allow instant autoplay!
    const [syncWithPartner, setSyncWithPartner] = useState(true);
    const [autoAdvance, setAutoAdvance] = useState(false);
    const [partnerOnline, setPartnerOnline] = useState(false);
    const [isWsConnected, setIsWsConnected] = useState(false);
    
    // Add Reel Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newReelUrl, setNewReelUrl] = useState('');
    const [newReelTitle, setNewReelTitle] = useState('');
    const [newReelCategory, setNewReelCategory] = useState('couple');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Floating particles state: [{ id, emoji, x, y }]
    const [particles, setParticles] = useState([]);
    // Center double-tap big heart animation
    const [bigHeart, setBigHeart] = useState(false);

    // User & Couple state
    const [user] = useState(() => {
        try { return JSON.parse(window.localStorage.getItem('user') || '{}'); } catch { return {}; }
    });
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    const coupleId = user?.couple_id || (typeof window !== 'undefined' ? window.localStorage.getItem('couple_id') : null);
    const userId = user?.id;

    const wsRef = useRef(null);
    const containerRef = useRef(null);
    const isRemoteScrolling = useRef(false);
    const lastTapRef = useRef(0);
    const videoRefs = useRef({});

    // Fetch initial dynamic reels feed
    const fetchFeed = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/reels/feed');
            if (res.data?.reels && res.data.reels.length > 0) {
                setReels(res.data.reels);
            }
        } catch (e) {
            console.error("Failed to fetch reels feed", e);
            toast.error("Could not load reels feed");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    // Spawn floating particle animation
    const triggerFloatingReaction = useCallback((emoji, clientX = null, clientY = null) => {
        const x = clientX !== null ? clientX : window.innerWidth * (0.4 + Math.random() * 0.2);
        const y = clientY !== null ? clientY : window.innerHeight * (0.5 + Math.random() * 0.2);
        
        const newParticle = {
            id: 'p-' + Math.random().toString(36).substring(2, 9),
            emoji,
            x,
            y
        };

        setParticles(prev => [...prev.slice(-15), newParticle]);

        setTimeout(() => {
            setParticles(prev => prev.filter(p => p.id !== newParticle.id));
        }, 1500);

        if (emoji === '❤️') {
            confetti({
                particleCount: 22,
                spread: 45,
                origin: { x: x / window.innerWidth, y: y / window.innerHeight },
                colors: ['#ff4b72', '#ff85a2', '#ffffff']
            });
        }
    }, []);

    // ── WEBSOCKET SETUP ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!coupleId || !token) return;

        let isUnmounted = false;
        let reconnectTimeout = null;

        const connectWs = async () => {
            if (isUnmounted) return;
            const wsBase = getWsBaseUrl();
            let authParam = `token=${token}`;
            try {
                const ticketRes = await api.post('/auth/ws-ticket');
                if (ticketRes.data?.ticket) {
                    authParam = `ticket=${ticketRes.data.ticket}`;
                }
            } catch {
                // Fallback to token if ticket endpoint fails
            }

            if (isUnmounted) return;
            const ws = new WebSocket(`${wsBase}/reels/ws/${coupleId}?${authParam}`);
            wsRef.current = ws;

            ws.onopen = () => {
                if (isUnmounted) return;
                setIsWsConnected(true);
            };

            ws.onclose = (e) => {
                if (isUnmounted) return;
                setIsWsConnected(false);
                if (e.code !== 1000) {
                    reconnectTimeout = setTimeout(connectWs, 3000);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'partner_presence') {
                        setPartnerOnline(!!data.partner_online);
                        if (data.joined_user) {
                            toast.success(`${data.joined_user} joined Reels Lounge! 🎬`, { icon: '🍿' });
                        }
                    } else if (data.type === 'reels_init') {
                        if (data.partner_online !== undefined) {
                            setPartnerOnline(!!data.partner_online);
                        }
                    } else if (data.type === 'scroll_to') {
                        if (data.sender_id !== userId && syncWithPartner) {
                            isRemoteScrolling.current = true;
                            setActiveIndex(data.index);
                            const child = containerRef.current?.children[data.index];
                            if (child) {
                                child.scrollIntoView({ behavior: 'smooth' });
                            }
                            toast(`${data.sender_name || 'Partner'} scrolled to next reel 🍿`, {
                                icon: '✨',
                                duration: 1800
                            });
                            setTimeout(() => {
                                isRemoteScrolling.current = false;
                            }, 800);
                        }
                    } else if (data.type === 'reaction') {
                        const screenX = data.x * window.innerWidth;
                        const screenY = data.y * window.innerHeight;
                        triggerFloatingReaction(data.emoji, screenX, screenY);
                    } else if (data.type === 'reel_added') {
                        setReels(prev => {
                            if (prev.some(r => r.id === data.reel.id)) return prev;
                            return [data.reel, ...prev];
                        });
                        toast.success(`${data.reel.added_by_name || 'Partner'} added a new Reel! 🎬`);
                    } else if (data.type === 'reel_deleted') {
                        setReels(prev => prev.filter(r => r.id !== data.reel_id));
                    } else if (data.type === 'reel_liked') {
                        setReels(prev => prev.map(r => r.id === data.reel_id ? { ...r, likes_count: data.likes_count } : r));
                    }
                } catch (err) {
                    console.error("WS Parse error in Reels", err);
                }
            };
        };

        connectWs();

        return () => {
            isUnmounted = true;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close(1000, "Reels unmounted");
            }
        };
    }, [coupleId, token, userId, syncWithPartner, triggerFloatingReaction]);

    const sendWs = useCallback((payload) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        }
    }, []);

    // Broadcast scroll when active item changes (only if initiated locally)
    const scrollToReelIndex = useCallback((newIdx) => {
        if (newIdx < 0 || newIdx >= reels.length) return;
        setActiveIndex(newIdx);
        const child = containerRef.current?.children[newIdx];
        if (child) {
            child.scrollIntoView({ behavior: 'smooth' });
        }
        if (syncWithPartner) {
            sendWs({
                type: 'scroll_to',
                index: newIdx,
                reel_id: reels[newIdx]?.id
            });
        }
    }, [reels, syncWithPartner, sendWs]);

    const handleScroll = () => {
        if (!containerRef.current || isRemoteScrolling.current) return;
        const scrollTop = containerRef.current.scrollTop;
        const itemHeight = containerRef.current.clientHeight || window.innerHeight;
        const newIdx = Math.round(scrollTop / itemHeight);

        if (newIdx !== activeIndex && newIdx >= 0 && newIdx < reels.length) {
            setActiveIndex(newIdx);
            if (syncWithPartner) {
                sendWs({
                    type: 'scroll_to',
                    index: newIdx,
                    reel_id: reels[newIdx]?.id
                });
            }
        }
    };

    // Auto-advance timer (Hands-free Lounge Mode)
    useEffect(() => {
        if (!autoAdvance || reels.length === 0) return;
        const timer = setTimeout(() => {
            const nextIdx = (activeIndex + 1) % reels.length;
            scrollToReelIndex(nextIdx);
        }, 18000); // 18 seconds per reel

        return () => clearTimeout(timer);
    }, [autoAdvance, activeIndex, reels.length, scrollToReelIndex]);

    const handleSendReaction = useCallback((emoji) => {
        const x = window.innerWidth * (0.65 + Math.random() * 0.2);
        const y = window.innerHeight * (0.6 + Math.random() * 0.15);
        triggerFloatingReaction(emoji, x, y);
        sendWs({
            type: 'reaction',
            emoji,
            x: x / window.innerWidth,
            y: y / window.innerHeight
        });
    }, [triggerFloatingReaction, sendWs]);

    // Keyboard navigation (Web Desktop support)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown' || e.key === 'j') {
                e.preventDefault();
                scrollToReelIndex(activeIndex + 1);
            } else if (e.key === 'ArrowUp' || e.key === 'k') {
                e.preventDefault();
                scrollToReelIndex(activeIndex - 1);
            } else if (e.key === 'm') {
                setIsMuted(m => !m);
            } else if (e.key === ' ') {
                e.preventDefault();
                handleSendReaction('❤️');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, scrollToReelIndex, handleSendReaction]);

    // Double tap screen to send floating heart storm & center heart burst
    const handleDoubleTap = (e) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : rect.width / 2);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : rect.height / 2);

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            setBigHeart(true);
            setTimeout(() => setBigHeart(false), 800);
            triggerFloatingReaction('❤️', clientX, clientY);
            sendWs({
                type: 'reaction',
                emoji: '❤️',
                x: clientX / window.innerWidth,
                y: clientY / window.innerHeight
            });
            handleLike(reels[activeIndex]?.id);
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
            setTimeout(() => {
                if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY && lastTapRef.current !== 0) {
                    setIsMuted(m => !m);
                }
            }, DOUBLE_TAP_DELAY);
        }
    };

    const handleLike = async (reelId) => {
        if (!reelId) return;
        try {
            const res = await api.post(`/reels/${reelId}/like`);
            if (res.data?.likes_count !== undefined) {
                setReels(prev => prev.map(r => r.id === reelId ? { ...r, likes_count: res.data.likes_count } : r));
            }
        } catch {
            setReels(prev => prev.map(r => r.id === reelId ? { ...r, likes_count: (r.likes_count || 0) + 1 } : r));
        }
    };

    const handleDeleteReel = async (reelId) => {
        try {
            await api.delete(`/reels/custom/${reelId}`);
            setReels(prev => prev.filter(r => r.id !== reelId));
            toast.success("Reel deleted from queue");
        } catch {
            toast.error("Could not delete reel");
        }
    };

    const handleAddReelSubmit = async (e) => {
        e.preventDefault();
        if (!newReelUrl.trim()) {
            toast.error("Please paste a video or YouTube Short link");
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await api.post('/reels/custom', {
                url: newReelUrl.trim(),
                title: newReelTitle.trim() || "Cute Couple Clip 💕",
                category: newReelCategory
            });

            if (res.data?.reel) {
                setReels(prev => [res.data.reel, ...prev]);
                toast.success("Clip added to queue! 🎬");
                setIsAddModalOpen(false);
                setNewReelUrl('');
                setNewReelTitle('');
                scrollToReelIndex(0);
            }
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to add reel. Check link.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative w-full h-[100dvh] bg-[#050608] text-white overflow-hidden select-none flex justify-center">
            {/* Ambient Background Mesh Glow */}
            <AmbientAuraGlow className="opacity-70" />

            {/* Main Full-Bleed Phone Container */}
            <div className="relative w-full h-full max-w-[480px] sm:my-2 sm:h-[calc(100dvh-1rem)] sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden bg-black flex flex-col">
                
                {/* ── TOP FLOATING NAVIGATION BAR ── */}
                <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none">
                    <div className="flex items-center gap-2.5 pointer-events-auto">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate('/dashboard')}
                            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/10 transition-all shadow-lg"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </motion.button>
                        <div>
                            <h1 className="text-xs sm:text-sm font-black flex items-center gap-1.5 text-white drop-shadow-md tracking-tight">
                                <span>Reels Lounge</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/40 font-mono">
                                    {reels.length > 0 ? `${activeIndex + 1}/${reels.length}` : '0/0'}
                                </span>
                            </h1>
                            <p className="text-[10px] text-gray-300 drop-shadow flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                                <span>Double-tap to heart 💕</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                        {/* Auto-Advance / Hands-Free Toggle */}
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                                setAutoAdvance(!autoAdvance);
                                toast(
                                    !autoAdvance 
                                        ? "⏯️ Hands-Free Auto-Play ON" 
                                        : "⏸️ Hands-Free Auto-Play OFF"
                                );
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-xl border transition-all ${
                                autoAdvance 
                                    ? 'bg-purple-500/30 border-purple-400 text-purple-200 shadow-lg shadow-purple-500/25' 
                                    : 'bg-black/50 border-white/15 text-gray-400'
                            }`}
                        >
                            {autoAdvance ? 'Auto ⏭️' : 'Manual'}
                        </motion.button>

                        {/* Sync Lock Toggle */}
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                                setSyncWithPartner(!syncWithPartner);
                                toast(
                                    !syncWithPartner 
                                        ? "🔗 Live Co-Scroll Sync ON" 
                                        : "👤 Solo Browsing Mode"
                                );
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-xl border transition-all ${
                                syncWithPartner
                                    ? 'bg-rose-500/30 border-rose-400 text-rose-200 shadow-lg shadow-rose-500/25'
                                    : 'bg-black/50 border-white/15 text-gray-400'
                            }`}
                        >
                            {syncWithPartner ? <Link2 className="w-3 h-3 text-rose-400" /> : <Unlink className="w-3 h-3 text-gray-400" />}
                            <span>{syncWithPartner ? 'Sync' : 'Solo'}</span>
                        </motion.button>

                        {/* Partner Presence Live Dot */}
                        <div 
                            className={`w-7 h-7 rounded-full flex items-center justify-center border backdrop-blur-xl transition-all ${
                                partnerOnline 
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                                    : isWsConnected
                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                        : 'bg-black/50 border-white/15 text-gray-500'
                            }`}
                            title={partnerOnline ? "Partner Watching Together 🟢" : isWsConnected ? "Waiting for Partner ⏳" : "Connecting..."}
                        >
                            <span className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-emerald-400 animate-pulse' : isWsConnected ? 'bg-amber-400' : 'bg-gray-500'}`} />
                        </div>
                    </div>
                </div>

                {/* ── FLOATING SOUND / UNMUTE BADGE ── */}
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(m => !m);
                    }}
                    className="absolute top-16 right-3.5 z-30 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all"
                >
                    {isMuted ? (
                        <>
                            <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                            <span className="text-[11px] text-rose-200">Tap for Sound 🔊</span>
                        </>
                    ) : (
                        <>
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-200">Sound ON 🎵</span>
                        </>
                    )}
                </motion.button>

                {/* ── CENTER DOUBLE-TAP BIG HEART BURST ── */}
                <AnimatePresence>
                    {bigHeart && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.75, ease: "easeOut" }}
                            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
                        >
                            <Heart className="w-28 h-28 text-rose-500 fill-rose-500 drop-shadow-[0_0_40px_rgba(244,63,94,0.9)]" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── FLOATING PARTICLES OVERLAY ── */}
                <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
                    {particles.map(p => (
                        <div
                            key={p.id}
                            className="absolute text-5xl sm:text-6xl animate-float-up pointer-events-none filter drop-shadow-[0_4px_12px_rgba(255,105,180,0.8)]"
                            style={{
                                left: `${p.x}px`,
                                top: `${p.y}px`,
                                transform: 'translate(-50%, -50%)',
                                animation: 'floatUpAndFade 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
                            }}
                        >
                            {p.emoji}
                        </div>
                    ))}
                </div>

                {/* ── VERTICAL SNAP SCROLL CONTAINER ── */}
                {loading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-3 bg-zinc-950">
                        <Film className="w-12 h-12 text-rose-500 animate-pulse" />
                        <p className="text-xs text-gray-400 tracking-wider">Loading couple reels stream...</p>
                    </div>
                ) : reels.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 gap-4 bg-zinc-950">
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(244,63,94,0.25)]">
                            🎬
                        </div>
                        <h2 className="text-lg font-bold text-white">Connecting Stream...</h2>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchFeed}
                            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30 flex items-center gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh Stream
                        </motion.button>
                    </div>
                ) : (
                    <div
                        ref={containerRef}
                        onScroll={handleScroll}
                        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth relative"
                    >
                        {reels.map((reel, index) => {
                            const isActive = index === activeIndex;
                            const isYouTube = reel.source_type === 'youtube';
                            const isDirectMp4 = reel.source_type === 'mp4';
                            const isImage = reel.source_type === 'image';
                            const embedUrl = isYouTube 
                                ? `https://www.youtube-nocookie.com/embed/${reel.video_id}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${reel.video_id}&playsinline=1&rel=0&modestbranding=1`
                                : '';

                            return (
                                <div
                                    key={reel.id || index}
                                    onClick={handleDoubleTap}
                                    className="w-full h-full snap-start relative flex items-center justify-center bg-black overflow-hidden flex-shrink-0"
                                >
                                    {/* Ambient Blurred Backdrop for Full-Bleed Glow */}
                                    <div 
                                        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-35 scale-125 pointer-events-none"
                                        style={{ backgroundImage: `url(${reel.thumbnail_url})` }}
                                    />

                                    {/* Video / Media Player Frame */}
                                    {isYouTube && (
                                        isActive ? (
                                            <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
                                                <iframe
                                                    src={embedUrl}
                                                    title={reel.title}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="w-full h-full min-h-full object-cover pointer-events-none scale-[1.32] sm:scale-[1.15]"
                                                />
                                                <div className="absolute inset-0 z-10 cursor-pointer" />
                                            </div>
                                        ) : (
                                            <div 
                                                className="w-full h-full bg-cover bg-center flex items-center justify-center relative filter blur-sm opacity-50"
                                                style={{ backgroundImage: `url(${reel.thumbnail_url})` }}
                                            >
                                                <div className="w-14 h-14 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white">
                                                    ▶
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {isDirectMp4 && (
                                        <div className="w-full h-full relative flex items-center justify-center bg-black">
                                            <video
                                                ref={el => { if (el) videoRefs.current[reel.id] = el; }}
                                                src={reel.video_id}
                                                autoPlay={isActive}
                                                loop
                                                muted={isMuted}
                                                playsInline
                                                className="w-full h-full object-cover pointer-events-none"
                                            />
                                            <div className="absolute inset-0 z-10 cursor-pointer" />
                                        </div>
                                    )}

                                    {isImage && (
                                        <div className="w-full h-full relative flex items-center justify-center bg-zinc-950 p-2">
                                            <img
                                                src={reel.video_id}
                                                alt={reel.title}
                                                className="w-full h-full object-contain pointer-events-none select-none rounded-2xl"
                                            />
                                            <div className="absolute inset-0 z-10 cursor-pointer" />
                                        </div>
                                    )}

                                    {/* Bottom Luxury Dark Vignette for Text Readability */}
                                    <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-15" />

                                    {/* ── REEL INFO & CAPTION (BOTTOM LEFT) ── */}
                                    <div className="absolute bottom-16 sm:bottom-20 left-4 right-16 z-20 pointer-events-none space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/30 text-rose-200 border border-rose-400/30 backdrop-blur-md">
                                                {reel.category || 'Couple Reel'}
                                            </span>
                                            <span className="text-[11px] text-gray-300 font-semibold drop-shadow">
                                                @{reel.added_by_name || 'LoveLink'}
                                            </span>
                                        </div>

                                        <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 leading-snug drop-shadow-lg">
                                            {reel.title}
                                        </h3>
                                        {reel.caption && (
                                            <p className="text-[11px] text-gray-300 line-clamp-2 font-normal leading-relaxed drop-shadow">
                                                {reel.caption}
                                            </p>
                                        )}
                                    </div>

                                    {/* ── RIGHT FLOATING ACTION BAR ── */}
                                    <div className="absolute bottom-16 sm:bottom-20 right-3 z-20 flex flex-col items-center gap-3 pointer-events-auto">
                                        {/* Like Button */}
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLike(reel.id);
                                                triggerFloatingReaction('❤️');
                                                sendWs({
                                                    type: 'reaction',
                                                    emoji: '❤️',
                                                    x: 0.85,
                                                    y: 0.65
                                                });
                                            }}
                                            className="group flex flex-col items-center gap-0.5"
                                            title="Love this reel"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-rose-400 group-hover:scale-110 group-hover:bg-rose-500/25 transition-all shadow-xl">
                                                <Heart className="w-5 h-5 fill-current text-rose-500" />
                                            </div>
                                            <span className="text-[10px] font-bold text-white drop-shadow">
                                                {reel.likes_count > 999 ? `${(reel.likes_count / 1000).toFixed(1)}k` : reel.likes_count || 0}
                                            </span>
                                        </motion.button>

                                        {/* Laugh Button */}
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendReaction('😂');
                                            }}
                                            className="group flex flex-col items-center gap-0.5"
                                            title="Laugh reaction"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-amber-500/20 transition-all shadow-xl">
                                                😂
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-300 drop-shadow">
                                                Haha
                                            </span>
                                        </motion.button>

                                        {/* Fire Button */}
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendReaction('🔥');
                                            }}
                                            className="group flex flex-col items-center gap-0.5"
                                            title="Fire reaction"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-orange-500/20 transition-all shadow-xl">
                                                🔥
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-300 drop-shadow">
                                                Lit
                                            </span>
                                        </motion.button>

                                        {/* Add Reel Optional Shortcut */}
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsAddModalOpen(true);
                                            }}
                                            className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 transition-all"
                                            title="Add Custom Video or Short"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </motion.button>

                                        {/* Delete Custom Reel */}
                                        {reel.is_custom && (
                                            <motion.button
                                                whileTap={{ scale: 0.85 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm("Remove this reel from couple queue?")) {
                                                        handleDeleteReel(reel.id);
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-gray-400 hover:text-rose-400 transition-all"
                                                title="Delete Reel"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── DESKTOP NAVIGATION ARROWS (Next/Prev) ── */}
                <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-2 pointer-events-auto">
                    <button
                        onClick={() => scrollToReelIndex(activeIndex - 1)}
                        disabled={activeIndex === 0}
                        className="w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scrollToReelIndex(activeIndex + 1)}
                        disabled={activeIndex === reels.length - 1}
                        className="w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── ADD SHORT / REEL MODAL ── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 to-black border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Add Clip to Shared Lounge</h3>
                                    <p className="text-xs text-gray-400">Paste any YouTube Short or direct video URL</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddReelSubmit} className="space-y-3 pt-2">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                                    Video Link (YouTube Short / MP4)
                                </label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://youtube.com/shorts/... or https://..."
                                    value={newReelUrl}
                                    onChange={(e) => setNewReelUrl(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                                    Title / Mood Note
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. This is literally us 😂"
                                    value={newReelTitle}
                                    onChange={(e) => setNewReelTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                                    Category
                                </label>
                                <select
                                    value={newReelCategory}
                                    onChange={(e) => setNewReelCategory(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
                                >
                                    <option value="couple">Couple Moments 💕</option>
                                    <option value="funny">Funny & Memes 😂</option>
                                    <option value="wholesome">Wholesome & Cute 🥺</option>
                                    <option value="relatable">Super Relatable 🍟</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Adding Clip..." : "Add to Lounge Queue 🚀"}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
