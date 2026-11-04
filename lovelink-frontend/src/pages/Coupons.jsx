import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Plus } from 'lucide-react';
import api from '../api';
import useWebSocket from '../hooks/useWebSocket';

function ScratchCard({ coupon, onScratched }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [scratched, setScratched] = useState(coupon.is_scratched);
    const ctxRef = useRef(null);
    const percentScratchedRef = useRef(0);

    useEffect(() => {
        if (scratched) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Configure canvas for high-DPI
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctxRef.current = ctx;

        // Fill with modern silver coating
        ctx.fillStyle = '#a3a3a3';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add text overlay
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = '#404040';
        ctx.textAlign = 'center';
        ctx.fillText('Scratch to Reveal!', canvas.width / 2, canvas.height / 2);

        // Prepare for erasing
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 40;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [scratched]);

    const calculateScratchRatio = () => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0;
        // Check alpha channel
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) transparent++;
        }
        const ratio = transparent / (pixels.length / 4);
        percentScratchedRef.current = ratio;

        if (ratio > 0.5 && !scratched) { // IF 50% scratched, reveal it broadly
            setScratched(true);
            onScratched(coupon.id);
        }
    };

    const startDrawing = (e) => {
        if (scratched) return;
        setIsDrawing(true);
        scratch(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (!scratched) calculateScratchRatio();
    };

    const scratch = (e) => {
        if (!isDrawing || scratched || !ctxRef.current || !canvasRef.current) return;

        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Handle both mouse and touch events
        const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    return (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden glass-card group">
            {/* The Prize Content (Hidden Underneath) */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex flex-col items-center justify-center p-6 text-center shadow-[inset_0_0_50px_rgba(236,72,153,0.1)]">
                <Gift className="text-pink-400 mb-3 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)] animate-pulse" size={36} />
                <h3 className="text-xl font-bold text-white leading-tight font-serif tracking-wide">{coupon.title}</h3>
                <p className="text-sm text-purple-200 mt-2 font-medium">{coupon.description}</p>
                <span className="absolute bottom-3 right-4 text-[10px] text-pink-300/60 uppercase tracking-widest font-bold">
                    From {coupon.creator_name}
                </span>
            </div>

            {/* The Scratchable Overlay */}
            {!scratched && (
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-pointer touch-none z-10"
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onMouseMove={scratch}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={scratch}
                />
            )}

            {/* Decorative Border Layer */}
            <div className="absolute inset-0 border-2 border-[rgba(255,255,255,0.05)] rounded-xl pointer-events-none z-20" />
        </div>
    );
}


function Coupons() {
    const navigate = useNavigate();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [coupleId, setCoupleId] = useState(null);
    const [myUserId, setMyUserId] = useState(null);

    const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

    useWebSocket(
        coupleId ? `${WS_URL}/ws/chat/${coupleId}` : null,
        (data) => {
            if (data.type === 'new_coupon' || data.type === 'coupon_scratched' || data.type === 'coupon_redeemed') {
                fetchCoupons(); // Re-fetch on global changes
            }
        }
    );

    const fetchCoupons = async () => {
        try {
            const res = await api.get('/coupons');
            setCoupons(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        api.get('/dashboard').then(res => {
            if (!res.data.linked) navigate('/dashboard');
            setCoupleId(res.data.couple_id);
            setMyUserId(res.data.my_user.id);
            fetchCoupons();
        }).catch(() => navigate('/dashboard'));
    }, [navigate]);

    const handleScratched = async (id) => {
        try {
            await api.put(`/coupons/${id}/scratch`);
            // We do optimistic local update right away so the UI stays snappy:
            setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_scratched: true } : c));
        } catch (e) {
            console.error("Failed to update scratch state", e);
        }
    };

    const handleRedeem = async (id) => {
        try {
            await api.put(`/coupons/${id}/redeem`);
            setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_redeemed: true } : c));
        } catch (e) {
            console.error("Failed to redeem", e);
        }
    };

    if (loading) return null;

    return (
        <div className="w-full pb-24 animate-in fade-in duration-700">
            {/* Header */}
            <header className="flex items-center justify-between px-6 pt-8 pb-4 sticky top-0 z-20 bg-brand-darker/80 backdrop-blur-md mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-2xl font-bold bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                        Love Coupons
                    </span>
                </div>
                <button
                    onClick={() => navigate('/coupons/new')}
                    className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                >
                    <Plus size={16} /> Create
                </button>
            </header>

            <main className="max-w-4xl mx-auto px-6">
                {coupons.length === 0 ? (
                    <div className="glass-card flex flex-col items-center justify-center py-20 px-6 max-w-md mx-auto text-center border-dashed border-white/20 mt-10 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 flex items-center justify-center mb-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-pink-500/10 blur-xl group-hover:bg-pink-500/20 transition-colors" />
                            <Gift className="text-5xl text-pink-400 filter drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] group-hover:scale-110 transition-transform duration-500 relative z-10" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">No coupons yet</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            Surprise your partner with a free massage, a movie night choice, or breakfast in bed!
                        </p>
                        <button
                            onClick={() => navigate('/coupons/new')}
                            className="btn-primary w-full"
                        >
                            Create a Coupon
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {coupons.map((coupon) => (
                            <div key={coupon.id} className="relative group flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ScratchCard coupon={coupon} onScratched={handleScratched} />

                                {/* Redeem UI overlay */}
                                {coupon.is_scratched && !coupon.is_redeemed && coupon.created_by !== myUserId && (
                                    <button
                                        onClick={() => handleRedeem(coupon.id)}
                                        className="mt-6 px-8 py-2.5 bg-gradient-to-r from-emerald-400 to-green-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all duration-300 w-full max-w-[200px]"
                                    >
                                        ✨ Redeem Now
                                    </button>
                                )}
                                {coupon.is_redeemed && (
                                    <span className="mt-6 px-6 py-2 bg-white/5 text-emerald-400 text-sm font-semibold rounded-xl border border-emerald-500/20 flex items-center gap-2">
                                        Redeemed ✅
                                    </span>
                                )}
                                {coupon.is_scratched && !coupon.is_redeemed && coupon.created_by === myUserId && (
                                    <span className="mt-6 px-6 py-2 bg-purple-500/10 text-purple-300 text-sm font-semibold rounded-xl border border-purple-500/20 animate-pulse">
                                        Waiting for redemption...
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default Coupons;
