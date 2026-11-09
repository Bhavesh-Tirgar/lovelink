import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    ArrowLeft, 
    Play, 
    Pause, 
    Volume2, 
    VolumeX, 
    Maximize, 
    CheckCircle, 
    Upload, 
    Youtube, 
    Film, 
    Heart, 
    Send, 
    X, 
    Sparkles, 
    UserCheck, 
    BellRing 
} from 'lucide-react';
import api from '../api';
import useWebSocket from '../hooks/useWebSocket';
import { getWsBaseUrl } from '../utils/wsUrl';
import { extractYouTubeId } from '../utils/youtube';
import WatchCamBubble from '../components/WatchCamBubble';
import toast from 'react-hot-toast';

const REACTIONS = ['🍿', '❤️', '😂', '😍', '😮', '😭', '🔥', '👏'];

function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }
function fmt(secs) {
    const s = Math.max(0, secs);
    return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}

// ── Floating Reaction Component ────────────────────────────────────────────────
function FloatingReaction({ emoji }) {
    const [left] = useState(() => 15 + Math.random() * 70);
    const [scale] = useState(() => 0.85 + Math.random() * 0.6);
    const [rotation] = useState(() => (Math.random() - 0.5) * 40);

    const style = {
        position: 'fixed',
        bottom: '180px',
        left: `${left}%`,
        fontSize: `${2.8 * scale}rem`,
        transform: `rotate(${rotation}deg)`,
        animation: 'floatUp 2.8s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 100,
        filter: 'drop-shadow(0 0 12px rgba(236,72,153,0.6))',
    };
    return <div style={style}>{emoji}</div>;
}

// ── HTML5 Video Player ────────────────────────────────────────────────────────
function HTML5Player({ movie, sendMessage, onIncoming }) {
    const videoRef = useRef(null);
    const syncLock = useRef(false);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const apiBase = process.env.REACT_APP_API_URL || 'https://lovelink-sfzx.onrender.com';
    const streamUrl = movie.file_url?.startsWith('http') 
        ? movie.file_url 
        : `${apiBase}/movies/${movie.id}/stream?token=${encodeURIComponent(token)}`;

    // Handle incoming WS events
    useEffect(() => {
        if (!onIncoming) return;
        const { type, position } = onIncoming;
        const video = videoRef.current;
        if (!video) return;
        syncLock.current = true;
        if (type === 'play') { video.currentTime = position; video.play().catch(() => {}); }
        if (type === 'pause') { video.currentTime = position; video.pause(); }
        if (type === 'seek') { video.currentTime = position; }
        setTimeout(() => { syncLock.current = false; }, 300);
    }, [onIncoming]);

    const handlePlay = () => {
        if (syncLock.current) return;
        sendMessage({ type: 'play', position: videoRef.current?.currentTime || 0, movie_id: movie.id, source_type: 'upload' });
    };
    const handlePause = () => {
        if (syncLock.current) return;
        sendMessage({ type: 'pause', position: videoRef.current?.currentTime || 0, movie_id: movie.id, source_type: 'upload' });
    };
    const handleSeeked = () => {
        if (syncLock.current) return;
        sendMessage({ type: 'seek', position: videoRef.current?.currentTime || 0, movie_id: movie.id, source_type: 'upload' });
    };

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play().catch(() => {}); else v.pause();
    };

    return (
        <div className="relative w-full bg-black rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(147,51,234,0.15)] border border-white/10 group">
            <video
                ref={videoRef}
                src={streamUrl}
                playsInline
                className="w-full max-h-[62vh] object-contain mx-auto"
                onPlay={() => { setPlaying(true); handlePlay(); }}
                onPause={() => { setPlaying(false); handlePause(); }}
                onTimeUpdate={() => setCurrent(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                onSeeked={handleSeeked}
            />

            {/* Custom Cinema Controls */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 py-4 transition-opacity duration-300 opacity-95 group-hover:opacity-100">
                {/* Seekbar */}
                <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    value={current}
                    step={0.5}
                    onChange={e => {
                        const v = videoRef.current;
                        if (v) v.currentTime = Number(e.target.value);
                    }}
                    className="w-full h-1.5 accent-pink-500 mb-3 cursor-pointer bg-white/20 rounded-full"
                />

                <div className="flex items-center justify-between gap-3 text-white">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={togglePlay}
                            className="p-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 active:scale-95 text-white transition-all shadow-lg"
                        >
                            {playing ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <span className="text-xs text-gray-200 font-mono tracking-wider">
                            {fmt(current)} / {fmt(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const v = videoRef.current;
                                if (v) v.muted = !v.muted;
                                setMuted(m => !m);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                        >
                            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={muted ? 0 : volume}
                            onChange={e => {
                                const v = videoRef.current;
                                if (v) v.volume = Number(e.target.value);
                                setVolume(Number(e.target.value));
                            }}
                            className="w-20 h-1 accent-purple-500 cursor-pointer hidden sm:block"
                        />
                        <button
                            onClick={() => videoRef.current?.requestFullscreen()}
                            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                        >
                            <Maximize size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── YouTube IFrame Player ──────────────────────────────────────────────────────
function YouTubePlayer({ movie, sendMessage, onIncoming }) {
    const playerRef = useRef(null);
    const syncLock = useRef(false);
    const pollRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [apiReady, setApiReady] = useState(false);

    // Load YouTube IFrame API
    useEffect(() => {
        if (window.YT && window.YT.Player) { setApiReady(true); return; }
        if (!document.getElementById('yt-api-script')) {
            const tag = document.createElement('script');
            tag.id = 'yt-api-script';
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        }
        window.onYouTubeIframeAPIReady = () => setApiReady(true);
        return () => { if (!playerRef.current) delete window.onYouTubeIframeAPIReady; };
    }, []);

    // Create player once API is ready
    useEffect(() => {
        if (!apiReady || !movie.youtube_id) return;
        playerRef.current = new window.YT.Player('yt-player', {
            videoId: movie.youtube_id,
            playerVars: { controls: 0, rel: 0, modestbranding: 1, enablejsapi: 1 },
            events: {
                onReady: () => {
                    setDuration(playerRef.current.getDuration() || 0);
                    pollRef.current = setInterval(() => {
                        if (playerRef.current?.getCurrentTime) {
                            setCurrent(playerRef.current.getCurrentTime());
                            setDuration(playerRef.current.getDuration() || 0);
                        }
                    }, 500);
                },
                onStateChange: (event) => {
                    if (syncLock.current) return;
                    const position = playerRef.current?.getCurrentTime() || 0;
                    if (event.data === window.YT.PlayerState.PLAYING) {
                        setPlaying(true);
                        sendMessage({ type: 'yt_play', position, movie_id: movie.id, source_type: 'youtube' });
                    } else if (event.data === window.YT.PlayerState.PAUSED) {
                        setPlaying(false);
                        sendMessage({ type: 'yt_pause', position, movie_id: movie.id, source_type: 'youtube' });
                    }
                },
            },
        });
        return () => {
            clearInterval(pollRef.current);
            playerRef.current?.destroy();
        };
    }, [apiReady, movie.youtube_id, movie.id, sendMessage]);

    // Handle incoming WS events
    useEffect(() => {
        if (!onIncoming || !playerRef.current) return;
        const { type, position } = onIncoming;
        syncLock.current = true;
        if (type === 'yt_play' || type === 'sync_state') {
            playerRef.current.seekTo(position, true);
            playerRef.current.playVideo();
            setPlaying(true);
        } else if (type === 'yt_pause') {
            playerRef.current.seekTo(position, true);
            playerRef.current.pauseVideo();
            setPlaying(false);
        } else if (type === 'yt_seek') {
            playerRef.current.seekTo(position, true);
        }
        setTimeout(() => { syncLock.current = false; }, 300);
    }, [onIncoming]);

    const togglePlay = () => {
        if (!playerRef.current) return;
        if (playing) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
    };

    const handleSeek = (val) => {
        if (!playerRef.current) return;
        playerRef.current.seekTo(Number(val), true);
        sendMessage({ type: 'yt_seek', position: Number(val), movie_id: movie.id, source_type: 'youtube' });
    };

    return (
        <div className="relative w-full bg-black rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)] border border-white/10 group">
            <div className="aspect-video w-full">
                <div id="yt-player" className="w-full h-full" />
            </div>
            <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />

            {/* Custom controls */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 py-4 pointer-events-auto">
                <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    value={current}
                    step={1}
                    onChange={e => handleSeek(e.target.value)}
                    className="w-full h-1.5 accent-red-500 mb-3 cursor-pointer bg-white/20 rounded-full"
                />
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={togglePlay}
                            className="p-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:scale-105 active:scale-95 text-white transition-all shadow-lg"
                        >
                            {playing ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <span className="text-xs text-gray-200 font-mono tracking-wider">
                            {fmt(current)} / {fmt(duration)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── In-Room Video Uploader Modal ──────────────────────────────────────────────
function InRoomUploadModal({ onClose, onUploaded }) {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleUpload = async () => {
        if (!file) { setError('Please select a video file'); return; }
        setUploading(true); setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
            const res = await api.post('/movies/upload', fd, {
                onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
            });
            toast.success("Video uploaded! Playing on stage 🍿");
            onUploaded(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#0f1423] border border-purple-500/30 rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                        <Upload size={22} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">Upload Video for Watch Party</h2>
                        <p className="text-xs text-gray-400">Plays synchronously on stage for both of you</p>
                    </div>
                </div>

                <label className="block border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-2xl p-6 text-center cursor-pointer mb-4 transition-colors bg-white/5">
                    <Upload size={28} className="mx-auto text-purple-400 mb-2" />
                    <p className="text-sm font-medium text-gray-200">{file ? file.name : 'Click to select video'}</p>
                    <p className="text-xs text-gray-500 mt-1">MP4, MOV, MKV, WebM · Up to 4 GB</p>
                    <input type="file" accept="video/*" className="hidden" onChange={e => {
                        const f = e.target.files[0];
                        if (f) {
                            setFile(f);
                            setTitle(f.name.replace(/\.[^/.]+$/, ''));
                        }
                    }} />
                </label>

                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Video Title"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 mb-4"
                />

                {uploading && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Uploading video...</span><span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

                <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                >
                    {uploading ? `Uploading ${progress}%...` : 'Put on Cinema Stage'}
                </button>
            </div>
        </div>
    );
}

// ── In-Room YouTube Modal ──────────────────────────────────────────────────────
function InRoomYouTubeModal({ onClose, onAdded }) {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleAdd = async () => {
        if (!url) { setError('Please enter a YouTube URL'); return; }
        const videoId = extractYouTubeId(url);
        if (!videoId) { setError('Invalid YouTube URL'); return; }
        setSaving(true); setError('');
        try {
            const res = await api.post('/movies/add-youtube', {
                title: title || 'YouTube Video',
                youtube_url: url
            });
            toast.success("YouTube video loaded on stage!");
            onAdded(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load YouTube video');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#0f1423] border border-red-500/30 rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                        <Youtube size={22} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">Watch YouTube Together</h2>
                        <p className="text-xs text-gray-400">Paste any YouTube video or movie link</p>
                    </div>
                </div>

                <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-red-500/50 mb-3"
                />

                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Optional Title (e.g. Movie Night)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-red-500/50 mb-4"
                />

                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

                <button
                    onClick={handleAdd}
                    disabled={saving}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                >
                    {saving ? 'Loading...' : 'Play on Cinema Stage'}
                </button>
            </div>
        </div>
    );
}

// ── In-Room Library Drawer ────────────────────────────────────────────────────
function InRoomLibraryDrawer({ onClose, onSelect, currentMovieId }) {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/movies')
            .then(res => setMovies(res.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-sm h-full bg-[#0d101d] border-l border-white/10 p-6 flex flex-col shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Film size={18} className="text-purple-400" />
                        <span>Couple Movie Library</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {loading && <p className="text-xs text-gray-400 text-center py-8">Loading movies...</p>}
                    {!loading && movies.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-8">No movies in library yet.</p>
                    )}
                    {movies.map(m => (
                        <div
                            key={m.id}
                            onClick={() => {
                                onSelect(m);
                                onClose();
                            }}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                                m.id === currentMovieId
                                    ? 'bg-purple-600/20 border-purple-500/50 shadow-lg'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30'
                            }`}
                        >
                            <div className="w-12 h-12 rounded-xl bg-black/50 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                                {m.thumbnail_url ? (
                                    <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                                ) : (
                                    <Film size={20} className="text-gray-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">{m.title}</h4>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                    {m.source_type === 'youtube' ? <Youtube size={10} className="text-red-400" /> : <Film size={10} className="text-purple-400" />}
                                    <span>{m.source_type === 'youtube' ? 'YouTube' : 'Uploaded Video'}</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Main WatchRoom Component ───────────────────────────────────────────────────
export default function WatchRoom() {
    const { movieId } = useParams();
    const navigate = useNavigate();

    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [myUser, setMyUser] = useState(null);
    const [partnerUser, setPartnerUser] = useState(null);
    const [coupleId, setCoupleId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('couple_id') : null));
    const [partnerOnline, setPartnerOnline] = useState(false);

    // Watch controls & state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [reactions, setReactions] = useState([]);
    const [incomingSync, setIncomingSync] = useState(null);

    // In-room Modals
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showYouTubeModal, setShowYouTubeModal] = useState(false);
    const [showLibraryDrawer, setShowLibraryDrawer] = useState(false);

    const chatEndRef = useRef(null);

    // Fetch movie, me, and partner info
    useEffect(() => {
        Promise.all([
            api.get(`/movies/${movieId}`),
            api.get('/auth/me'),
            api.get('/dashboard')
        ])
            .then(([movieRes, meRes, dashRes]) => {
                setMovie(movieRes.data);
                setMyUser(meRes.data.user);
                setCoupleId(meRes.data.couple_id);
                setPartnerUser(dashRes.data?.partner_user || null);
            })
            .catch((err) => {
                console.error("WatchRoom load error:", err);
                toast.error("Failed to load Watch Room");
                navigate('/movies');
            })
            .finally(() => setLoading(false));
    }, [movieId, navigate]);

    // WebSocket connection
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const wsUrl = coupleId && token
        ? `${getWsBaseUrl()}/movies/ws/${coupleId}?token=${encodeURIComponent(token)}`
        : null;

    const handleWsMessage = useCallback((data) => {
        const { type } = data;
        if (['play', 'pause', 'seek', 'yt_play', 'yt_pause', 'yt_seek', 'sync_state', 'watch_cam_offer', 'watch_cam_answer', 'watch_cam_candidate', 'watch_cam_join', 'watch_cam_leave'].includes(type)) {
            setIncomingSync(data);
        } else if (type === 'reaction') {
            const key = Date.now() + Math.random();
            setReactions(prev => [...prev, { emoji: data.emoji, key }]);
            setTimeout(() => setReactions(prev => prev.filter(r => r.key !== key)), 2800);
            if (data.emoji === '❤️' || data.emoji === '😍') {
                import('canvas-confetti').then((c) => {
                    c.default({
                        particleCount: 30,
                        spread: 60,
                        origin: { y: 0.8 },
                        colors: ['#ec4899', '#f43f5e', '#a855f7']
                    });
                }).catch(() => {});
            }
        } else if (type === 'chat') {
            setChatMessages(prev => [...prev, { text: data.text, name: data.name || 'Partner', mine: false }]);
        } else if (type === 'seat_update') {
            if (data.status === 'seated') {
                setPartnerOnline(true);
                toast.success(`${data.user_name || 'Partner'} took a seat on stage! 🍿`, { duration: 3000 });
            } else {
                setPartnerOnline(false);
                toast("Partner left the watch party", { duration: 2500 });
            }
        } else if (type === 'change_movie') {
            if (data.movie) {
                setMovie(data.movie);
                toast.success(`Switched movie to "${data.movie.title}" 🎬`, { duration: 3000 });
            } else if (data.movie_id) {
                api.get(`/movies/${data.movie_id}`).then(res => setMovie(res.data)).catch(() => {});
            }
        } else if (type === 'seat_nudge') {
            toast(`${data.from_name || 'Partner'} is nudging you to take your cinema seat! 💖`, { duration: 4000 });
        }
    }, []);

    const { sendMessage, isConnected } = useWebSocket(wsUrl, handleWsMessage);

    // Request sync on connect
    useEffect(() => {
        if (isConnected && coupleId) {
            sendMessage({ type: 'sync_request' });
        }
    }, [isConnected, coupleId, sendMessage]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const sendReaction = (emoji) => {
        sendMessage({ type: 'reaction', emoji });
        const key = Date.now() + Math.random();
        setReactions(prev => [...prev, { emoji, key }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.key !== key)), 2800);
        if (emoji === '❤️' || emoji === '😍') {
            import('canvas-confetti').then((c) => {
                c.default({
                    particleCount: 25,
                    spread: 60,
                    origin: { y: 0.8 },
                    colors: ['#ec4899', '#f43f5e', '#a855f7']
                });
            }).catch(() => {});
        }
    };

    const sendChat = () => {
        if (!chatInput.trim()) return;
        sendMessage({ type: 'chat', text: chatInput.trim() });
        setChatMessages(prev => [...prev, { text: chatInput.trim(), name: 'You', mine: true }]);
        setChatInput('');
    };

    const handleNudgePartner = () => {
        sendMessage({ type: 'seat_nudge' });
        toast.success(`Nudged ${partnerUser?.name || 'partner'} to take their seat! 💌`);
    };

    const switchMovie = (newMovie) => {
        setMovie(newMovie);
        sendMessage({
            type: 'change_movie',
            movie_id: newMovie.id,
            source_type: newMovie.source_type,
            movie: newMovie
        });
        toast.success(`Switched to "${newMovie.title}" on cinema stage! 🎬`);
    };

    const markWatched = async () => {
        try {
            await api.put(`/movies/${movie.id}/watched`, {});
            setMovie(m => ({ ...m, watched_at: new Date().toISOString() }));
            toast.success("Marked as watched in Couple Diary! ❤️");
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070913] flex flex-col items-center justify-center text-white p-4">
                <Sparkles size={36} className="text-pink-400 animate-spin mb-4" />
                <p className="text-gray-300 font-medium">Entering VIP Couple Cinema...</p>
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="min-h-screen bg-[#070913] flex flex-col items-center justify-center text-white p-4">
                <p className="text-gray-400 mb-4">Movie not found</p>
                <button
                    onClick={() => navigate('/movies')}
                    className="px-6 py-2.5 rounded-2xl bg-purple-600 text-white font-medium"
                >
                    Return to Movies
                </button>
            </div>
        );
    }

    const isYouTube = movie.source_type === 'youtube';

    return (
        <div className="min-h-[100dvh] bg-[#060814] text-white flex flex-col select-none relative overflow-x-hidden pb-safe">
            <style>{`
                @keyframes floatUp {
                    from { transform: translateY(0); opacity: 1; scale: 1; }
                    to   { transform: translateY(-160px); opacity: 0; scale: 1.5; }
                }
            `}</style>

            {/* Floating emoji reactions */}
            {reactions.map(r => <FloatingReaction key={r.key} emoji={r.emoji} />)}

            {/* 1. Cinema Top Header */}
            <header className="px-4 sm:px-5 py-3 pt-safe border-b border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/movies')}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all shadow-md"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-md">
                            <span>{movie.title}</span>
                            <Sparkles size={14} className="text-pink-400" />
                        </h1>
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                            <span className="text-gray-400">
                                {isConnected ? 'Synchronized Watch Party' : 'Connecting Sync...'}
                            </span>
                            {isYouTube && (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                                    YouTube
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* In-Room Actions: WatchCam Bubble, Upload Video, YouTube, Library */}
                <div className="flex items-center gap-2">
                    <WatchCamBubble
                        coupleId={coupleId}
                        myUser={myUser}
                        partnerUser={partnerUser}
                        sendWsMessage={sendMessage}
                        onIncomingSync={incomingSync}
                    />
                    <button
                        onClick={() => setShowUploadModal(true)}
                        title="Upload Video to watch"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/20"
                    >
                        <Upload size={14} />
                        <span className="hidden sm:inline">Upload Video</span>
                    </button>

                    <button
                        onClick={() => setShowYouTubeModal(true)}
                        title="Add YouTube Video"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20"
                    >
                        <Youtube size={14} />
                        <span className="hidden sm:inline">YouTube</span>
                    </button>

                    <button
                        onClick={() => setShowLibraryDrawer(true)}
                        title="Pick from Library"
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                    >
                        <Film size={16} />
                    </button>

                    {!movie.watched_at && (
                        <button
                            onClick={markWatched}
                            title="Mark Watched in Diary"
                            className="p-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 transition-all active:scale-95"
                        >
                            <CheckCircle size={16} />
                        </button>
                    )}
                </div>
            </header>

            {/* 2. Main Watch Party Body */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">

                {/* Upper Section: Cinema Screen */}
                <div className="relative w-full">
                    {isYouTube ? (
                        <YouTubePlayer movie={movie} sendMessage={sendMessage} onIncoming={incomingSync} />
                    ) : (
                        <HTML5Player movie={movie} sendMessage={sendMessage} onIncoming={incomingSync} />
                    )}
                </div>

                {/* StarMaker-Style Two Stage Seats ("You" and "Partner") */}
                <div className="w-full bg-[#0d1021] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                                🎭 StarMaker Cinema Stage
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">
                                2 VIP Seats
                            </span>
                        </div>
                        <span className="text-xs text-gray-400 flex items-center gap-1.5">
                            <Heart size={13} className="text-pink-400 fill-pink-400" />
                            <span>Private Couple Screening</span>
                        </span>
                    </div>

                    {/* The 2 Stage Seats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Seat 1: Host (You) */}
                        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 to-black/60 border border-purple-500/40 shadow-xl flex items-center gap-4">
                            <div className="relative">
                                {myUser?.photo_url ? (
                                    <img src={myUser.photo_url} alt={myUser.name} className="w-14 h-14 rounded-full object-cover border-2 border-purple-400 shadow-md" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-lg">
                                        {myUser?.name?.[0]?.toUpperCase() || 'Y'}
                                    </div>
                                )}
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-300">
                                        👑 Seat 1 • Host
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-white truncate mt-1">{myUser?.name || 'You'}</h3>
                                <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                                    <UserCheck size={12} />
                                    <span>In Seat • Watching Cinema</span>
                                </p>
                            </div>
                        </div>

                        {/* Seat 2: Partner */}
                        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-pink-900/30 to-black/60 border border-pink-500/40 shadow-xl flex items-center gap-4">
                            <div className="relative">
                                {partnerUser?.photo_url ? (
                                    <img src={partnerUser.photo_url} alt={partnerUser.name} className="w-14 h-14 rounded-full object-cover border-2 border-pink-400 shadow-md" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center font-bold text-white text-lg">
                                        {partnerUser?.name?.[0]?.toUpperCase() || 'P'}
                                    </div>
                                )}
                                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${partnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-pink-500/30 text-pink-300">
                                        💖 Seat 2 • Partner
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-white truncate mt-1">{partnerUser?.name || 'Partner'}</h3>
                                {partnerOnline ? (
                                    <p className="text-xs text-pink-400 flex items-center gap-1 mt-0.5">
                                        <Sparkles size={12} />
                                        <span>Watching Together ❤️</span>
                                    </p>
                                ) : (
                                    <button
                                        onClick={handleNudgePartner}
                                        className="mt-1 flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 underline font-medium"
                                    >
                                        <BellRing size={12} />
                                        <span>Nudge to take seat</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Emoji Reaction Bar */}
                    <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-gray-400 font-medium">Cinema Reactions:</span>
                        <div className="flex items-center gap-1 sm:gap-2">
                            {REACTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => sendReaction(emoji)}
                                    title={`Send ${emoji} to stage`}
                                    className="p-2 sm:p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-125 text-xl sm:text-2xl transition-all"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Live Synced Watch Chat */}
                <div className="w-full bg-[#0d1021] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col">
                    <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                        <span>💬 Cinema Whispers</span>
                        <span className="text-xs text-gray-500">Live chat while you watch</span>
                    </h3>

                    <div className="h-44 overflow-y-auto space-y-2 pr-2 mb-3">
                        {chatMessages.length === 0 && (
                            <p className="text-center text-gray-500 text-xs py-8">
                                Whisper thoughts or jokes with {partnerUser?.name || 'partner'} while the movie plays ❤️
                            </p>
                        )}
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-xs sm:text-sm ${
                                    msg.mine 
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' 
                                        : 'bg-white/10 text-gray-200 border border-white/10'
                                }`}>
                                    {!msg.mine && <p className="text-[10px] text-pink-300 font-bold mb-0.5">{msg.name}</p>}
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendChat()}
                            placeholder="Type a cinema whisper..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-purple-500/50"
                        />
                        <button
                            onClick={sendChat}
                            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white transition-all shadow-md active:scale-95"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>

            </main>

            {/* In-Room Modals */}
            {showUploadModal && (
                <InRoomUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUploaded={switchMovie}
                />
            )}

            {showYouTubeModal && (
                <InRoomYouTubeModal
                    onClose={() => setShowYouTubeModal(false)}
                    onAdded={switchMovie}
                />
            )}

            {showLibraryDrawer && (
                <InRoomLibraryDrawer
                    onClose={() => setShowLibraryDrawer(false)}
                    onSelect={switchMovie}
                    currentMovieId={movie.id}
                />
            )}
        </div>
    );
}
