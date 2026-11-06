import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, CheckCircle } from 'lucide-react';
import api from '../api';
import useWebSocket from '../hooks/useWebSocket';

const REACTIONS = ['😂', '😍', '😮', '😢', '👏', '❤️'];

function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }
function fmt(secs) {
    const s = Math.max(0, secs);
    return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}

// ── Floating Reaction ─────────────────────────────────────────────────────────
function FloatingReaction({ emoji }) {
    const style = {
        position: 'fixed',
        bottom: '120px',
        left: `${20 + Math.random() * 60}%`,
        fontSize: '2.5rem',
        animation: 'floatUp 2s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 100,
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
    const streamUrl = `/movies/${movie.id}/stream`;

    // Handle incoming WS events
    useEffect(() => {
        if (!onIncoming) return;
        const { type, position } = onIncoming;
        const video = videoRef.current;
        if (!video) return;
        syncLock.current = true;
        if (type === 'play') { video.currentTime = position; video.play(); }
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
        if (v.paused) v.play(); else v.pause();
    };

    return (
        <div className="relative w-full bg-black rounded-2xl overflow-hidden">
            <video
                ref={videoRef}
                src={`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${streamUrl}`}
                className="w-full max-h-[60vh] object-contain"
                onPlay={() => { setPlaying(true); handlePlay(); }}
                onPause={() => { setPlaying(false); handlePause(); }}
                onTimeUpdate={() => setCurrent(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                onSeeked={handleSeeked}
            />
            {/* Custom controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                {/* Seekbar */}
                <input type="range" min={0} max={duration || 1} value={current} step={0.5}
                    onChange={e => { const v = videoRef.current; if (v) { v.currentTime = Number(e.target.value); } }}
                    className="w-full h-1 accent-purple-500 mb-2 cursor-pointer" />
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={togglePlay} className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors">
                            {playing ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <span className="text-xs text-gray-300 font-mono">{fmt(current)} / {fmt(duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; setMuted(m => !m); }} className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors">
                            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                            onChange={e => { const v = videoRef.current; if (v) v.volume = Number(e.target.value); setVolume(Number(e.target.value)); }}
                            className="w-20 h-1 accent-purple-500 cursor-pointer" />
                        <button onClick={() => videoRef.current?.requestFullscreen()} className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors">
                            <Maximize size={16} />
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
    const [volume, setVolume] = useState(100);
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
                    // Poll for current time
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

    const handleVolume = (val) => {
        if (!playerRef.current) return;
        playerRef.current.setVolume(Number(val));
        setVolume(Number(val));
    };

    return (
        <div className="relative w-full bg-black rounded-2xl overflow-hidden">
            {/* Invisible iframe — controller via JS API */}
            <div className="aspect-video w-full">
                <div id="yt-player" className="w-full h-full" />
            </div>
            {/* Transparent click guard (prevents accidental YT UI interactions) */}
            <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />

            {/* Custom controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 pointer-events-auto">
                <input type="range" min={0} max={duration || 1} value={current} step={1}
                    onChange={e => handleSeek(e.target.value)}
                    className="w-full h-1 accent-red-500 mb-2 cursor-pointer" />
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={togglePlay} className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors">
                            {playing ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <span className="text-xs text-gray-300 font-mono">{fmt(current)} / {fmt(duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Volume2 size={14} className="text-gray-400" />
                        <input type="range" min={0} max={100} step={1} value={volume}
                            onChange={e => handleVolume(e.target.value)}
                            className="w-20 h-1 accent-red-500 cursor-pointer" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Watch Room ─────────────────────────────────────────────────────────────────
function WatchRoom() {
    const { movieId } = useParams();
    const navigate = useNavigate();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [myUserId, setMyUserId] = useState(null);
    const [coupleId, setCoupleId] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [reactions, setReactions] = useState([]);
    const [incomingSync, setIncomingSync] = useState(null);
    const [, setPartnerOnline] = useState(false);
    const chatEndRef = useRef(null);

    // Fetch movie + session data
    useEffect(() => {
        Promise.all([api.get(`/movies/${movieId}`), api.get('/auth/me')])
            .then(([movieRes, meRes]) => {
                setMovie(movieRes.data);
                setMyUserId(meRes.data.user?.id);
                setCoupleId(meRes.data.couple_id);
            })
            .catch(() => navigate('/movies'))
            .finally(() => setLoading(false));
    }, [movieId, navigate]);

    // WS URL
    const wsUrl = coupleId
        ? `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/movies/ws/${coupleId}`
        : null;

    const handleWsMessage = useCallback((data) => {
        const { type } = data;
        if (['play', 'pause', 'seek', 'yt_play', 'yt_pause', 'yt_seek', 'sync_state'].includes(type)) {
            setIncomingSync(data);
        } else if (type === 'reaction') {
            const key = Date.now();
            setReactions(prev => [...prev, { emoji: data.emoji, key }]);
            setTimeout(() => setReactions(prev => prev.filter(r => r.key !== key)), 2200);
        } else if (type === 'chat') {
            setChatMessages(prev => [...prev, { text: data.text, name: data.name, from: data.from, mine: false }]);
        } else if (type === 'partner_online') {
            setPartnerOnline(true);
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
        const key = Date.now();
        setReactions(prev => [...prev, { emoji, key }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.key !== key)), 2200);
    };

    const sendChat = () => {
        if (!chatInput.trim()) return;
        sendMessage({ type: 'chat', text: chatInput.trim() });
        setChatMessages(prev => [...prev, { text: chatInput.trim(), name: 'You', from: myUserId, mine: true }]);
        setChatInput('');
    };

    const markWatched = async () => {
        try {
            await api.put(`/movies/${movieId}/watched`, {});
            setMovie(m => ({ ...m, watched_at: new Date().toISOString() }));
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="min-h-screen bg-[#05080f] flex items-center justify-center text-gray-500">Loading...</div>;
    if (!movie) return <div className="min-h-screen bg-[#05080f] flex items-center justify-center text-gray-500">Movie not found</div>;

    const isYouTube = movie.source_type === 'youtube';

    return (
        <div className="min-h-screen bg-[#02030a] text-gray-100 flex flex-col">
            <style>{`
        @keyframes floatUp {
          from { transform: translateY(0); opacity: 1; }
          to   { transform: translateY(-120px); opacity: 0; }
        }
      `}</style>

            {/* Floating reactions */}
            {reactions.map(r => <FloatingReaction key={r.key} emoji={r.emoji} />)}

            {/* Header */}
            <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40 backdrop-blur z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/movies')} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-base font-semibold truncate max-w-[200px] sm:max-w-none">{movie.title}</h1>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                            <span className="text-gray-500">Sync {isConnected ? 'live' : 'offline'}</span>
                            {isYouTube && <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">YouTube</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!movie.watched_at && (
                        <button onClick={markWatched}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs font-medium border border-green-500/20 transition-colors">
                            <CheckCircle size={14} /> Mark Watched
                        </button>
                    )}
                </div>
            </header>

            {/* Main layout */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Player — 65% on desktop */}
                <div className="lg:w-[65%] flex flex-col p-4 gap-4">
                    {isYouTube ? (
                        <YouTubePlayer movie={movie} sendMessage={sendMessage} onIncoming={incomingSync} />
                    ) : (
                        <HTML5Player movie={movie} sendMessage={sendMessage} onIncoming={incomingSync} />
                    )}

                    {/* Emoji reactions */}
                    <div className="flex gap-2 justify-center">
                        {REACTIONS.map(emoji => (
                            <button key={emoji} onClick={() => sendReaction(emoji)}
                                className="text-2xl p-2 rounded-xl hover:bg-white/10 active:scale-125 transition-all">
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat panel — 35% on desktop */}
                <div className="lg:w-[35%] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col" style={{ height: '100%', minHeight: '300px' }}>
                    <div className="px-4 py-3 border-b border-white/10">
                        <h2 className="text-sm font-medium text-gray-300">💬 Watch Chat</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: '50vh' }}>
                        {chatMessages.length === 0 && (
                            <p className="text-center text-gray-600 text-xs mt-4">Chat with your partner while you watch ❤️</p>
                        )}
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.mine ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-200'}`}>
                                    {!msg.mine && <p className="text-[10px] text-gray-400 mb-0.5">{msg.name}</p>}
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="px-4 py-3 border-t border-white/10">
                        <div className="flex gap-2">
                            <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                                placeholder="Type a message..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                            />
                            <button onClick={sendChat} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WatchRoom;
