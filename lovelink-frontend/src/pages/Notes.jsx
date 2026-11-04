import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Send as SendIcon, X } from 'lucide-react';
import api from '../api';

const GRADIENT_CYCLES = [
    'from-rose-900/60 via-purple-900/40 to-pink-900/60 border-rose-500/20',
    'from-teal-900/60 via-cyan-900/40 to-blue-900/60 border-teal-500/20',
    'from-amber-900/60 via-orange-900/40 to-yellow-900/60 border-amber-500/20',
];

function timeAgo(dateStr) {
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
    const lines = note.text.split('\n');
    const preview = lines.slice(0, 2).join(' ').slice(0, 120);

    const isCapsuleLocked = note.is_capsule && new Date(note.open_at) > new Date();

    return (
        <article
            onClick={() => !isCapsuleLocked && onClick()}
            className={`relative rounded-2xl border bg-gradient-to-br ${gradient} backdrop-blur-xl p-5 ${isCapsuleLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer group hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(236,72,153,0.15)] hover:border-pink-500/40'} transition-all duration-300`}
        >
            {/* Unread dot */}
            {!note.is_read && !showRecipient && !note.is_capsule && (
                <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_3px_rgba(168,85,247,0.6)]" />
            )}

            {/* Scheduled / delivered / capsule badge */}
            <div className="absolute top-3 right-3">
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
                ) : showRecipient ? (
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {initials}
                </div>
                <div className="min-w-0">
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
            ) : (
                <p className="text-sm text-gray-300 leading-relaxed line-clamp-2 mb-3">{preview}</p>
            )}

            <p className="text-[11px] text-gray-500">
                {note.is_capsule ? timeAgo(note.open_at) : timeAgo(note.delivered_at || note.created_at)}
            </p>
        </article>
    );
}

// ─── Note Modal ───────────────────────────────────────────────────────────────
function NoteModal({ note, onClose }) {
    useEffect(() => {
        const esc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [onClose]);

    const initials = (note.sender_name || '?')[0].toUpperCase();

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-lg glass-card overflow-hidden animate-in zoom-in-95 duration-300 p-0 shadow-[0_0_50px_rgba(236,72,153,0.2)]"
            >
                {/* Decorative Top Gradient */}
                <div className="h-2 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white z-10"
                >
                    <X size={18} />
                </button>

                <div className="p-8">
                    {/* Sender Info */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-xl font-bold text-white shadow-inner">
                            {initials}
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-widest text-pink-300/70 font-semibold mb-0.5">From</p>
                            <p className="font-semibold text-gray-100 text-lg tracking-tight">{note.sender_name}</p>
                        </div>
                    </div>

                    {/* Title */}
                    {note.title && (
                        <h2 className="font-serif text-2xl text-white mb-4 leading-tight font-medium">{note.title}</h2>
                    )}

                    {/* Body */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-6">
                        <p className="text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap font-serif italic">{note.text}</p>
                    </div>

                    {/* Photo Attachment */}
                    {note.photo_url && (
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

    const openNote = async (note) => {
        setSelectedNote(note);
        // Mark read on open if unread
        if (!note.is_read && tab === 'inbox') {
            try {
                await api.get(`/notes/${note.id}`); // triggers auto mark-read
                setInbox(prev => prev.map(n => n.id === note.id ? { ...n, is_read: true } : n));
            } catch { /* ignore */ }
        }
    };

    const items = tab === 'inbox' ? inbox : tab === 'sent' ? sent : capsules;

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
                    className="btn-primary py-2 px-5 text-sm"
                >
                    ✍️ Write Note
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mx-6 mb-8 p-1.5 glass-card max-w-md">
                {['inbox', 'sent', 'capsules'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${tab === t
                            ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-white shadow-[inset_0_0_0_1px_rgba(236,72,153,0.3)]'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }`}
                    >
                        {t === 'inbox' ? <Inbox size={16} /> : t === 'sent' ? <SendIcon size={16} /> : <span className="text-base">🕰️</span>}
                        {t === 'inbox' ? 'Inbox' : t === 'sent' ? 'Sent' : 'Capsules'}

                        {/* Notification Badges */}
                        {t === 'inbox' && inbox.filter(n => !n.is_read).length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-pink-500 text-[10px] font-bold text-white flex items-center justify-center shadow-md">
                                {inbox.filter(n => !n.is_read).length}
                            </span>
                        )}
                        {t === 'capsules' && capsules.filter(n => n.open_at && new Date(n.open_at) <= new Date() && !n.is_read).length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-purple-500 text-[10px] font-bold text-white flex items-center justify-center shadow-md">
                                {capsules.filter(n => n.open_at && new Date(n.open_at) <= new Date() && !n.is_read).length}
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
                    <div className="glass-card flex flex-col items-center justify-center py-20 px-6 max-w-md mx-auto text-center border-dashed border-white/20 mt-10 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 flex items-center justify-center mb-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-pink-500/10 blur-xl group-hover:bg-pink-500/20 transition-colors" />
                            <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] group-hover:scale-110 transition-transform duration-500 relative z-10">
                                {tab === 'inbox' ? '📭' : tab === 'sent' ? '✍️' : '🕰️'}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                            {tab === 'inbox' ? 'Your inbox is empty' : tab === 'sent' ? 'No notes sent yet' : 'No time capsules'}
                        </h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            {tab === 'inbox' ? 'Notes from your partner will appear here.' : tab === 'capsules' ? 'Create a scheduled Time Capsule for your partner to open in the future.' : 'Send a sweet message to brighten their day.'}
                        </p>
                        {tab !== 'inbox' && (
                            <button onClick={() => navigate('/notes/write')} className="btn-primary w-full">
                                Write a Note Now
                            </button>
                        )}
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
                <NoteModal note={selectedNote} onClose={() => setSelectedNote(null)} />
            )}
        </div>
    );
}

export default Notes;
