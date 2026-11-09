import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Send as SendIcon, X, Lock, Flame, KeyRound, ShieldCheck } from 'lucide-react';
import api from '../api';
import PinModal from '../components/PinModal';
import { decryptSecret, getStoredVaultPin, setStoredVaultPin } from '../utils/crypto';

const GRADIENT_CYCLES = [
    'from-rose-900/60 via-purple-900/40 to-pink-900/60 border-rose-500/20',
    'from-teal-900/60 via-cyan-900/40 to-blue-900/60 border-teal-500/20',
    'from-amber-900/60 via-orange-900/40 to-yellow-900/60 border-amber-500/20',
];

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Note Card ───────────────────────────────────────────────────────────────
function NoteCard({ note, index, onClick, showRecipient = false }) {
    const gradient = GRADIENT_CYCLES[index % GRADIENT_CYCLES.length];
    const initials = (note.sender_name || '?')[0].toUpperCase();
    const lines = (note.text || '').split('\n');
    const preview = lines.slice(0, 2).join(' ').slice(0, 120);

    const isCapsuleLocked = note.is_capsule && new Date(note.open_at) > new Date();
    const isBurned = note.is_burned;

    return (
        <article
            onClick={() => !isCapsuleLocked && onClick()}
            className={`relative rounded-2xl border ${
                isBurned 
                    ? 'bg-black/60 border-stone-800/80 opacity-70 cursor-pointer' 
                    : `bg-gradient-to-br ${gradient} backdrop-blur-xl ${isCapsuleLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer group hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(236,72,153,0.15)] hover:border-pink-500/40'}`
            } p-5 transition-all duration-300`}
        >
            {/* Unread dot */}
            {!note.is_read && !showRecipient && !note.is_capsule && !isBurned && (
                <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_3px_rgba(168,85,247,0.6)]" />
            )}

            {/* Badges on top right */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end max-w-[65%]">
                {isBurned ? (
                    <span className="text-[11px] bg-stone-800 text-stone-400 border border-stone-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        🔥 Burned into ashes
                    </span>
                ) : note.is_secret ? (
                    <span className="text-[11px] bg-purple-900/60 text-purple-200 border border-purple-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Lock className="w-3 h-3 text-purple-300" /> Secret Vault
                    </span>
                ) : null}

                {!isBurned && note.is_ephemeral && (
                    <span className="text-[11px] bg-rose-600/30 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Flame className="w-3 h-3 text-amber-300 animate-pulse" /> {note.burn_after_seconds}s Timer
                    </span>
                )}

                {note.is_capsule ? (
                    isCapsuleLocked ? (
                        <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🔒 Locks until {formatDate(note.open_at)}
                        </span>
                    ) : (
                        <span className="text-[11px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🔓 Capsule Unlocked!
                        </span>
                    )
                ) : showRecipient && !isBurned ? (
                    note.delivered_at ? (
                        <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            Delivered ✓
                        </span>
                    ) : (
                        <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            Scheduled for {formatDate(note.scheduled_at)}
                        </span>
                    )
                ) : null}
            </div>

            <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full ${isBurned ? 'bg-stone-800 text-stone-400' : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'} flex items-center justify-center text-sm font-bold flex-shrink-0 shadow`}>
                    {initials}
                </div>
                <div className="min-w-0 pr-16">
                    <p className="text-xs text-gray-400">
                        {showRecipient || note.is_capsule ? `From / To partner` : `From ${note.sender_name}`}
                    </p>
                    {note.title && !isCapsuleLocked && (
                        <h3 className="font-serif text-[15px] font-semibold text-gray-100 truncate">{note.title}</h3>
                    )}
                    {isCapsuleLocked && (
                        <h3 className="font-serif text-[15px] italic text-gray-400 truncate">Time Capsule</h3>
                    )}
                </div>
            </div>

            {isCapsuleLocked ? (
                <div className="py-2 flex items-center justify-center">
                    <p className="text-sm font-medium text-indigo-300">Wait for the future to reveal this message ✨</p>
                </div>
            ) : isBurned ? (
                <p className="text-xs text-stone-500 italic mb-2">🔥 This message has self-destructed and cannot be read.</p>
            ) : note.is_secret ? (
                <p className="text-xs text-purple-300 font-mono bg-purple-950/30 border border-purple-800/30 rounded-lg p-2.5 mb-3 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    Encrypted note — Click to unlock with PIN
                </p>
            ) : (
                <p className="text-sm text-gray-300 leading-relaxed line-clamp-2 mb-3">{preview}</p>
            )}

            <p className="text-[11px] text-gray-500">
                {isBurned 
                    ? `Burned ${timeAgo(note.burned_at)}`
                    : note.is_capsule 
                        ? timeAgo(note.open_at) 
                        : timeAgo(note.delivered_at || note.created_at)}
            </p>
        </article>
    );
}

// ─── Note Modal (with Secret Decryption & Ephemeral Burn Timer) ────────────────
function NoteModal({ note, onClose, onNoteBurned }) {
    const [decryptedText, setDecryptedText] = useState(null);
    const [showPinModal, setShowPinModal] = useState(false);
    const [decryptError, setDecryptError] = useState('');
    const [countdown, setCountdown] = useState(null);
    const [isBurned, setIsBurned] = useState(note.is_burned);
    const timerRef = useRef(null);

    // Initial check: if secret, try session PIN
    useEffect(() => {
        if (note.is_secret && !note.is_burned && note.secret_ciphertext) {
            const cachedPin = getStoredVaultPin();
            if (cachedPin) {
                const coupleId = localStorage.getItem('couple_id') || 'lovelink_couple';
                decryptSecret(note.secret_ciphertext, note.secret_iv, cachedPin, coupleId).then(plain => {
                    if (plain) setDecryptedText(plain);
                });
            }
        }
    }, [note]);

    // Ephemeral self-destruct countdown timer
    useEffect(() => {
        if (note.is_ephemeral && !isBurned && note.burn_after_seconds) {
            setCountdown(note.burn_after_seconds);

            timerRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        // Trigger burn!
                        api.post(`/notes/${note.id}/burn`).catch(() => {});
                        setIsBurned(true);
                        onNoteBurned(note.id);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [note.is_ephemeral, note.burn_after_seconds, isBurned, note.id, onNoteBurned]);

    const handlePinConfirm = async (pin) => {
        setShowPinModal(false);
        const coupleId = localStorage.getItem('couple_id') || 'lovelink_couple';
        const plain = await decryptSecret(note.secret_ciphertext, note.secret_iv, pin, coupleId);
        if (plain) {
            setDecryptedText(plain);
            setStoredVaultPin(pin);
            setDecryptError('');
        } else {
            setDecryptError('Incorrect PIN. Could not decrypt secret note.');
        }
    };

    const initials = (note.sender_name || '?')[0].toUpperCase();
    const percentLeft = countdown && note.burn_after_seconds ? (countdown / note.burn_after_seconds) * 100 : 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-lg rounded-3xl bg-brand-card/95 border border-pink-500/25 overflow-hidden shadow-2xl shadow-pink-950/40 p-0"
            >
                {/* Decorative Top Gradient */}
                <div className={`h-2 w-full ${isBurned ? 'bg-stone-700' : note.is_ephemeral ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600' : 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500'}`} />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-10"
                >
                    <X size={18} />
                </button>

                {/* Ephemeral Burning Header Banner */}
                {note.is_ephemeral && !isBurned && countdown !== null && (
                    <div className="bg-gradient-to-r from-rose-950/90 to-amber-950/90 border-b border-rose-500/30 p-3.5 px-6">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                                Self-destructing in {countdown}s
                            </span>
                            <span className="text-[11px] font-mono font-bold text-amber-300">{countdown}s</span>
                        </div>
                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-amber-400 to-rose-500 h-full transition-all duration-1000 ease-linear rounded-full"
                                style={{ width: `${percentLeft}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="p-7">
                    {/* Sender Info */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className={`w-12 h-12 rounded-full ${isBurned ? 'bg-stone-800 text-stone-400' : 'bg-gradient-to-br from-rose-400 to-purple-500 text-white'} flex items-center justify-center text-xl font-bold shadow-inner`}>
                            {initials}
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-widest text-pink-300/70 font-semibold mb-0.5">From</p>
                            <p className="font-semibold text-gray-100 text-lg tracking-tight">{note.sender_name}</p>
                        </div>
                    </div>

                    {/* Title */}
                    {note.title && !isBurned && (
                        <h2 className="font-serif text-2xl text-white mb-4 leading-tight font-medium">{note.title}</h2>
                    )}

                    {/* Body rendering */}
                    {isBurned ? (
                        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-7 mb-6 text-center animate-fade-in">
                            <span className="text-4xl block mb-2">🔥💨</span>
                            <h3 className="text-base font-semibold text-stone-300 font-serif mb-1">Note Self-Destructed</h3>
                            <p className="text-xs text-stone-500 leading-relaxed">
                                This note was set to burn after reading. Its contents and photos have been permanently destroyed and cleared from the database.
                            </p>
                        </div>
                    ) : note.is_secret && !decryptedText ? (
                        <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-6 mb-6 text-center space-y-3">
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center shadow-inner">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">Encrypted Secret Note</h3>
                            <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
                                This note is locked in your couple Secret Safe with 256-bit AES encryption.
                            </p>
                            {decryptError && (
                                <p className="text-xs text-rose-400 font-medium">{decryptError}</p>
                            )}
                            <button
                                onClick={() => setShowPinModal(true)}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-pink-500/20 hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2"
                            >
                                <KeyRound className="w-3.5 h-3.5" />
                                Unlock with PIN
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-6">
                            {note.is_secret && (
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 mb-3 pb-2 border-b border-white/5">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    End-to-End Decrypted with AES-256
                                </div>
                            )}
                            <p className="text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap font-serif italic">
                                {decryptedText || note.text}
                            </p>
                        </div>
                    )}

                    {/* Photo Attachment */}
                    {note.photo_url && !isBurned && (
                        <div className="rounded-2xl overflow-hidden mb-6 border border-white/10 relative group">
                            <img
                                src={note.photo_url}
                                alt="Note attachment"
                                className="w-full max-h-72 object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-[11px] text-gray-500 text-right uppercase tracking-wider font-semibold">
                        {formatDate(note.delivered_at || note.created_at)}
                    </p>
                </div>
            </div>

            {/* PIN modal */}
            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onConfirm={handlePinConfirm}
                title="Unlock Secret Safe"
                subtitle="Enter your couple PIN to decrypt this private note"
            />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Notes() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('inbox');
    const [inbox, setInbox] = useState([]);
    const [sent, setSent] = useState([]);
    const [capsules, setCapsules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const [inboxRes, sentRes, capsuleRes] = await Promise.all([
                api.get('/notes/inbox'),
                api.get('/notes/sent'),
                api.get('/notes/capsules'),
            ]);
            setInbox(inboxRes.data);
            setSent(sentRes.data);
            setCapsules(capsuleRes.data);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    // WebSocket listener for live burn & new notes
    useEffect(() => {
        const handleWsSync = (e) => {
            const data = e.detail;
            if (data?.type === 'note_burned') {
                setInbox(prev => prev.map(n => n.id === data.note_id ? { ...n, is_burned: true, text: '🔥 [This note has self-destructed]' } : n));
                setSent(prev => prev.map(n => n.id === data.note_id ? { ...n, is_burned: true, text: '🔥 [This note has self-destructed]' } : n));
                if (selectedNote?.id === data.note_id) {
                    setSelectedNote(prev => ({ ...prev, is_burned: true }));
                }
            } else if (data?.type === 'new_note' && data.note) {
                setInbox(prev => [data.note, ...prev]);
            }
        };

        window.addEventListener('lovelink:note_burned', handleWsSync);
        return () => window.removeEventListener('lovelink:note_burned', handleWsSync);
    }, [selectedNote]);

    const openNote = async (note) => {
        setSelectedNote(note);
        if (!note.is_read && tab === 'inbox' && !note.is_burned) {
            try {
                await api.get(`/notes/${note.id}`);
                setInbox(prev => prev.map(n => n.id === note.id ? { ...n, is_read: true } : n));
            } catch { /* ignore */ }
        }
    };

    const handleNoteBurned = (noteId) => {
        setInbox(prev => prev.map(n => n.id === noteId ? { ...n, is_burned: true } : n));
        setSent(prev => prev.map(n => n.id === noteId ? { ...n, is_burned: true } : n));
    };

    // Filter items based on active tab
    const items = 
        tab === 'inbox' 
            ? inbox.filter(n => !n.is_secret)
            : tab === 'vault'
                ? [...inbox, ...sent].filter((n, idx, arr) => n.is_secret && arr.findIndex(x => x.id === n.id) === idx)
                : tab === 'sent' 
                    ? sent 
                    : capsules;

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
                        Love Notes
                    </span>
                </div>
                <button
                    onClick={() => navigate('/notes/write')}
                    className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                >
                    <span>✍️</span> Write Note
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mx-6 mb-8 p-1.5 glass-card max-w-xl">
                {[
                    { id: 'inbox', label: 'Inbox', icon: <Inbox size={15} /> },
                    { id: 'vault', label: 'Secret Safe', icon: <Lock size={15} /> },
                    { id: 'sent', label: 'Sent', icon: <SendIcon size={15} /> },
                    { id: 'capsules', label: 'Capsules', icon: <span className="text-sm">🕰️</span> },
                ].map(({ id, label, icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${tab === id
                            ? id === 'vault' 
                                ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-purple-200 border border-purple-500/40 shadow-sm'
                                : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-white shadow-[inset_0_0_0_1px_rgba(236,72,153,0.3)]'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }`}
                    >
                        {icon}
                        <span>{label}</span>

                        {/* Notification Badges */}
                        {id === 'inbox' && inbox.filter(n => !n.is_read && !n.is_secret && !n.is_burned).length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-pink-500 text-[10px] font-bold text-white flex items-center justify-center shadow-md">
                                {inbox.filter(n => !n.is_read && !n.is_secret && !n.is_burned).length}
                            </span>
                        )}
                        {id === 'vault' && inbox.filter(n => n.is_secret && !n.is_read && !n.is_burned).length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-purple-500 text-[10px] font-bold text-white flex items-center justify-center shadow-md">
                                {inbox.filter(n => n.is_secret && !n.is_read && !n.is_burned).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 pt-2">
                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse font-medium tracking-widest uppercase text-sm">Loading notes...</div>
                ) : items.length === 0 ? (
                    <div className="glass-card flex flex-col items-center justify-center py-20 px-6 max-w-md mx-auto text-center border-dashed border-white/20 mt-10 animate-fade-in">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 flex items-center justify-center mb-6 relative overflow-hidden group">
                            <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                                {tab === 'inbox' ? '📭' : tab === 'vault' ? '🔐' : tab === 'sent' ? '✍️' : '🕰️'}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                            {tab === 'inbox' 
                                ? 'Your inbox is empty' 
                                : tab === 'vault'
                                    ? 'Secret Safe is empty'
                                    : tab === 'sent' 
                                        ? 'No notes sent yet' 
                                        : 'No time capsules'}
                        </h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            {tab === 'inbox' 
                                ? 'Sweet messages from your partner will appear here.' 
                                : tab === 'vault'
                                    ? 'Encrypted notes locked with your couple PIN will stay safe here.'
                                    : tab === 'capsules' 
                                        ? 'Create a scheduled Time Capsule for your partner to open in the future.' 
                                        : 'Send a heartfelt note to brighten their day.'}
                        </p>
                        <button onClick={() => navigate('/notes/write')} className="btn-primary w-full max-w-xs">
                            {tab === 'vault' ? 'Create a Secret Note 🔐' : 'Write a Note Now ✍️'}
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {items.map((note, i) => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                index={i}
                                onClick={() => openNote(note)}
                                showRecipient={tab === 'sent'}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {selectedNote && (
                <NoteModal 
                    note={selectedNote} 
                    onClose={() => setSelectedNote(null)} 
                    onNoteBurned={handleNoteBurned}
                />
            )}
        </div>
    );
}

export default Notes;
