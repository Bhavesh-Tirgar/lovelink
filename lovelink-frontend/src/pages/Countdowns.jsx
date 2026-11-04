import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, X } from 'lucide-react';
import api from '../api';

const EMOJI_OPTIONS = ['✈️', '🏠', '💍', '🎂', '🎄', '🌴', '🎓', '💑', '🎉', '🌟', '❤️', '🗓️'];

function getTimeLeft(secondsRemaining) {
    const s = Math.max(0, secondsRemaining);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return { days, hours, mins, secs };
}

function pad(n) { return String(n).padStart(2, '0'); }

// ── Timer Box ──────────────────────────────────────────────────────────────
function TimerBox({ value, label }) {
    return (
        <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center">
                <span className="text-2xl font-mono font-bold text-white">{pad(value)}</span>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{label}</span>
        </div>
    );
}

// ── Countdown Card ──────────────────────────────────────────────────────────
function CountdownCard({ countdown, now, myUserId, onDelete }) {
    const elapsed = Math.floor((now - new Date(countdown.target_date).getTime()) / 1000);
    const secsLeft = Math.max(0, countdown.seconds_remaining - elapsed);
    const isPast = secsLeft === 0;
    const { days, hours, mins, secs } = getTimeLeft(secsLeft);
    const canDelete = String(countdown.created_by) === String(myUserId);

    const targetStr = new Date(countdown.target_date).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    return (
        <div className={`relative rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300 transform group
      ${isPast
                ? 'bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-pink-500/20 border border-amber-500/30 backdrop-blur-md shadow-[inset_0_0_30px_rgba(245,158,11,0.1)]'
                : 'glass-card hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(168,85,247,0.15)] hover:border-purple-500/30'
            }`}
        >
            {/* Delete button */}
            {canDelete && (
                <button
                    onClick={() => onDelete(countdown.id)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete countdown"
                >
                    <Trash2 size={16} />
                </button>
            )}

            {/* Emoji + label */}
            <div className="text-center mb-6">
                <div className="text-5xl mb-3 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{countdown.emoji}</div>
                <h3 className="font-semibold text-white text-lg tracking-tight">{countdown.label}</h3>
            </div>

            {/* Timer or celebration */}
            {isPast ? (
                <div className="text-center py-3 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-2xl animate-bounce">🎉</p>
                    <p className="text-amber-300 font-bold text-sm mt-2 tracking-wide uppercase">This moment has arrived!</p>
                </div>
            ) : (
                <div className="flex justify-center gap-3">
                    <TimerBox value={days} label="Days" />
                    <TimerBox value={hours} label="Hrs" />
                    <TimerBox value={mins} label="Mins" />
                    <TimerBox value={secs} label="Secs" />
                </div>
            )}

            {/* Target date */}
            <p className="text-center text-[10px] text-gray-500 mt-6 font-medium uppercase tracking-widest">
                Target: {targetStr}
            </p>
        </div>
    );
}

// ── Add Form Modal ──────────────────────────────────────────────────────────
function AddForm({ onClose, onCreated }) {
    const [label, setLabel] = useState('');
    const [emoji, setEmoji] = useState('🗓️');
    const [dateVal, setDateVal] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // Minimum datetime (now + 1 min) for the picker
    const minDT = new Date(Date.now() + 60000).toISOString().slice(0, 16);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!label.trim()) { setError('Please enter a label'); return; }
        if (!dateVal) { setError('Please pick a date & time'); return; }

        const picked = new Date(dateVal);
        if (picked <= new Date()) { setError('Date must be in the future'); return; }

        setSaving(true);
        try {
            const res = await api.post('/countdowns', {
                label: label.trim(),
                emoji,
                target_date: picked.toISOString(),
            });
            onCreated(res.data);
            onClose();
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Failed to add countdown');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-md glass-card overflow-hidden animate-in zoom-in-95 duration-300 p-0 shadow-[0_0_50px_rgba(168,85,247,0.2)]"
            >
                {/* Decorative Top Gradient */}
                <div className="h-2 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white tracking-tight">New Countdown ⏳</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Label */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">What are you counting down to?</label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Next Visit, Anniversary..."
                            maxLength={60}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                        />
                    </div>

                    {/* Emoji picker */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Pick an emoji</label>
                        <div className="flex flex-wrap gap-2.5">
                            {EMOJI_OPTIONS.map((em) => (
                                <button
                                    key={em}
                                    type="button"
                                    onClick={() => setEmoji(em)}
                                    className={`text-2xl w-12 h-12 rounded-xl transition-all duration-300 flex items-center justify-center ${emoji === em
                                        ? 'bg-purple-500/30 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-110'
                                        : 'bg-white/5 border border-transparent hover:bg-white/10 hover:scale-105'
                                        }`}
                                >
                                    {em}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Date &amp; Time</label>
                        <input
                            type="datetime-local"
                            value={dateVal}
                            onChange={(e) => setDateVal(e.target.value)}
                            min={minDT}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                        />
                    </div>

                    {error && (
                        <p className="text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary w-full py-3.5 text-sm mt-2 font-bold"
                    >
                        {saving ? 'Adding...' : 'Add Countdown'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────
function Countdowns() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [myUserId, setMyUserId] = useState(null);
    const [now, setNow] = useState(Date.now()); // shared tick

    // Single interval for ALL countdowns
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const fetchAll = useCallback(async () => {
        try {
            const [cdRes, dashRes] = await Promise.all([
                api.get('/countdowns'),
                api.get('/dashboard'),
            ]);
            setItems(cdRes.data);
            setMyUserId(dashRes.data.my_user.id);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreated = (newCd) => {
        setItems(prev => [...prev, newCd].sort(
            (a, b) => new Date(a.target_date) - new Date(b.target_date)
        ));
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/countdowns/${id}`);
            setItems(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    // Sort: upcoming first, past at bottom
    const upcoming = items.filter(c => new Date(c.target_date) > new Date());
    const past = items.filter(c => new Date(c.target_date) <= new Date());
    const sorted = [...upcoming, ...past];

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
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent tracking-tight">Countdowns</h1>
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">Every second matters</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary py-2 px-4 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                >
                    <Plus size={16} className="inline mr-1" /> Add
                </button>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6">
                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse font-medium tracking-widest uppercase text-sm">Loading countdowns...</div>
                ) : sorted.length === 0 ? (
                    // Empty state
                    <div className="glass-card flex flex-col items-center justify-center py-20 px-6 max-w-md mx-auto text-center border-dashed border-white/20 mt-10 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-center mb-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-purple-500/10 blur-xl group-hover:bg-purple-500/20 transition-colors" />
                            <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform duration-500 relative z-10">
                                ⏳
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">No countdowns yet</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            Add your first countdown — next visit, anniversary, or any special moment.
                        </p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary w-full"
                        >
                            <Plus size={16} className="inline mr-1.5" /> Create a Countdown
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                        {sorted.map((cd, i) => (
                            <div key={cd.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms`, fillMode: 'both' }}>
                                <CountdownCard
                                    countdown={cd}
                                    now={now}
                                    myUserId={myUserId}
                                    onDelete={handleDelete}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showForm && (
                <AddForm onClose={() => setShowForm(false)} onCreated={handleCreated} />
            )}
        </div>
    );
}

export default Countdowns;
