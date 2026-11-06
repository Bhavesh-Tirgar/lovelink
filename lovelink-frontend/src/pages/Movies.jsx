import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Youtube, Trash2, Play, MoreVertical } from 'lucide-react';
import api from '../api';
import { extractYouTubeId, getYouTubeThumbnail } from '../utils/youtube';

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'today';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onAdded }) {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = (f) => {
        if (!f) return;
        setFile(f);
        setTitle(f.name.replace(/\.[^/.]+$/, ''));
    };

    const handleUpload = async () => {
        if (!file) { setError('Please select a file'); return; }
        setUploading(true); setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('title', title || file.name);
            const res = await api.post('/movies/upload', fd, {
                onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
            });
            onAdded(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#0d0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-lg font-semibold mb-5">📁 Upload Movie</h2>

                <label className="block border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-2xl p-8 text-center cursor-pointer mb-4 transition-colors">
                    <Upload size={28} className="mx-auto text-gray-500 mb-2" />
                    <p className="text-sm text-gray-400">{file ? file.name : 'Click to select video file'}</p>
                    <p className="text-xs text-gray-600 mt-1">MP4, MOV, AVI, MKV, WebM · max 4 GB</p>
                    <input type="file" accept="video/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                </label>

                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Title" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 mb-4" />

                {uploading && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Uploading...</span><span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
                {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                <button onClick={handleUpload} disabled={uploading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold transition-all disabled:opacity-50">
                    {uploading ? `Uploading ${progress}%` : 'Upload'}
                </button>
            </div>
        </div>
    );
}

// ── YouTube Modal ─────────────────────────────────────────────────────────────
function YouTubeModal({ onClose, onAdded }) {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [videoId, setVideoId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleUrlChange = (val) => {
        setUrl(val);
        const id = extractYouTubeId(val);
        setVideoId(id);
        if (!title && id) setTitle('');
    };

    const handleAdd = async () => {
        if (!videoId) { setError('Invalid YouTube URL'); return; }
        if (!title.trim()) { setError('Please enter a title'); return; }
        setSaving(true); setError('');
        try {
            const res = await api.post('/movies/add-youtube', { title: title.trim(), source_type: 'youtube', youtube_url: url });
            onAdded(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add video');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#0d0f1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                    <span className="text-red-500"><Youtube size={22} /></span> Add YouTube Video
                </h2>

                <input type="text" value={url} onChange={e => handleUrlChange(e.target.value)}
                    placeholder="Paste YouTube link here..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 mb-3" />

                {/* Preview */}
                {url && (
                    <div className={`flex items-center gap-2 text-sm mb-3 ${videoId ? 'text-green-400' : 'text-red-400'}`}>
                        <span>{videoId ? '✓' : '✗'}</span>
                        <span>{videoId ? 'Valid YouTube video' : 'Invalid YouTube URL'}</span>
                    </div>
                )}
                {videoId && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                        <img src={getYouTubeThumbnail(videoId)} alt="Preview"
                            className="w-full object-cover" onError={e => e.target.style.display = 'none'} />
                    </div>
                )}

                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 mb-4" />

                {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                <button onClick={handleAdd} disabled={saving || !videoId}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold transition-all disabled:opacity-50">
                    {saving ? 'Adding...' : 'Add to Watchlist'}
                </button>
            </div>
        </div>
    );
}

// ── Movie Card ────────────────────────────────────────────────────────────────
function MovieCard({ movie, myUserId, onDelete, onWatch }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isMine = String(movie.added_by) === String(myUserId);

    const sourceBadge = movie.source_type === 'youtube'
        ? 'bg-red-500/20 text-red-400 border-red-500/30'
        : 'bg-blue-500/20 text-blue-400 border-blue-500/30';

    return (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all group">
            {/* Thumbnail */}
            <div className="aspect-video bg-black/50 relative overflow-hidden">
                {movie.thumbnail_url
                    ? <img src={movie.thumbnail_url} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center"><Play size={40} className="text-gray-600" /></div>
                }
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <button onClick={() => onWatch(movie)} className="opacity-0 group-hover:opacity-100 transition-opacity w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30">
                        <Play size={24} className="text-white ml-1" />
                    </button>
                </div>
                <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full border font-medium ${sourceBadge}`}>
                    {movie.source_type === 'youtube' ? 'YouTube' : 'Uploaded'}
                </span>
                {movie.watched_at && (
                    <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Watched ✓</span>
                )}
            </div>

            {/* Info */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-100 text-sm truncate">{movie.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Added by {movie.adder_name} · {timeAgo(movie.created_at)}</p>
                    </div>
                    {isMine && (
                        <div className="relative">
                            <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-500">
                                <MoreVertical size={16} />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 top-8 z-10 bg-[#0d0f1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[120px]">
                                    <button onClick={() => { onDelete(movie.id); setMenuOpen(false); }}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <button onClick={() => onWatch(movie)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium transition-all">
                    <Play size={14} /> Watch Now
                </button>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
function Movies() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('queue');
    const [movies, setMovies] = useState([]);
    const [watched, setWatched] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myUserId, setMyUserId] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [showYT, setShowYT] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [dashRes, queueRes, watchedRes] = await Promise.all([
                api.get('/dashboard'),
                api.get('/movies?watched=false'),
                api.get('/movies?watched=true'),
            ]);
            setMyUserId(dashRes.data.my_user.id);
            setMovies(queueRes.data);
            setWatched(watchedRes.data);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/movies/${id}`);
            setMovies(prev => prev.filter(m => m.id !== id));
            setWatched(prev => prev.filter(m => m.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleAdded = (movie) => setMovies(prev => [movie, ...prev]);

    const current = tab === 'queue' ? movies : watched;

    return (
        <div className="min-h-screen bg-[#05080f] text-gray-100">
            <header className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/30 backdrop-blur sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-gray-300">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-semibold">Watch Together 🎬</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowUpload(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium transition-all">
                        <Upload size={14} /> Upload
                    </button>
                    <button onClick={() => setShowYT(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-all">
                        <Youtube size={14} /> YouTube
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 mx-5 mt-5 bg-white/5 rounded-xl p-1 max-w-xs">
                {[['queue', '🎬 Queue'], ['watched', '✅ Watched']].map(([t, label]) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-white/10 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
                        {label} {t === 'queue' ? `(${movies.length})` : `(${watched.length})`}
                    </button>
                ))}
            </div>

            <main className="max-w-5xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="text-center py-24 text-gray-500">Loading...</div>
                ) : current.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-4xl mb-3">🎬</p>
                        <p className="text-gray-300 text-lg font-medium mb-2">{tab === 'queue' ? 'No movies in queue' : 'No movies watched yet'}</p>
                        <p className="text-gray-500 text-sm mb-6">
                            {tab === 'queue' ? 'Upload a movie or add a YouTube link to get started' : 'Watch a movie together and mark it as watched'}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowUpload(true)} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all">📁 Upload</button>
                            <button onClick={() => setShowYT(true)} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all">▶️ YouTube</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {current.map(movie => (
                            <MovieCard key={movie.id} movie={movie} myUserId={myUserId}
                                onDelete={handleDelete}
                                onWatch={(m) => navigate(`/watch/${m.id}`)} />
                        ))}
                    </div>
                )}
            </main>

            {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAdded={handleAdded} />}
            {showYT && <YouTubeModal onClose={() => setShowYT(false)} onAdded={handleAdded} />}
        </div>
    );
}

export default Movies;
