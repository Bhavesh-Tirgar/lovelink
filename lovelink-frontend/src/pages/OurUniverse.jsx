import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, ArrowLeft, Star, X, Calendar, User, Trash2 } from 'lucide-react';
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

export default function OurUniverse() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    const [stars, setStars] = useState([]);
    const [selectedStar, setSelectedStar] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form inputs
    const [starName, setStarName] = useState('');
    const [memoryText, setMemoryText] = useState('');
    const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
    const [starColor, setStarColor] = useState('gold');
    const [submitting, setSubmitting] = useState(false);

    // 3D Celestial Camera State
    const cameraRef = useRef({
        rotX: 0,
        rotY: 0,
        targetRotX: 0,
        targetRotY: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
    });

    // Background ambient stars
    const ambientStarsRef = useRef([]);

    // Fetch memory stars from backend
    const fetchStars = useCallback(async () => {
        try {
            const res = await api.get('/universe/stars');
            setStars(res.data || []);
        } catch (e) {
            console.error("Failed to load stars", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStars();
    }, [fetchStars]);

    // Initialize 300 background stars
    useEffect(() => {
        const amb = [];
        for (let i = 0; i < 350; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = 600 + Math.random() * 200;
            amb.push({
                x: radius * Math.sin(phi) * Math.cos(theta),
                y: radius * Math.sin(phi) * Math.sin(theta),
                z: radius * Math.cos(phi),
                size: Math.random() * 1.5 + 0.4,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
                alpha: Math.random(),
            });
        }
        ambientStarsRef.current = amb;
    }, []);

    // 3D Canvas Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Shooting Star / Meteor State
        let meteor = null;
        let lastMeteorTime = Date.now();

        const render = () => {
            ctx.fillStyle = '#05020a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const cam = cameraRef.current;
            // Smooth rotation easing
            cam.rotX += (cam.targetRotX - cam.rotX) * 0.08;
            cam.rotY += (cam.targetRotY - cam.rotY) * 0.08;

            const cosX = Math.cos(cam.rotX);
            const sinX = Math.sin(cam.rotX);
            const cosY = Math.cos(cam.rotY);
            const sinY = Math.sin(cam.rotY);

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const fov = 450;

            // 1. Draw Ambient Background Stars
            ctx.fillStyle = '#ffffff';
            ambientStarsRef.current.forEach((st) => {
                // Rotate Y
                const x1 = st.x * cosY - st.z * sinY;
                const z1 = st.z * cosY + st.x * sinY;
                // Rotate X
                const y1 = st.y * cosX - z1 * sinX;
                const z2 = z1 * cosX + st.y * sinX;

                if (z2 + fov > 10) {
                    const scale = fov / (fov + z2 + 300);
                    const px = cx + x1 * scale;
                    const py = cy + y1 * scale;

                    st.alpha += st.twinkleSpeed;
                    const twinkle = (Math.sin(st.alpha) + 1) / 2 * 0.8 + 0.2;

                    ctx.globalAlpha = twinkle * Math.min(1, scale * 1.5);
                    ctx.beginPath();
                    ctx.arc(px, py, st.size * scale, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // 2. Draw Shooting Star (Meteor)
            const now = Date.now();
            if (!meteor && now - lastMeteorTime > 12000 && Math.random() < 0.04) {
                lastMeteorTime = now;
                meteor = {
                    x: Math.random() * canvas.width * 0.8,
                    y: Math.random() * canvas.height * 0.4,
                    dx: 12 + Math.random() * 8,
                    dy: 6 + Math.random() * 4,
                    length: 120 + Math.random() * 60,
                    alpha: 1,
                };
            }
            if (meteor) {
                ctx.save();
                ctx.strokeStyle = `rgba(255, 255, 255, ${meteor.alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(meteor.x, meteor.y);
                ctx.lineTo(meteor.x - meteor.dx * 3, meteor.y - meteor.dy * 3);
                ctx.stroke();
                ctx.restore();

                meteor.x += meteor.dx;
                meteor.y += meteor.dy;
                meteor.alpha -= 0.025;
                if (meteor.alpha <= 0 || meteor.x > canvas.width || meteor.y > canvas.height) {
                    meteor = null;
                }
            }

            // 3. Draw Couple Memory Stars
            stars.forEach((star) => {
                const sx = (star.coord_x || 0) * 3.5;
                const sy = (star.coord_y || 0) * 3.5;
                const sz = (star.coord_z || 0) * 3.5;

                // 3D Rotate
                const x1 = sx * cosY - sz * sinY;
                const z1 = sz * cosY + sx * sinY;
                const y1 = sy * cosX - z1 * sinX;
                const z2 = z1 * cosX + sy * sinX;

                if (z2 + fov > 20) {
                    const scale = fov / (fov + z2 + 100);
                    const px = cx + x1 * scale;
                    const py = cy + y1 * scale;

                    const colorConfig = STAR_COLORS[star.color] || STAR_COLORS.gold;

                    // Outer Glow
                    ctx.save();
                    const radGlow = ctx.createRadialGradient(px, py, 1, px, py, 26 * scale);
                    radGlow.addColorStop(0, colorConfig.glow);
                    radGlow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = radGlow;
                    ctx.beginPath();
                    ctx.arc(px, py, 26 * scale, 0, Math.PI * 2);
                    ctx.fill();

                    // Core Star Core
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(px, py, 4.5 * scale, 0, Math.PI * 2);
                    ctx.fill();

                    // Star Label Tag
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.font = `bold ${Math.max(10, Math.round(11 * scale))}px system-ui, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(star.star_name, px, py + 18 * scale);

                    // Tiny subtitle date
                    if (star.date_str) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.font = `${Math.max(8, Math.round(9 * scale))}px system-ui, sans-serif`;
                        ctx.fillText(star.date_str, px, py + 29 * scale);
                    }
                    ctx.restore();

                    // Store screen coordinates for click detection
                    star._screenX = px;
                    star._screenY = py;
                    star._screenRadius = 25 * scale;
                }
            });

            animId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, [stars]);

    // Handle 3D Orbit Dragging
    const handlePointerDown = (e) => {
        const cam = cameraRef.current;
        cam.isDragging = true;
        cam.lastMouseX = e.clientX || e.touches?.[0]?.clientX || 0;
        cam.lastMouseY = e.clientY || e.touches?.[0]?.clientY || 0;
    };

    const handlePointerMove = (e) => {
        const cam = cameraRef.current;
        if (!cam.isDragging) return;
        const curX = e.clientX || e.touches?.[0]?.clientX || 0;
        const curY = e.clientY || e.touches?.[0]?.clientY || 0;
        const dx = curX - cam.lastMouseX;
        const dy = curY - cam.lastMouseY;

        cam.targetRotY += dx * 0.005;
        cam.targetRotX = Math.max(-1.2, Math.min(1.2, cam.targetRotX - dy * 0.005));

        cam.lastMouseX = curX;
        cam.lastMouseY = curY;
    };

    const handlePointerUp = (e) => {
        const cam = cameraRef.current;
        const curX = e.clientX || e.changedTouches?.[0]?.clientX || 0;
        const curY = e.clientY || e.changedTouches?.[0]?.clientY || 0;

        // Check if user clicked on a Memory Star
        if (cam.isDragging) {
            const clickedStar = stars.find(st => {
                if (!st._screenX || !st._screenY) return false;
                const dist = Math.hypot(curX - st._screenX, curY - st._screenY);
                return dist <= Math.max(25, st._screenRadius || 20);
            });

            if (clickedStar) {
                setSelectedStar(clickedStar);
            }
        }
        cam.isDragging = false;
    };

    // Pin a new star submit handler
    const handleAddStar = async (e) => {
        e.preventDefault();
        if (!starName.trim() || !memoryText.trim()) {
            toast.error("Please enter a star name and memory!");
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/universe/stars', {
                star_name: starName.trim(),
                memory_text: memoryText.trim(),
                date_str: dateStr,
                color: starColor,
            });

            setStars(prev => [res.data, ...prev]);
            setIsAddModalOpen(false);
            setStarName('');
            setMemoryText('');
            toast.success("A new star has been named in your sky! ✨");

            confetti({
                particleCount: 100,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#fbbf24', '#f43f5e', '#a855f7', '#ffffff']
            });
        } catch (err) {
            toast.error("Could not pin star");
        } finally {
            setSubmitting(false);
        }
    };

    // Delete a star
    const handleDeleteStar = async (starId) => {
        try {
            await api.delete(`/universe/stars/${starId}`);
            setStars(prev => prev.filter(s => s.id !== starId));
            setSelectedStar(null);
            toast("Star returned to stardust");
        } catch (e) {
            toast.error("Could not delete star");
        }
    };

    return (
        <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden select-none font-sans">
            {/* 3D Celestial Canvas */}
            <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
            />

            {/* Top Navigation Bar */}
            <header className="relative z-20 flex items-center justify-between px-6 pt-6 pb-2 pointer-events-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md flex items-center gap-2 text-xs font-semibold"
                >
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-purple-500/30 backdrop-blur-xl shadow-lg">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-wider uppercase">
                        Our Universe • {stars.length} {stars.length === 1 ? 'Star' : 'Stars'}
                    </span>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all flex items-center gap-1.5 hover:scale-105"
                >
                    <Plus className="w-4 h-4" /> Name a Star
                </button>
            </header>

            {/* Hint overlay */}
            <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none z-10 px-4">
                <span className="px-4 py-1.5 rounded-full bg-black/50 border border-white/10 text-gray-400 font-medium text-xs backdrop-blur-md">
                    🌌 Drag to rotate the 3D night sky • Tap any star to read its memory
                </span>
            </div>

            {/* ── MODAL 1: VIEW MEMORY STAR ── */}
            {selectedStar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-md p-7 sm:p-8 rounded-3xl bg-gradient-to-b from-purple-950/70 via-gray-950/90 to-black border border-purple-500/30 shadow-2xl overflow-hidden">
                        {/* Glow orb */}
                        <div
                            className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none"
                            style={{ background: STAR_COLORS[selectedStar.color]?.glow || '#fbbf24' }}
                        />

                        <button
                            onClick={() => setSelectedStar(null)}
                            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                style={{ background: STAR_COLORS[selectedStar.color]?.hex || '#fbbf24' }}
                            >
                                <Star className="w-6 h-6 text-black fill-black" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white font-serif tracking-tight">
                                    {selectedStar.star_name}
                                </h3>
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3" />
                                    {selectedStar.date_str || "A timeless moment"}
                                </p>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 my-4 text-sm text-gray-200 leading-relaxed font-serif italic shadow-inner">
                            "{selectedStar.memory_text}"
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-white/10">
                            <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-purple-400" />
                                Pinned with love by {selectedStar.creator_name || "Partner"}
                            </span>
                            <button
                                onClick={() => handleDeleteStar(selectedStar.id)}
                                className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg transition-colors"
                                title="Remove star"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL 2: NAME A NEW STAR ── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-lg p-7 sm:p-8 rounded-3xl bg-gradient-to-b from-purple-950/80 via-gray-950/95 to-black border border-purple-500/30 shadow-2xl">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-5 h-5 text-pink-400" />
                            <h3 className="text-lg font-bold text-white">Name a Star in Our Universe</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-5">
                            Dedicate a permanent star to a memory, date, or inside joke with your partner.
                        </p>

                        <form onSubmit={handleAddStar} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5">
                                    Star Name / Milestone
                                </label>
                                <input
                                    type="text"
                                    value={starName}
                                    onChange={e => setStarName(e.target.value)}
                                    placeholder="e.g. The Night We First Kissed"
                                    maxLength={80}
                                    className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-2xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-pink-500 transition-all shadow-inner"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={dateStr}
                                        onChange={e => setDateStr(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-black/60 border border-white/15 rounded-2xl text-white text-xs focus:outline-none focus:border-pink-500 transition-all shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5">
                                        Star Color
                                    </label>
                                    <select
                                        value={starColor}
                                        onChange={e => setStarColor(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-black/60 border border-white/15 rounded-2xl text-white text-xs focus:outline-none focus:border-pink-500 transition-all shadow-inner"
                                    >
                                        {Object.entries(STAR_COLORS).map(([key, item]) => (
                                            <option key={key} value={key} className="bg-gray-900 text-white">
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5">
                                    Memory Note / Story
                                </label>
                                <textarea
                                    value={memoryText}
                                    onChange={e => setMemoryText(e.target.value)}
                                    placeholder="Write the story, feelings, or a secret note about this moment..."
                                    rows={3}
                                    maxLength={400}
                                    className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-2xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-pink-500 transition-all resize-none shadow-inner"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 font-bold text-sm text-white shadow-xl shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Star className="w-4 h-4 fill-white" />
                                {submitting ? "Placing Star in Orbit..." : "Pin Star to Our Night Sky ✨"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
