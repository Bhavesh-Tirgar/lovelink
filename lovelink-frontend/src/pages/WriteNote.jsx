import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Clock, X, Lock, Flame } from 'lucide-react';
import api from '../api';
import PinModal from '../components/PinModal';
import { encryptSecret, getStoredVaultPin, setStoredVaultPin } from '../utils/crypto';

function formatDateLocal(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Live Parchment Preview ────────────────────────────────────────────────────
function ParchmentPreview({ title, body, photoUrl, isSecret, isEphemeral, burnAfterSeconds }) {
    return (
        <div
            className="rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative"
            style={{ background: '#fdf8f0', minHeight: 360 }}
        >
            {/* Decorative borders */}
            <div className="absolute inset-0 rounded-3xl border-2 border-amber-300/40 pointer-events-none" />
            <div className="absolute inset-[4px] rounded-[22px] border border-amber-200/20 pointer-events-none" />

            {/* Badges on top of parchment */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                {isSecret && (
                    <span className="text-[11px] font-bold bg-purple-900/90 text-purple-200 px-2.5 py-1 rounded-full shadow flex items-center gap-1 border border-purple-500/40">
                        <Lock className="w-3 h-3 text-purple-300" /> Secret Vault
                    </span>
                )}
                {isEphemeral && (
                    <span className="text-[11px] font-bold bg-rose-600/90 text-white px-2.5 py-1 rounded-full shadow flex items-center gap-1 border border-rose-400/40">
                        <Flame className="w-3 h-3 text-amber-300 animate-pulse" /> Burns in {burnAfterSeconds}s
                    </span>
                )}
            </div>

            <div className="p-7 pt-10">
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

                {isSecret ? (
                    <div className="bg-purple-950/10 border border-purple-800/20 rounded-2xl p-5 my-2 text-center">
                        <Lock className="w-8 h-8 text-purple-600 mx-auto mb-2 opacity-80" />
                        <p className="text-stone-700 text-sm font-semibold font-serif">Encrypted with 256-bit AES-GCM</p>
                        <p className="text-stone-500 text-xs mt-1">Only readable with your couple secret PIN</p>
                    </div>
                ) : body ? (
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
    const [error, setError] = useState('');
    const [showScheduler, setShowScheduler] = useState(false);
    const [isCapsule, setIsCapsule] = useState(false);

    // Milestone 3: Secret Vault & Ephemeral Self-Destruct States
    const [isSecret, setIsSecret] = useState(false);
    const [isEphemeral, setIsEphemeral] = useState(false);
    const [burnAfterSeconds, setBurnAfterSeconds] = useState(10);
    const [showPinModal, setShowPinModal] = useState(false);

    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    const MAX_CHARS = 1000;

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

    const performSend = async (pin = null) => {
        setSending(true);
        setError('');

        try {
            const coupleId = localStorage.getItem('couple_id') || 'lovelink_couple';
            let ciphertext = null;
            let iv = null;
            let finalText = body.trim();

            if (isSecret) {
                const activePin = pin || getStoredVaultPin();
                if (!activePin) {
                    setShowPinModal(true);
                    setSending(false);
                    return;
                }
                const encResult = await encryptSecret(finalText, activePin, coupleId);
                ciphertext = encResult.ciphertext;
                iv = encResult.iv;
                finalText = "🔐 [Encrypted Secret Note]";
            }

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
                    text: finalText,
                    photo_url: photoUrl || undefined,
                    open_at: openDate.toISOString(),
                    is_secret: isSecret,
                    secret_ciphertext: ciphertext,
                    secret_iv: iv,
                    is_ephemeral: isEphemeral,
                    burn_after_seconds: isEphemeral ? burnAfterSeconds : undefined,
                });
            } else {
                await api.post('/notes', {
                    title: title.trim() || undefined,
                    text: finalText,
                    photo_url: photoUrl || undefined,
                    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                    is_secret: isSecret,
                    secret_ciphertext: ciphertext,
                    secret_iv: iv,
                    is_ephemeral: isEphemeral,
                    burn_after_seconds: isEphemeral ? burnAfterSeconds : undefined,
                });
            }

            await fireConfetti();
            setSuccessMsg(isSecret ? 'Encrypted & Sent to Secret Vault! 🔐' : isEphemeral ? 'Self-Destructing Note Sent! 🔥' : 'Note sealed and sent! 💌');

            setTimeout(() => navigate('/notes'), 2000);
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Failed to send note. Please try again.');
            setSending(false);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!body.trim()) {
            setError('Please write something in your note.');
            return;
        }

        // If secret safe is checked and we don't have a PIN saved in this session, prompt for it
        if (isSecret && !getStoredVaultPin()) {
            setShowPinModal(true);
            return;
        }

        performSend();
    };

    const handlePinConfirm = (pin) => {
        setStoredVaultPin(pin);
        setShowPinModal(false);
        performSend(pin);
    };

    if (successMsg) {
        return (
            <div className="min-h-screen bg-[#05080f] flex items-center justify-center p-4">
                <div className="text-center animate-fade-in p-8 rounded-3xl bg-brand-card/90 border border-pink-500/30 max-w-sm shadow-2xl">
                    <p className="text-5xl mb-4">{isSecret ? '🔐' : isEphemeral ? '🔥' : '💌'}</p>
                    <p className="text-xl font-bold text-white">{successMsg}</p>
                    <p className="text-gray-400 text-xs mt-2">Returning to Love Notes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05080f] text-gray-100 pb-20">
            {/* Header */}
            <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-20">
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

                    {/* Mode Selector Tabs */}
                    <div className="grid grid-cols-3 gap-1.5 bg-black/40 rounded-2xl p-1.5 border border-white/10 mb-4">
                        <button
                            type="button"
                            onClick={() => { setIsCapsule(false); }}
                            className={`py-2.5 text-xs font-semibold rounded-xl transition-all ${!isCapsule ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            💌 Standard
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsCapsule(false); setIsSecret(!isSecret); }}
                            className={`py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${isSecret ? 'bg-purple-900/60 text-purple-200 border border-purple-500/40 shadow-sm' : 'text-gray-400 hover:text-purple-300'}`}
                        >
                            <Lock className="w-3.5 h-3.5" />
                            {isSecret ? 'Secret: ON' : 'Secret Vault'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsCapsule(true); setShowScheduler(true); }}
                            className={`py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${isCapsule ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-500/40 shadow-sm' : 'text-gray-400 hover:text-indigo-300'}`}
                        >
                            🕰️ Capsule
                        </button>
                    </div>

                    {/* Secret Safe & Ephemeral Options Card */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        {/* Secret Vault Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                    <Lock size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-white">Secret Safe (Client E2EE)</h4>
                                    <p className="text-[11px] text-gray-400">Encrypted with AES-256 using your private couple PIN</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={isSecret}
                                onChange={(e) => setIsSecret(e.target.checked)}
                                className="w-4 h-4 rounded text-pink-500 focus:ring-pink-500/30 bg-black/40 border-white/20 cursor-pointer"
                            />
                        </div>

                        {/* Ephemeral / Self-Destruct Toggle */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                                    <Flame size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-white">Burn After Reading (Self-Destruct)</h4>
                                    <p className="text-[11px] text-gray-400">Permanently vanishes after being viewed by your partner</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={isEphemeral}
                                onChange={(e) => setIsEphemeral(e.target.checked)}
                                className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500/30 bg-black/40 border-white/20 cursor-pointer"
                            />
                        </div>

                        {/* Ephemeral Duration Choices */}
                        {isEphemeral && (
                            <div className="pt-2 flex items-center gap-2 animate-fade-in">
                                <span className="text-[11px] text-rose-300 font-medium">Burn timer:</span>
                                {[
                                    { sec: 10, label: '10s' },
                                    { sec: 30, label: '30s' },
                                    { sec: 60, label: '1m' },
                                    { sec: 300, label: '5m' }
                                ].map(({ sec, label }) => (
                                    <button
                                        key={sec}
                                        type="button"
                                        onClick={() => setBurnAfterSeconds(sec)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                            burnAfterSeconds === sec
                                                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                                                : 'bg-white/5 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
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
                            placeholder={isSecret ? "Write your private secret note here... (will be encrypted on your device)" : "Write your heart out..."}
                            maxLength={MAX_CHARS}
                            rows={9}
                            className="w-full bg-white/5 rounded-2xl p-4 text-[15px] leading-relaxed text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none border border-white/10 focus:border-purple-500/30 transition-colors"
                            style={{ minHeight: 220 }}
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

                        {!isCapsule && (
                            <button
                                type="button"
                                onClick={() => setShowScheduler(v => !v)}
                                className={`flex items-center gap-1.5 text-sm transition-colors ${showScheduler ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'}`}
                            >
                                <Clock size={16} />
                                <span>Schedule</span>
                            </button>
                        )}

                        {scheduledAt && (
                            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                {formatDateLocal(scheduledAt)}
                            </span>
                        )}
                    </div>

                    {/* Datetime picker */}
                    {(showScheduler || isCapsule) && (
                        <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-2 animate-fade-in">
                            <label className="block text-xs font-semibold text-gray-300">
                                {isCapsule ? 'Lock until future date & time 🕰️' : 'Deliver at scheduled date & time 🎯'}
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                min={new Date().toISOString().slice(0, 16)}
                                required={isCapsule}
                            />
                            {isCapsule && <p className="text-[11px] text-purple-400">A locked padlocked frame that counts down until this exact moment!</p>}
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-rose-400 font-medium">{error}</p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={sending || !body.trim() || (isCapsule && !scheduledAt)}
                        className={`w-full py-3.5 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                            isCapsule ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-500/25'
                            : isSecret ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/25'
                            : isEphemeral ? 'bg-gradient-to-r from-rose-600 to-amber-600 shadow-rose-500/25'
                            : 'bg-gradient-to-r from-rose-600 to-pink-600 shadow-pink-500/25'
                        }`}
                    >
                        {sending ? 'Securing...' : isCapsule ? 'Bury Time Capsule 🔒' : isSecret ? 'Encrypt & Seal in Vault 🔐' : isEphemeral ? 'Send Burning Note 🔥' : 'Seal & Send 💌'}
                    </button>
                </form>

                {/* ── Live Preview (desktop only) ──────────────────────────────── */}
                <div className="hidden lg:block sticky top-24">
                    <p className="text-xs text-gray-500 mb-3 text-center tracking-widest uppercase">Live Parchment Preview</p>
                    <ParchmentPreview 
                        title={title} 
                        body={body} 
                        photoUrl={photoPreview || photoUrl} 
                        isSecret={isSecret}
                        isEphemeral={isEphemeral}
                        burnAfterSeconds={burnAfterSeconds}
                    />
                </div>
            </div>

            {/* PIN Keypad Modal for Vault Encryption */}
            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onConfirm={handlePinConfirm}
                title="Lock in Secret Safe"
                subtitle="Enter your 4-digit couple PIN to encrypt this note client-side"
            />

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}

export default WriteNote;
