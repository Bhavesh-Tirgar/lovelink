import { useCall } from '../context/CallContext';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Sparkles, Volume2, VolumeX, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HeartbeatTouch() {
    const navigate = useNavigate();

    const [isMyTouching, setIsMyTouching] = useState(false);
    const [myPos, setMyPos] = useState({ x: 0.5, y: 0.65 });
    const [partnerTouching, setPartnerTouching] = useState(false);
    const [partnerPos, setPartnerPos] = useState({ x: 0.5, y: 0.35 });
    const [kissCount, setKissCount] = useState(() => {
        try { return parseInt(localStorage.getItem('lovelink_thumbkisses') || '0', 10); } catch { return 0; }
    });
    const [isKissing, setIsKissing] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const containerRef = useRef(null);
    const kissLockRef = useRef(false);
    const audioCtxRef = useRef(null);

    // Initialize Web Audio Context for Heartbeat Synth
    const playHeartbeatSound = useCallback(() => {
        if (!soundEnabled) return;
        try {
            if (!audioCtxRef.current) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                audioCtxRef.current = new AudioCtx();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;
            // Lub
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(65, now);
            osc1.frequency.exponentialRampToValueAtTime(35, now + 0.12);
            gain1.gain.setValueAtTime(0.35, now);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.12);

            // Dub (120ms later)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(80, now + 0.14);
            osc2.frequency.exponentialRampToValueAtTime(45, now + 0.28);
            gain2.gain.setValueAtTime(0.4, now + 0.14);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.14);
            osc2.stop(now + 0.28);
        } catch {
            // Audio not supported
        }
    }, [soundEnabled]);

    const { sendWsMessage } = useCall();

    const sendTouch = useCallback((x, y, isTouching) => {
        if (sendWsMessage) {
            sendWsMessage({
                type: isTouching ? 'touch_move' : 'touch_end',
                x,
                y,
                is_touching: isTouching
            });
        }
    }, [sendWsMessage]);

    // Trigger Thumbkiss Shockwave and Vibration
    const triggerKissCelebration = useCallback((originX, originY, shouldBroadcast = true) => {
        if (kissLockRef.current) return;
        kissLockRef.current = true;
        setIsKissing(true);

        // 1. Double-beat human heartbeat haptic vibration
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate([70, 90, 70, 350, 70, 90, 70, 350]);
            } catch {}
        }

        // 2. Play acoustic heartbeat sound
        playHeartbeatSound();

        // 3. Increment counter
        setKissCount(prev => {
            const next = prev + 1;
            try { localStorage.setItem('lovelink_thumbkisses', String(next)); } catch {}
            return next;
        });

        // 4. Confetti burst from contact point
        confetti({
            particleCount: 80,
            spread: 90,
            origin: { x: originX, y: originY },
            colors: ['#ec4899', '#f43f5e', '#a855f7', '#fb7185', '#ffffff'],
            shapes: ['circle']
        });

        if (shouldBroadcast && sendWsMessage) {
            sendWsMessage({
                type: 'touch_kiss',
                x: originX,
                y: originY
            });
        }

        setTimeout(() => {
            setIsKissing(false);
            kissLockRef.current = false;
        }, 1200);
    }, [playHeartbeatSound, sendWsMessage]);

    // Listen to shared WebSocket touch events
    useEffect(() => {
        const handleTouchMessage = (e) => {
            const data = e.detail;
            if (!data) return;
            if (data.type === 'touch_move') {
                setPartnerTouching(Boolean(data.is_touching));
                if (data.x !== undefined && data.y !== undefined) {
                    setPartnerPos({ x: data.x, y: data.y });
                }
            } else if (data.type === 'touch_end') {
                setPartnerTouching(false);
            } else if (data.type === 'touch_kiss') {
                triggerKissCelebration(data.x, data.y, false);
            }
        };

        window.addEventListener('lovelink:touch', handleTouchMessage);
        return () => {
            window.removeEventListener('lovelink:touch', handleTouchMessage);
            if (sendWsMessage) {
                sendWsMessage({ type: 'touch_end' });
            }
        };
    }, [sendWsMessage, triggerKissCelebration]);

    // Check distance between thumbs
    useEffect(() => {
        if (isMyTouching && partnerTouching && !kissLockRef.current) {
            const dx = myPos.x - partnerPos.x;
            const dy = myPos.y - partnerPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.12) {
                // Thumbs met! Trigger the Kiss!
                const midX = (myPos.x + partnerPos.x) / 2;
                const midY = (myPos.y + partnerPos.y) / 2;
                triggerKissCelebration(midX, midY, true);
            }
        }
    }, [isMyTouching, partnerTouching, myPos, partnerPos, triggerKissCelebration]);

    // Touch Event Handlers
    const handleTouchStart = (e) => {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        if (touch) updateTouchPos(touch.clientX, touch.clientY, true);
    };

    const handleTouchMove = (e) => {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        if (touch) updateTouchPos(touch.clientX, touch.clientY, true);
    };

    const handleTouchEnd = (e) => {
        if (e.cancelable) e.preventDefault();
        setIsMyTouching(false);
        sendTouch(myPos.x, myPos.y, false);
    };

    // Mouse Event Handlers (for desktop/laptop)
    const handleMouseDown = (e) => {
        updateTouchPos(e.clientX, e.clientY, true);
    };

    const handleMouseMove = (e) => {
        if (isMyTouching) {
            updateTouchPos(e.clientX, e.clientY, true);
        }
    };

    const handleMouseUp = () => {
        setIsMyTouching(false);
        sendTouch(myPos.x, myPos.y, false);
    };

    const updateTouchPos = (clientX, clientY, touching) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const normX = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
        const normY = Math.max(0.08, Math.min(0.92, (clientY - rect.top) / rect.height));
        setMyPos({ x: normX, y: normY });
        setIsMyTouching(touching);
        sendTouch(normX, normY, touching);
    };

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="fixed inset-0 w-full h-[100dvh] bg-black overflow-hidden select-none touch-none z-50 cursor-crosshair font-sans flex flex-col justify-between pb-safe"
            style={{
                backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(30, 10, 45, 0.9) 0%, rgba(5, 2, 10, 1) 100%)'
            }}
        >
            {/* Ambient Background Nebula & Fireflies */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-pink-600/20 blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Top Navigation Bar */}
            <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 pt-4 pt-safe sm:pt-6 pb-2 pointer-events-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md flex items-center gap-2 text-xs font-semibold"
                >
                    <ArrowLeft className="w-4 h-4" /> Exit
                </button>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-pink-500/30 backdrop-blur-xl shadow-lg">
                    <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-wider uppercase">
                        {kissCount} {kissCount === 1 ? 'Thumbkiss' : 'Thumbkisses'}
                    </span>
                </div>

                <button
                    onClick={() => setSoundEnabled(prev => !prev)}
                    className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md"
                    title={soundEnabled ? "Mute sound" : "Enable sound"}
                >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-pink-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                </button>
            </div>

            {/* Center Status Guide */}
            <div className="absolute inset-x-0 top-20 text-center pointer-events-none z-10 px-4">
                {isKissing ? (
                    <div className="animate-bounce">
                        <span className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-2xl shadow-pink-500/50">
                            💋 THUMBKISS CONNECTED! ❤️
                        </span>
                    </div>
                ) : isMyTouching && partnerTouching ? (
                    <div className="animate-pulse">
                        <span className="px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 font-bold text-xs sm:text-sm tracking-wide backdrop-blur-md">
                            ✨ You are both touching! Move your thumbs together! ✨
                        </span>
                    </div>
                ) : isMyTouching ? (
                    <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-gray-300 font-medium text-xs backdrop-blur-md">
                        Holding thumb... Waiting for your love to touch ❤️
                    </span>
                ) : partnerTouching ? (
                    <span className="px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold text-xs backdrop-blur-md animate-pulse">
                        Partner is touching the screen! Place your thumb now! 👆
                    </span>
                ) : (
                    <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-medium text-xs backdrop-blur-md">
                        Place and hold your thumb anywhere on the screen...
                    </span>
                )}
            </div>

            {/* SVG Connecting Light Tether between thumbs */}
            {isMyTouching && partnerTouching && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
                    <line
                        x1={`${myPos.x * 100}%`}
                        y1={`${myPos.y * 100}%`}
                        x2={`${partnerPos.x * 100}%`}
                        y2={`${partnerPos.y * 100}%`}
                        stroke="url(#loveGradient)"
                        strokeWidth="3"
                        strokeDasharray="6,6"
                        className="animate-pulse"
                    />
                    <defs>
                        <linearGradient id="loveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                </svg>
            )}

            {/* ── 1. MY THUMB TOUCH RING (PINK) ── */}
            {isMyTouching && (
                <div
                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20 transition-transform duration-75 ease-out"
                    style={{ left: `${myPos.x * 100}%`, top: `${myPos.y * 100}%` }}
                >
                    {/* Pulsing shockwaves */}
                    <div className="absolute -inset-10 rounded-full border-2 border-pink-500/40 animate-ping opacity-60" />
                    <div className="absolute -inset-6 rounded-full border border-pink-400/60 animate-pulse" />

                    {/* Core Glowing Orb */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-500 p-0.5 shadow-[0_0_50px_rgba(236,72,153,0.8)] flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                            <Flame className="w-8 h-8 text-pink-300 animate-pulse" />
                        </div>
                    </div>
                    <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] uppercase tracking-wider font-extrabold text-pink-300 bg-black/60 px-2 py-0.5 rounded-full border border-pink-500/30 whitespace-nowrap">
                        You
                    </span>
                </div>
            )}

            {/* ── 2. PARTNER'S THUMB TOUCH RING (CYAN/VIOLET) ── */}
            {partnerTouching && (
                <div
                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-150 ease-out"
                    style={{ left: `${partnerPos.x * 100}%`, top: `${partnerPos.y * 100}%` }}
                >
                    {/* Pulsing shockwaves */}
                    <div className="absolute -inset-10 rounded-full border-2 border-cyan-400/40 animate-ping opacity-60" />
                    <div className="absolute -inset-6 rounded-full border border-cyan-300/60 animate-pulse" />

                    {/* Core Glowing Orb */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 p-0.5 shadow-[0_0_50px_rgba(6,182,212,0.8)] flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-cyan-300 animate-pulse" />
                        </div>
                    </div>
                    <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] uppercase tracking-wider font-extrabold text-cyan-300 bg-black/60 px-2 py-0.5 rounded-full border border-cyan-500/30 whitespace-nowrap">
                        Partner
                    </span>
                </div>
            )}

            {/* Bottom Footer Info */}
            <div className="relative z-20 pb-8 px-6 text-center pointer-events-none">
                <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400 inline" />
                    When both your thumbs meet on the glass, your phones vibrate in a synchronized heartbeat rhythm.
                </p>
            </div>
        </div>
    );
}
