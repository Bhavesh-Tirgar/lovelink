import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles, Plus, ArrowLeft, Star, X, Calendar, User, Trash2,
    Volume2, VolumeX, Eye, Heart, Camera, Compass, RefreshCw
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const STAR_COLORS = {
    gold: { label: 'Golden Sun', hex: '#fbbf24', glow: 'rgba(251, 191, 36, 0.7)' },
    pink: { label: 'Rose Quartz', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.7)' },
    cyan: { label: 'Cosmic Cyan', hex: '#06b6d4', glow: 'rgba(6, 182, 212, 0.7)' },
    purple: { label: 'Violet Aura', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.7)' },
    emerald: { label: 'Emerald Spark', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.7)' },
};

const STAR_TYPES = {
    single: { label: 'Standard Star', desc: 'A classic eternal beacon' },
    binary: { label: 'Twin Souls (Binary)', desc: 'Two celestial stars dancing together' },
    supernova: { label: 'Supernova', desc: 'Vibrant pulsing aura of unforgettable love' },
    diamond: { label: 'Diamond Promise', desc: 'Crystalline cross-sparkle of forever' },
};

export default function OurUniverse() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    const [stars, setStars] = useState([]);
    const [wishes, setWishes] = useState([]);
    const [selectedStar, setSelectedStar] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isWishModalOpen, setIsWishModalOpen] = useState(false);
    const [isWishListOpen, setIsWishListOpen] = useState(false);

    // Form inputs for new star
    const [starName, setStarName] = useState('');
    const [memoryText, setMemoryText] = useState('');
    const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
    const [starColor, setStarColor] = useState('gold');
    const [starType, setStarType] = useState('single');
    const [photoUrl, setPhotoUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Wish form
    const [wishText, setWishText] = useState('');
    const [wishSubmitting, setWishSubmitting] = useState(false);

    // Controls
    const [showConstellations, setShowConstellations] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isTourRunning, setIsTourRunning] = useState(false);
    const [activeMeteorNotice, setActiveMeteorNotice] = useState(false);

    // Audio synthesizer ref
    const audioCtxRef = useRef(null);
    const audioNodesRef = useRef([]);

    // 3D Celestial Camera State
    const cameraRef = useRef({
        rotX: 0,
        rotY: 0,
        targetRotX: 0,
        targetRotY: 0,
        zoom: 1.0,
        targetZoom: 1.0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
    });

    // Background ambient stars
    const ambientStarsRef = useRef([]);
    // Shooting stars array
    const meteorsRef = useRef([]);

    // Fetch memory stars from backend
    const fetchStars = useCallback(async () => {
        try {
            const res = await api.get('/universe/stars');
            setStars(res.data || []);
        } catch (e) {
            console.error("Failed to load stars", e);
        }
    }, []);

    // Fetch secret wishes
    const fetchWishes = useCallback(async () => {
        try {
            const res = await api.get('/universe/wishes');
            setWishes(res.data || []);
        } catch (e) {
            console.error("Failed to load wishes", e);
        }
    }, []);

    useEffect(() => {
        fetchStars();
        fetchWishes();
    }, [fetchStars, fetchWishes]);

    // Initialize 400 background ambient stars
    useEffect(() => {
        const arr = [];
        for (let i = 0; i < 400; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = 250 + Math.random() * 50;

            arr.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi),
                baseSize: Math.random() * 1.6 + 0.6,
                twinkleSpeed: Math.random() * 0.04 + 0.01,
                phase: Math.random() * Math.PI * 2,
            });
        }
        ambientStarsRef.current = arr;
    }, []);

    // Ambient Space Drone Sound Synthesizer (Web Audio API)
    useEffect(() => {
        if (!audioEnabled) {
            if (audioCtxRef.current) {
                audioNodesRef.current.forEach(n => {
                    try { n.stop && n.stop(); n.disconnect(); } catch (_) {}
                });
                audioNodesRef.current = [];
                audioCtxRef.current.close().catch(() => {});
                audioCtxRef.current = null;
            }
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            audioCtxRef.current = ctx;

            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
            masterGain.connect(ctx.destination);

            // Create ethereal warm chord (F major 7 / C celestial pad: 174Hz, 261Hz, 349Hz, 440Hz)
            const freqs = [174.61, 261.63, 349.23, 440.00, 523.25];
            const nodes = [];

            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

                osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                // Subtle slow LFO shimmer
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.frequency.setValueAtTime(0.1 + idx * 0.05, ctx.currentTime);
                lfoGain.gain.setValueAtTime(0.02, ctx.currentTime);
                lfo.connect(gain.gain);
                lfo.start();

                gain.gain.setValueAtTime(0.06 / freqs.length, ctx.currentTime);

                if (panner) {
                    panner.pan.setValueAtTime((idx / (freqs.length - 1)) * 1.6 - 0.8, ctx.currentTime);
                    osc.connect(gain);
                    gain.connect(panner);
                    panner.connect(masterGain);
                    nodes.push(panner, lfo, lfoGain);
                } else {
                    osc.connect(gain);
                    gain.connect(masterGain);
                    nodes.push(lfo, lfoGain);
                }

                osc.start();
                nodes.push(osc, gain);
            });

            audioNodesRef.current = nodes;
        } catch (e) {
            console.error("Audio synth error:", e);
        }

        return () => {
            if (audioCtxRef.current) {
                audioNodesRef.current.forEach(n => {
                    try { n.stop && n.stop(); n.disconnect(); } catch (_) {}
                });
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, [audioEnabled]);

    // Spawning Shooting Stars Periodically
    useEffect(() => {
        const interval = setInterval(() => {
            if (canvasRef.current) {
                const w = canvasRef.current.width;
                const h = canvasRef.current.height;
                const startX = Math.random() * (w * 0.7);
                const startY = Math.random() * (h * 0.3);
                meteorsRef.current.push({
                    x: startX,
                    y: startY,
                    vx: 7 + Math.random() * 6,
                    vy: 4 + Math.random() * 4,
                    length: 120 + Math.random() * 80,
                    alpha: 1.0,
                    color: Math.random() > 0.5 ? '#fbcfe8' : '#67e8f9',
                });

                setActiveMeteorNotice(true);
                setTimeout(() => setActiveMeteorNotice(false), 5000);
            }
        }, 16000);

        return () => clearInterval(interval);
    }, []);

    // Manual Meteor Trigger
    const triggerMeteor = () => {
        if (!canvasRef.current) return;
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        meteorsRef.current.push({
            x: Math.random() * (w * 0.5),
            y: Math.random() * (h * 0.3),
            vx: 8,
            vy: 5,
            length: 140,
            alpha: 1.0,
            color: '#f43f5e',
        });
        setActiveMeteorNotice(true);
        setTimeout(() => setActiveMeteorNotice(false), 5000);
    };

    // Main 3D Canvas Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        let tourAngle = 0;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            const cx = width / 2;
            const cy = height / 2;
            const fov = 340 * cameraRef.current.zoom;

            // Handle Galaxy Tour Mode Camera Orbit
            if (isTourRunning) {
                tourAngle += 0.003;
                cameraRef.current.targetRotY = tourAngle;
                cameraRef.current.targetRotX = Math.sin(tourAngle * 0.7) * 0.25;
            }

            // Smooth camera interpolation
            cameraRef.current.rotX += (cameraRef.current.targetRotX - cameraRef.current.rotX) * 0.08;
            cameraRef.current.rotY += (cameraRef.current.targetRotY - cameraRef.current.rotY) * 0.08;
            cameraRef.current.zoom += (cameraRef.current.targetZoom - cameraRef.current.zoom) * 0.1;

            const rx = cameraRef.current.rotX;
            const ry = cameraRef.current.rotY;
            const cosX = Math.cos(rx);
            const sinX = Math.sin(rx);
            const cosY = Math.cos(ry);
            const sinY = Math.sin(ry);

            // Deep Space Background Gradient with Nebula
            const bgGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(width, height) * 0.85);
            bgGradient.addColorStop(0, '#0f0c1b');
            bgGradient.addColorStop(0.4, '#090814');
            bgGradient.addColorStop(1, '#020205');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // Draw Subtle Nebula Clouds
            ctx.save();
            ctx.globalAlpha = 0.12;
            const nebulaGrad1 = ctx.createRadialGradient(cx - 150, cy - 100, 20, cx - 150, cy - 100, 320);
            nebulaGrad1.addColorStop(0, '#ec4899');
            nebulaGrad1.addColorStop(0.5, '#7c3aed');
            nebulaGrad1.addColorStop(1, 'transparent');
            ctx.fillStyle = nebulaGrad1;
            ctx.beginPath();
            ctx.arc(cx - 150, cy - 100, 320, 0, Math.PI * 2);
            ctx.fill();

            const nebulaGrad2 = ctx.createRadialGradient(cx + 200, cy + 120, 20, cx + 200, cy + 120, 350);
            nebulaGrad2.addColorStop(0, '#06b6d4');
            nebulaGrad2.addColorStop(0.6, '#3b82f6');
            nebulaGrad2.addColorStop(1, 'transparent');
            ctx.fillStyle = nebulaGrad2;
            ctx.beginPath();
            ctx.arc(cx + 200, cy + 120, 350, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 1. Draw Background Ambient Stars
            const timeNow = Date.now() * 0.001;
            ambientStarsRef.current.forEach((s) => {
                const x1 = s.x * cosY - s.z * sinY;
                const z1 = s.x * sinY + s.z * cosY;
                const y1 = s.y * cosX - z1 * sinX;
                const z2 = s.y * sinX + z1 * cosX;

                const depth = z2 + 350;
                if (depth > 10) {
                    const scale = fov / depth;
                    const px = cx + x1 * scale;
                    const py = cy + y1 * scale;

                    if (px >= 0 && px <= width && py >= 0 && py <= height) {
                        const twinkle = (Math.sin(timeNow * 2 + s.phase) + 1) * 0.5;
                        const alpha = 0.2 + twinkle * 0.65;
                        const size = Math.max(0.6, s.baseSize * (scale * 0.8));

                        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.beginPath();
                        ctx.arc(px, py, size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });

            // 2. Project Memory Stars
            const projectedStars = [];
            stars.forEach((star) => {
                const sx = star.coord_x;
                const sy = star.coord_y;
                const sz = star.coord_z;

                const x1 = sx * cosY - sz * sinY;
                const z1 = sx * sinY + sz * cosY;
                const y1 = sy * cosX - z1 * sinX;
                const z2 = sy * sinX + z1 * cosX;

                const depth = z2 + 220;
                if (depth > 20) {
                    const scale = fov / depth;
                    const px = cx + x1 * scale;
                    const py = cy + y1 * scale;
                    projectedStars.push({
                        ...star,
                        px,
                        py,
                        depth,
                        scale,
                    });
                }
            });

            // Sort memory stars back-to-front
            projectedStars.sort((a, b) => b.depth - a.depth);

            // 3. Draw Constellation Lines between Memory Stars
            if (showConstellations && projectedStars.length >= 2) {
                ctx.save();
                ctx.strokeStyle = 'rgba(236, 72, 153, 0.28)';
                ctx.lineWidth = 1.2;
                ctx.setLineDash([4, 6]);

                for (let i = 0; i < projectedStars.length - 1; i++) {
                    const p1 = projectedStars[i];
                    const p2 = projectedStars[i + 1];

                    ctx.beginPath();
                    ctx.moveTo(p1.px, p1.py);
                    ctx.lineTo(p2.px, p2.py);
                    ctx.stroke();

                    // Tiny distance midpoint heart or glow
                    const midX = (p1.px + p2.px) / 2;
                    const midY = (p1.py + p2.py) / 2;
                    ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
                    ctx.beginPath();
                    ctx.arc(midX, midY, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // 4. Render Memory Stars
            projectedStars.forEach((star) => {
                const colorDef = STAR_COLORS[star.color] || STAR_COLORS.gold;
                const baseRadius = Math.max(5, 9 * (star.scale * 0.95));
                const pulse = Math.sin(timeNow * 3 + star.id.charCodeAt(0)) * 2;
                const radius = baseRadius + pulse;

                // Star Glow Gradient
                const glowGrad = ctx.createRadialGradient(
                    star.px, star.py, 1,
                    star.px, star.py, radius * 3.2
                );
                glowGrad.addColorStop(0, colorDef.hex);
                glowGrad.addColorStop(0.35, colorDef.glow);
                glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(star.px, star.py, radius * 3.2, 0, Math.PI * 2);
                ctx.fill();

                // Core Star
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(star.px, star.py, radius * 0.65, 0, Math.PI * 2);
                ctx.fill();

                // Distinct rendering for star types
                if (star.star_type === 'binary') {
                    // Twin dancing star
                    const orbAngle = timeNow * 2;
                    const orbX = star.px + Math.cos(orbAngle) * (radius * 1.8);
                    const orbY = star.py + Math.sin(orbAngle) * (radius * 1.8);
                    ctx.fillStyle = '#f43f5e';
                    ctx.beginPath();
                    ctx.arc(orbX, orbY, radius * 0.45, 0, Math.PI * 2);
                    ctx.fill();
                } else if (star.star_type === 'diamond') {
                    // Crystalline 4-point diffraction spike
                    ctx.strokeStyle = colorDef.hex;
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(star.px - radius * 2.8, star.py);
                    ctx.lineTo(star.px + radius * 2.8, star.py);
                    ctx.moveTo(star.px, star.py - radius * 2.8);
                    ctx.lineTo(star.px, star.py + radius * 2.8);
                    ctx.stroke();
                } else if (star.star_type === 'supernova') {
                    // Nova aura ring
                    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(star.px, star.py, radius * 2.2, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Star Title Label with glowing glass backing
                ctx.font = '600 12px Inter, sans-serif';
                ctx.textAlign = 'center';
                const textWidth = ctx.measureText(star.star_name).width;

                ctx.fillStyle = 'rgba(15, 12, 27, 0.75)';
                ctx.beginPath();
                ctx.roundRect(star.px - textWidth / 2 - 8, star.py + radius + 6, textWidth + 16, 20, 6);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.fillText(star.star_name, star.px, star.py + radius + 20);
            });

            // 5. Draw Shooting Stars / Meteors
            for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
                const m = meteorsRef.current[i];
                m.x += m.vx;
                m.y += m.vy;
                m.alpha -= 0.015;

                if (m.alpha <= 0) {
                    meteorsRef.current.splice(i, 1);
                    continue;
                }

                const grad = ctx.createLinearGradient(
                    m.x, m.y,
                    m.x - m.vx * (m.length / 10),
                    m.y - m.vy * (m.length / 10)
                );
                grad.addColorStop(0, `rgba(255, 255, 255, ${m.alpha})`);
                grad.addColorStop(0.3, m.color);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(m.x, m.y);
                ctx.lineTo(m.x - m.vx * (m.length / 10), m.y - m.vy * (m.length / 10));
                ctx.stroke();

                // Spark head
                ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha})`;
                ctx.beginPath();
                ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            animId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
        };
    }, [stars, showConstellations, isTourRunning]);

    // Canvas Pointer Controls (Rotate & Zoom)
    const handlePointerDown = (e) => {
        cameraRef.current.isDragging = true;
        cameraRef.current.lastMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        cameraRef.current.lastMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
        setIsTourRunning(false);
    };

    const handlePointerMove = (e) => {
        if (!cameraRef.current.isDragging) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        const deltaX = clientX - cameraRef.current.lastMouseX;
        const deltaY = clientY - cameraRef.current.lastMouseY;

        cameraRef.current.targetRotY += deltaX * 0.005;
        cameraRef.current.targetRotX += deltaY * 0.005;

        cameraRef.current.lastMouseX = clientX;
        cameraRef.current.lastMouseY = clientY;
    };

    const handlePointerUp = () => {
        cameraRef.current.isDragging = false;
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newZoom = Math.min(Math.max(cameraRef.current.targetZoom + delta, 0.5), 2.2);
        cameraRef.current.targetZoom = newZoom;
    };

    // Click Detection on Memory Stars
    const handleCanvasClick = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const cx = canvasRef.current.width / 2;
        const cy = canvasRef.current.height / 2;
        const fov = 340 * cameraRef.current.zoom;

        const rx = cameraRef.current.rotX;
        const ry = cameraRef.current.rotY;
        const cosX = Math.cos(rx);
        const sinX = Math.sin(rx);
        const cosY = Math.cos(ry);
        const sinY = Math.sin(ry);

        let clicked = null;

        for (const star of stars) {
            const sx = star.coord_x;
            const sy = star.coord_y;
            const sz = star.coord_z;

            const x1 = sx * cosY - sz * sinY;
            const z1 = sx * sinY + sz * cosY;
            const y1 = sy * cosX - z1 * sinX;
            const z2 = sy * sinX + z1 * cosX;

            const depth = z2 + 220;
            if (depth > 20) {
                const scale = fov / depth;
                const px = cx + x1 * scale;
                const py = cy + y1 * scale;

                const hitRadius = Math.max(20, 16 * scale);
                const dist = Math.hypot(clickX - px, clickY - py);
                if (dist <= hitRadius) {
                    clicked = star;
                    break;
                }
            }
        }

        if (clicked) {
            setSelectedStar(clicked);
        }
    };

    // Star Creation Handler
    const handleAddStar = async (e) => {
        e.preventDefault();
        if (!starName.trim() || !memoryText.trim()) {
            toast.error("Please fill in the star name and your memory!");
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/universe/stars', {
                star_name: starName.trim(),
                memory_text: memoryText.trim(),
                date_str: dateStr,
                color: starColor,
                star_type: starType,
                photo_url: photoUrl.trim() || null,
            });

            setStars(prev => [res.data, ...prev]);
            setIsAddModalOpen(false);
            setStarName('');
            setMemoryText('');
            setPhotoUrl('');
            toast.success("✨ Your memory has been etched into the stars forever!");

            confetti({
                particleCount: 75,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#fbbf24', '#f43f5e', '#a855f7']
            });
        } catch (err) {
            console.error("Failed to add star", err);
            toast.error(err.response?.data?.detail || "Could not name star in the universe.");
        } finally {
            setSubmitting(false);
        }
    };

    // Star Deletion Handler
    const handleDeleteStar = async (starId) => {
        if (!window.confirm("Are you sure you want to release this star back into the cosmic void?")) return;
        try {
            await api.delete(`/universe/stars/${starId}`);
            setStars(prev => prev.filter(s => s.id !== starId));
            setSelectedStar(null);
            toast.success("Star released.");
        } catch (err) {
            toast.error("Failed to delete star.");
        }
    };

    // Make a Secret Wish Handler
    const handleMakeWish = async (e) => {
        e.preventDefault();
        if (!wishText.trim()) return;

        setWishSubmitting(true);
        try {
            const res = await api.post('/universe/wishes', {
                wish_text: wishText.trim(),
            });
            setWishes(prev => [res.data, ...prev]);
            setIsWishModalOpen(false);
            setWishText('');
            toast.success("🌟 Secret wish cast into the stars!");
            confetti({ particleCount: 50, spread: 60, colors: ['#67e8f9', '#f43f5e'] });
        } catch (err) {
            toast.error("Could not cast wish");
        } finally {
            setWishSubmitting(false);
        }
    };

    // Reveal Secret Wish Handler
    const handleRevealWish = async (wishId) => {
        try {
            await api.post(`/universe/wishes/${wishId}/reveal`);
            setWishes(prev => prev.map(w => w.id === wishId ? { ...w, is_revealed: true } : w));
            toast.success("💖 Wish revealed to your partner!");
        } catch (err) {
            toast.error("Failed to reveal wish");
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black select-none text-white font-sans">
            {/* Top Navigation Bar */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-sm font-medium hover:bg-white/10 transition-all text-white/90 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-black/50 backdrop-blur-md border border-pink-500/30 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                        <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                        <h1 className="text-sm font-bold tracking-wider uppercase bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent">
                            Our Universe
                        </h1>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                            {stars.length} Stars
                        </span>
                    </div>
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                    {/* Audio Synth Toggle */}
                    <button
                        onClick={() => setAudioEnabled(prev => !prev)}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                            audioEnabled
                                ? 'bg-pink-600/80 border-pink-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                                : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                        title={audioEnabled ? "Mute Cosmic Drone" : "Play Ambient Space Music"}
                    >
                        {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    {/* Constellations Toggle */}
                    <button
                        onClick={() => setShowConstellations(prev => !prev)}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                            showConstellations
                                ? 'bg-indigo-600/80 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                                : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                        title="Toggle Constellation Lines"
                    >
                        <Compass className="w-4 h-4" />
                    </button>

                    {/* Galaxy Tour Mode */}
                    <button
                        onClick={() => setIsTourRunning(prev => !prev)}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                            isTourRunning
                                ? 'bg-amber-600/80 border-amber-400 text-white animate-spin'
                                : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                        title="Cinematic Galaxy Tour"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Shooting Star Banner (Catch a Wish) */}
            {activeMeteorNotice && (
                <div
                    onClick={() => setIsWishModalOpen(true)}
                    className="absolute top-20 left-1/2 -translate-x-1/2 z-20 cursor-pointer animate-bounce flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white rounded-full shadow-[0_0_25px_rgba(244,63,94,0.8)] border border-pink-300"
                >
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span className="text-xs sm:text-sm font-semibold">🌠 A shooting star! Click here to make a secret wish!</span>
                </div>
            )}

            {/* 3D Celestial Sky Canvas */}
            <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onWheel={handleWheel}
                onClick={handleCanvasClick}
                className="w-full h-full cursor-grab active:cursor-grabbing"
            />

            {/* Bottom Actions Floating Island */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
                {/* Wish Jar Button */}
                <button
                    onClick={() => setIsWishListOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 rounded-full text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all font-medium text-sm"
                >
                    <Heart className="w-4 h-4 text-cyan-400" />
                    <span>Wish Jar ({wishes.length})</span>
                </button>

                {/* Summon Meteor Button */}
                <button
                    onClick={triggerMeteor}
                    className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 hover:border-white/40 rounded-full text-white/80 hover:text-white transition-all shadow-lg"
                    title="Summon Shooting Star"
                >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                </button>

                {/* Pin New Star Button */}
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white rounded-full shadow-[0_0_25px_rgba(244,63,94,0.6)] font-bold text-sm tracking-wide transition-all transform hover:scale-105"
                >
                    <Plus className="w-4 h-4" />
                    <span>Name a Star</span>
                </button>
            </div>

            {/* Helper Hint */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center text-xs text-white/40 pointer-events-none">
                Drag to rotate sky • Scroll to zoom • Click any star to view memory
            </div>

            {/* ── MODAL: STAR DETAILS & POLAROID MEMORY ── */}
            {selectedStar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-slate-900 to-black border border-white/15 rounded-3xl p-6 shadow-2xl overflow-hidden">
                        {/* Glow halo */}
                        <div
                            className="absolute -top-20 -left-20 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none"
                            style={{ backgroundColor: STAR_COLORS[selectedStar.color]?.hex || '#fbbf24' }}
                        />

                        {/* Close button */}
                        <button
                            onClick={() => setSelectedStar(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Star Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/20"
                                style={{
                                    backgroundColor: `${STAR_COLORS[selectedStar.color]?.hex || '#fbbf24'}22`,
                                    borderColor: STAR_COLORS[selectedStar.color]?.hex || '#fbbf24'
                                }}
                            >
                                <Star
                                    className="w-6 h-6 animate-pulse"
                                    style={{ color: STAR_COLORS[selectedStar.color]?.hex || '#fbbf24' }}
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">{selectedStar.star_name}</h3>
                                <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {selectedStar.date_str || "Timeless"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        {selectedStar.creator_name || "Partner"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Star Type Badge */}
                        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-4 font-mono">
                            ✦ {STAR_TYPES[selectedStar.star_type]?.label || "Standard Star"}
                        </div>

                        {/* Polaroid Photo Preview if attached */}
                        {selectedStar.photo_url && (
                            <div className="mb-4 bg-white p-2.5 rounded-xl shadow-xl transform -rotate-1 border border-gray-200">
                                <img
                                    src={selectedStar.photo_url}
                                    alt={selectedStar.star_name}
                                    className="w-full h-44 object-cover rounded-lg"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <p className="text-[11px] text-gray-500 text-center font-serif mt-1 italic">
                                    Captured in our universe
                                </p>
                            </div>
                        )}

                        {/* Memory Text */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/90 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                            "{selectedStar.memory_text}"
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <button
                                onClick={() => handleDeleteStar(selectedStar.id)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Release Star</span>
                            </button>
                            <button
                                onClick={() => setSelectedStar(null)}
                                className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: PIN / NAME A NEW STAR ── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 to-black border border-pink-500/30 rounded-3xl p-6 shadow-2xl">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Etch a Memory in the Sky</h3>
                                <p className="text-xs text-white/50">Turn a special moment into an eternal glowing star</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddStar} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-white/70 mb-1">Star Name</label>
                                <input
                                    type="text"
                                    value={starName}
                                    onChange={(e) => setStarName(e.target.value)}
                                    placeholder="e.g., Midnight Rooftop Conversation"
                                    maxLength={45}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-white/70 mb-1">The Memory / Note</label>
                                <textarea
                                    value={memoryText}
                                    onChange={(e) => setMemoryText(e.target.value)}
                                    placeholder="Describe this cherished moment with your partner..."
                                    rows={3}
                                    maxLength={500}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-white/70 mb-1">Date of Memory</label>
                                    <input
                                        type="date"
                                        value={dateStr}
                                        onChange={(e) => setDateStr(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-white/70 mb-1">Star Constellation Type</label>
                                    <select
                                        value={starType}
                                        onChange={(e) => setStarType(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500"
                                    >
                                        <option value="single">Standard Star</option>
                                        <option value="binary">Twin Souls (Binary)</option>
                                        <option value="supernova">Supernova Pulse</option>
                                        <option value="diamond">Diamond Promise</option>
                                    </select>
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-white/70 mb-1.5">Celestial Color</label>
                                <div className="flex items-center gap-2.5">
                                    {Object.entries(STAR_COLORS).map(([key, item]) => (
                                        <button
                                            type="button"
                                            key={key}
                                            onClick={() => setStarColor(key)}
                                            className={`w-7 h-7 rounded-full transition-transform ${
                                                starColor === key ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                                            }`}
                                            style={{ backgroundColor: item.hex }}
                                            title={item.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Polaroid Photo URL */}
                            <div>
                                <label className="block text-xs font-semibold text-white/70 mb-1 flex items-center gap-1.5">
                                    <Camera className="w-3.5 h-3.5 text-pink-400" />
                                    <span>Memory Photo URL (Optional)</span>
                                </label>
                                <input
                                    type="url"
                                    value={photoUrl}
                                    onChange={(e) => setPhotoUrl(e.target.value)}
                                    placeholder="https://... (Image link of your memory)"
                                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50"
                            >
                                {submitting ? "Naming Star..." : "✨ Name this Star Forever"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: CAST SECRET WISH ── */}
            {isWishModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-sm bg-gradient-to-b from-gray-900 to-black border border-cyan-500/40 rounded-3xl p-6 shadow-2xl">
                        <button
                            onClick={() => setIsWishModalOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-4">
                            <span className="text-4xl">🌠</span>
                            <h3 className="text-lg font-bold text-white mt-2">Make a Secret Wish</h3>
                            <p className="text-xs text-white/50 mt-1">
                                Whispered to the shooting star. It will stay sealed in your Wish Jar until you reveal it!
                            </p>
                        </div>

                        <form onSubmit={handleMakeWish} className="space-y-4">
                            <textarea
                                value={wishText}
                                onChange={(e) => setWishText(e.target.value)}
                                placeholder="I wish we could..."
                                rows={3}
                                maxLength={300}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                            />

                            <button
                                type="submit"
                                disabled={wishSubmitting}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-50"
                            >
                                {wishSubmitting ? "Casting Wish..." : "🌟 Cast Secret Wish"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: WISH JAR ── */}
            {isWishListOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-slate-900 to-black border border-cyan-500/30 rounded-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col">
                        <button
                            onClick={() => setIsWishListOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                                <Heart className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Cosmic Wish Jar</h3>
                                <p className="text-xs text-white/50">Wishes caught from falling stars</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {wishes.length === 0 ? (
                                <div className="text-center py-10 text-white/40 text-xs">
                                    No wishes caught yet! Watch for shooting stars streaking across the sky.
                                </div>
                            ) : (
                                wishes.map((wish) => (
                                    <div
                                        key={wish.id}
                                        className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2"
                                    >
                                        <div className="flex items-center justify-between text-[11px] text-white/50">
                                            <span>By {wish.creator_name}</span>
                                            <span className={`px-2 py-0.5 rounded-full ${
                                                wish.is_revealed
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            }`}>
                                                {wish.is_revealed ? "Revealed" : "Secret Wish"}
                                            </span>
                                        </div>

                                        <p className="text-sm text-white/90 italic">
                                            "{wish.wish_text}"
                                        </p>

                                        {!wish.is_revealed && (
                                            <button
                                                onClick={() => handleRevealWish(wish.id)}
                                                className="self-end flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Reveal to Partner</span>
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
