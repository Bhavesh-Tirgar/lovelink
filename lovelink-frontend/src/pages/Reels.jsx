import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Heart, Volume2, VolumeX, Plus, 
    ArrowLeft, Link2, Unlink, Trash2, Send, X, Film,
    ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../api';
import { getWsBaseUrl } from '../utils/wsUrl';

export default function Reels() {
    const navigate = useNavigate();

    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
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
                particleCount: 25,
                spread: 50,
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

    // Double tap screen to send floating heart storm
    const handleDoubleTap = (e) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : rect.width / 2);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : rect.height / 2);

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
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
        <div className="relative w-full h-[100dvh] bg-[#09090b] text-white overflow-hidden select-none flex justify-center">
            {/* Ambient Background Mesh Glow for Desktop & Tablet viewports */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-pink-600/15 via-purple-600/10 to-indigo-600/15 rounded-full blur-[140px]" />
            </div>

            {/* Main Phone-Pro Container: Fullscreen on mobile, centered frame on desktop */}
            <div className="relative w-full h-full max-w-[440px] sm:my-2 sm:h-[calc(100dvh-1rem)] sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden bg-black flex flex-col">
                
                {/* ── TOP FLOATING NAVIGATION BAR ── */}
                <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
                    <div className="flex items-center gap-2.5 pointer-events-auto">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all shadow-lg"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-white drop-shadow-md">
                                <span>Reels Lounge</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-300 border border-pink-500/40 font-mono">
                                    {reels.length > 0 ? `${activeIndex + 1}/${reels.length}` : '0/0'}
                                </span>
                            </h1>
                            <p className="text-[10px] text-gray-300 drop-shadow">
                                Double-tap to heart 💕
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                        {/* Auto-Advance / Hands-Free Toggle */}
                        <button
                            onClick={() => {
                                setAutoAdvance(!autoAdvance);
                                toast(
                                    !autoAdvance 
                                        ? "⏯️ Hands-Free Auto-Play ON (Auto-advances every 18s)" 
                                        : "⏸️ Hands-Free Auto-Play OFF"
                                );
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-xl border transition-all ${
                                autoAdvance 
                                    ? 'bg-purple-500/25 border-purple-400 text-purple-200 shadow-md shadow-purple-500/20' 
                                    : 'bg-black/50 border-white/15 text-gray-400'
                            }`}
                            title="Hands-free auto advance"
                        >
                            {autoAdvance ? 'Auto ⏭️' : 'Manual'}
                        </button>

                        {/* Sync Lock Toggle */}
                        <button
                            onClick={() => {
                                setSyncWithPartner(!syncWithPartner);
                                toast(
                                    !syncWithPartner 
                                        ? "🔗 Live Co-Scroll Sync ON" 
                                        : "👤 Solo Browsing Mode (Partner won't be moved)"
                                );
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-xl border transition-all ${
                                syncWithPartner
                                    ? 'bg-pink-500/25 border-pink-400 text-pink-200 shadow-md shadow-pink-500/20'
                                    : 'bg-black/50 border-white/15 text-gray-400'
                            }`}
                            title="Toggle Co-Scroll Sync"
                        >
                            {syncWithPartner ? <Link2 className="w-3 h-3 text-pink-400" /> : <Unlink className="w-3 h-3 text-gray-400" />}
                            <span>{syncWithPartner ? 'Sync' : 'Solo'}</span>
                        </button>

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
                    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-3">
                        <Film className="w-10 h-10 text-pink-400 animate-pulse" />
                        <p className="text-xs text-gray-400">Loading infinite couple stream...</p>
                    </div>
                ) : reels.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 gap-4">
                        <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-3xl">
                            🎬
                        </div>
                        <h2 className="text-lg font-bold">Connecting Stream...</h2>
                        <button
                            onClick={fetchFeed}
                            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/30 flex items-center gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh Stream
                        </button>
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
                                    {/* Video / Media Player Frame */}
                                    {isYouTube && (
                                        isActive ? (
                                            <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
                                                <iframe
                                                    src={embedUrl}
                                                    title={reel.title}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="w-full h-full object-cover pointer-events-none scale-[1.08]"
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
                                                className="w-full h-full object-contain pointer-events-none"
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

                                    {/* Bottom Dark Vignette for Text Readability */}
                                    <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-15" />

                                    {/* ── REEL INFO & CAPTION (BOTTOM LEFT) ── */}
                                    <div className="absolute bottom-5 left-4 right-16 z-20 pointer-events-none space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-pink-500/30 text-pink-200 border border-pink-400/30 backdrop-blur-md">
                                                {reel.category || 'Meme'}
                                            </span>
                                            <span className="text-[10px] text-gray-300 font-medium">
                                                {reel.added_by_name || 'LoveLink'}
                                            </span>
                                        </div>

                                        <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
                                            {reel.title}
                                        </h3>
                                        {reel.caption && (
                                            <p className="text-[11px] text-gray-300 line-clamp-2 font-normal leading-relaxed drop-shadow">
                                                {reel.caption}
                                            </p>
                                        )}
                                    </div>

                                    {/* ── RIGHT FLOATING ACTION BAR ── */}
                                    <div className="absolute bottom-5 right-2.5 z-20 flex flex-col items-center gap-3 pointer-events-auto">
                                        {/* Like Button */}
                                        <button
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
                                            className="group flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                                            title="Love this reel"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-rose-400 group-hover:scale-110 group-hover:bg-rose-500/20 transition-all shadow-xl">
                                                <Heart className="w-5 h-5 fill-current text-rose-500" />
                                            </div>
                                            <span className="text-[10px] font-bold text-white drop-shadow">
                                                {reel.likes_count > 999 ? `${(reel.likes_count / 1000).toFixed(1)}k` : reel.likes_count || 0}
                                            </span>
                                        </button>

                                        {/* Laugh Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendReaction('😂');
                                            }}
                                            className="group flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                                            title="Laugh reaction"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-amber-500/20 transition-all shadow-xl">
                                                😂
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-300 drop-shadow">
                                                Haha
                                            </span>
                                        </button>

                                        {/* Fire Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendReaction('🔥');
                                            }}
                                            className="group flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                                            title="Fire reaction"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-orange-500/20 transition-all shadow-xl">
                                                🔥
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-300 drop-shadow">
                                                Lit
                                            </span>
                                        </button>

                                        {/* Mute / Unmute Toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsMuted(!isMuted);
                                            }}
                                            className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-90 transition-all shadow-xl"
                                            title={isMuted ? "Unmute" : "Mute"}
                                        >
                                            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                                        </button>

                                        {/* Add Reel Optional Shortcut */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsAddModalOpen(true);
                                            }}
                                            className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/40 active:scale-95 hover:scale-105 transition-all"
                                            title="Add Custom Video or Short"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>

                                        {/* Delete Custom Reel */}
                                        {reel.is_custom && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm("Remove this reel from couple queue?")) {
                                                        handleDeleteReel(reel.id);
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-gray-400 hover:text-rose-400 active:scale-90 transition-all"
                                                title="Delete Reel"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
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
                        title="Previous Reel (Up Arrow)"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scrollToReelIndex(activeIndex + 1)}
                        disabled={activeIndex === reels.length - 1}
                        className="w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        title="Next Reel (Down Arrow)"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── ADD SHORT / REEL MODAL ── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 to-black border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
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

                        <form onSubmit={handleAddReelSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Video URL *
                                </label>
                                <input
                                    type="text"
                                    value={newReelUrl}
                                    onChange={(e) => setNewReelUrl(e.target.value)}
                                    placeholder="https://youtube.com/shorts/... or .mp4 link"
                                    required
                                    className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-pink-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Title / Meme Caption
                                </label>
                                <input
                                    type="text"
                                    value={newReelTitle}
                                    onChange={(e) => setNewReelTitle(e.target.value)}
                                    placeholder="e.g. This is literally us on Sundays 😂"
                                    className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-pink-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Category
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'couple', label: '💕 Romantic' },
                                        { id: 'funny', label: '😂 Funny' },
                                        { id: 'relatable', label: '✨ Relatable' }
                                    ].map(cat => (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => setNewReelCategory(cat.id)}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                                                newReelCategory === cat.id
                                                    ? 'bg-pink-500/20 border-pink-400 text-pink-300 shadow-md'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                {isSubmitting ? "Adding to Queue..." : "Add to Co-Scroll Queue 🎬"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Keyframe Styles for Floating Emojis */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes floatUpAndFade {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(0.6) translateY(0);
                    }
                    50% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.3) translateY(-60px);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(1) translateY(-140px);
                    }
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
        </div>
    );
}
