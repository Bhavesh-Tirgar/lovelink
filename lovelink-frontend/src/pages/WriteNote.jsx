import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Clock, X } from 'lucide-react';
import api from '../api';

function formatDateLocal(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Live Parchment Preview ────────────────────────────────────────────────────
function ParchmentPreview({ title, body, photoUrl }) {
    return (
        <div
            className="rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative"
            style={{ background: '#fdf8f0', minHeight: 360 }}
        >
            {/* Decorative borders */}
            <div className="absolute inset-0 rounded-3xl border-2 border-amber-300/40 pointer-events-none" />
            <div className="absolute inset-[4px] rounded-[22px] border border-amber-200/20 pointer-events-none" />

            <div className="p-7 pt-8">
                <div className="w-8 h-0.5 bg-rose-300/60 rounded-full mb-5 mx-auto" />

                {title ? (
                    <h2 className="font-serif text-2xl text-stone-800 mb-4 text-center leading-tight">{title}</h2>
                ) : (
                    <h2 className="font-serif text-xl text-stone-300 mb-4 text-center italic">Your title...</h2>
                )}

                {photoUrl && (
                    <img
                        src={photoUrl}
                        alt="Preview"
                        className="w-full max-h-48 object-cover rounded-2xl mb-4 border border-amber-200/50"
                    />
                )}

                {body ? (
                    <p className="text-stone-700 text-[15px] leading-relaxed whitespace-pre-wrap text-center">{body}</p>
                ) : (
                    <p className="text-stone-400 text-[15px] italic text-center">Write your note here...</p>
                )}

                <div className="w-8 h-0.5 bg-rose-300/60 rounded-full mt-6 mx-auto" />
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
function WriteNote() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoPreview, setPhotoPreview] = useState('');
    const [photoUploading, setPhotoUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [, setError] = useState('');
    const [showScheduler, setShowScheduler] = useState(false);
    const [isCapsule, setIsCapsule] = useState(false);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    const MAX_CHARS = 1000;

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Local preview
        const localUrl = URL.createObjectURL(file);
        setPhotoPreview(localUrl);
        setPhotoUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/notes/upload-photo', formData);
            setPhotoUrl(res.data.photo_url);
        } catch (err) {
            setError('Photo upload failed. Try again.');
            setPhotoPreview('');
            setTimeout(() => setError(''), 4000);
        } finally {
            setPhotoUploading(false);
            e.target.value = null;
        }
    };

    const fireConfetti = async () => {
        try {
            const confetti = (await import('canvas-confetti')).default;
            confetti({
                particleCount: 140,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#f472b6', '#a855f7', '#ec4899', '#facc15'],
            });
        } catch { /* skip if not available */ }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!body.trim()) {
            setError('Please write something in your note.');
            return;
        }
        setSending(true);
        setError('');

        try {
            if (isCapsule) {
                if (!scheduledAt) {
                    setError('Time Capsules require an unlock date.');
                    setSending(false);
                    return;
                }
                const openDate = new Date(scheduledAt);
                if (openDate <= new Date()) {
                    setError('Capsule must be scheduled for the future.');
                    setSending(false);
                    return;
                }

                await api.post('/notes/capsule', {
                    title: title.trim() || undefined,
                    text: body.trim(),
                    photo_url: photoUrl || undefined,
                    open_at: openDate.toISOString(),
                });
            } else {
                await api.post('/notes', {
                    title: title.trim() || undefined,
                    text: body.trim(),
                    photo_url: photoUrl || undefined,
                    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                });
            }

            await fireConfetti();
            setSuccessMsg('Note sent! 💌');

            // Redirect after 2s
            setTimeout(() => navigate('/notes'), 2000);
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Failed to send note. Please try again.');
            setSending(false);
        }
    };

    if (successMsg) {
        return (
            <div className="min-h-screen bg-[#05080f] flex items-center justify-center">
                <div className="text-center animate-bounce">
                    <p className="text-5xl mb-4">💌</p>
                    <p className="text-2xl font-semibold text-white">{successMsg}</p>
                    <p className="text-gray-400 text-sm mt-2">Redirecting to notes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05080f] text-gray-100">
            {/* Header */}
            <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-black/30 backdrop-blur sticky top-0 z-20">
                <button
                    onClick={() => navigate('/notes')}
                    className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-gray-300"
                >
                    <ArrowLeft size={20} />
                </button>
                <span className="text-lg font-semibold text-gray-100">Write a Love Note</span>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* ── Composer ──────────────────────────────────────────────────── */}
                <form onSubmit={handleSend} className="space-y-4">

                    {/* Type Toggle */}
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 mb-6">
                        <button
                            type="button"
                            onClick={() => { setIsCapsule(false); setScheduledAt(''); setShowScheduler(false); }}
                            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${!isCapsule ? 'bg-white/10 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            ✨ Standard Note
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsCapsule(true); setShowScheduler(true); }}
                            className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${isCapsule ? 'bg-purple-900/50 text-purple-200 border border-purple-500/30' : 'text-gray-400 hover:text-purple-300'}`}
                        >
                            🕰️ Time Capsule
                        </button>
                    </div>

                    {/* Title */}
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give it a title... (optional)"
                            maxLength={100}
                            className="w-full bg-transparent text-2xl font-serif placeholder-gray-600 focus:outline-none text-gray-100 border-b border-white/10 pb-2 focus:border-purple-500/50 transition-colors"
                        />
                    </div>

                    {/* Body */}
                    <div className="relative">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write your heart out..."
                            maxLength={MAX_CHARS}
                            rows={10}
                            className="w-full bg-white/5 rounded-2xl p-4 text-[15px] leading-relaxed text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none border border-white/10 focus:border-purple-500/30 transition-colors"
                            style={{ minHeight: 250 }}
                        />
                        <span className="absolute bottom-3 right-4 text-xs text-gray-600">
                            {body.length}/{MAX_CHARS}
                        </span>
                    </div>

                    {/* Photo thumbnail */}
                    {photoPreview && (
                        <div className="relative inline-block">
                            <img
                                src={photoPreview}
                                alt="Attachment preview"
                                className="h-24 w-24 object-cover rounded-xl border border-white/10"
                            />
                            {photoUploading && (
                                <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white/40 border-t-purple-400 rounded-full animate-spin" />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => { setPhotoUrl(''); setPhotoPreview(''); }}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow"
                            >
                                <X size={10} className="text-white" />
                            </button>
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center gap-3 pt-1">
                        {/* Photo Upload */}
                        <label className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-400 cursor-pointer transition-colors">
                            <ImageIcon size={16} />
                            <span>Photo</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoChange}
                            />
                        </label>

                        {/* Schedule */}
                        <button
                            type="button"
                            onClick={() => setShowScheduler(v => !v)}
                            className={`flex items-center gap-1.5 text-sm transition-colors ${showScheduler ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'}`}
                        >
                            <Clock size={16} />
                            <span>Schedule</span>
                        </button>

                        {scheduledAt && (
                            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                {formatDateLocal(scheduledAt)}
                            </span>
                        )}
                    </div>

                    {/* Datetime picker */}
                    {showScheduler && (
                        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                            <Clock size={14} className="text-gray-400 flex-shrink-0" />
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 block mb-1">Send at</label>
                                {/* Scheduler Toggle (Only for standard notes) */}
                                {!isCapsule && (
                                    <button
                                        type="button"
                                        onClick={() => setShowScheduler(!showScheduler)}
                                        className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-medium transition-all ${showScheduler || scheduledAt ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-black/40 text-gray-400 border border-white/10 hover:bg-white/5 hover:text-gray-200'}`}
                                    >
                                        <Clock size={18} /> Schedule
                                    </button>
                                )}
                            </div>

                            {/* Date Picker */}
                            {showScheduler && (
                                <div className="p-4 bg-black/40 rounded-xl border border-white/10 animate-[slideUp_0.2s_ease-out]">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {isCapsule ? 'Lock until date & time 🕰️' : 'Deliver exactly at 🎯'}
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={(e) => setScheduledAt(e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
                                        min={new Date().toISOString().slice(0, 16)}
                                        required={isCapsule}
                                    />
                                    {isCapsule && <p className="text-xs text-purple-400 mt-2">Your partner will see a locked padlocked frame that counts down until this exact moment!</p>}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={sending || !body.trim() || (isCapsule && !scheduledAt)}
                        className={`w-full py-4 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isCapsule ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25'
                            : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-pink-500/25'
                            }`}
                    >
                        {sending ? 'Securing...' : isCapsule ? 'Bury Time Capsule 🔒' : 'Seal & Send 💌'}
                    </button>
                </form>

                {/* ── Live Preview (desktop only) ──────────────────────────────── */}
                <div className="hidden lg:block sticky top-24">
                    <p className="text-xs text-gray-500 mb-3 text-center tracking-widest uppercase">Live Preview</p>
                    <ParchmentPreview title={title} body={body} photoUrl={photoPreview || photoUrl} />
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div >
    );
}

export default WriteNote;
