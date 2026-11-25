import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import { getWsBaseUrl } from '../utils/wsUrl';

const MusicContext = createContext();

export const useMusic = () => useContext(MusicContext);

const SPOTIFY_STATE_KEY = 'lovelink_spotify_playback_state';
const SPOTIFY_LIKES_KEY = 'lovelink_spotify_liked_tracks';
const SILENT_CARRIER_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export const hasDirectAudioStream = (track) =>
    Boolean(track?.url && !/youtube\.com|youtu\.be/i.test(track.url));

export const isTrackYouTube = (track) =>
    Boolean(track && !hasDirectAudioStream(track) && (track.type === 'youtube' || track.videoId));

export const DEFAULT_FALLBACK_CHANNELS = [
    {
        id: 'bollywood-romance',
        name: '💖 Bollywood Romance & Arijit Hits',
        title: '💖 Bollywood Romance',
        tracks: [
            { id: 'bw-1', title: 'Kesariya', artist: 'Arijit Singh & Pritam', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80', url: 'https://api.audius.co/v1/tracks/NvXwOB4/stream?app_name=lovelink', fallback_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 283, type: 'audio' },
            { id: 'bw-2', title: 'Tum Hi Ho (Acoustic)', artist: 'Arijit Singh', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80', url: 'https://api.audius.co/v1/tracks/blQ8b/stream?app_name=lovelink', fallback_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 241, type: 'audio' },
            { id: 'bw-3', title: 'Raataan Lambiyan (Lo-Fi)', artist: 'Jubin Nautiyal & Asees Kaur', cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80', url: 'https://api.audius.co/v1/tracks/ZEJjy/stream?app_name=lovelink', fallback_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 267, type: 'audio' },
            { id: 'bw-4', title: 'Apna Bana Le', artist: 'Arijit Singh & Sachin-Jigar', cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80', url: 'https://api.audius.co/v1/tracks/B5EGGzm/stream?app_name=lovelink', fallback_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: 204, type: 'audio' },
        ]
    },
    {
        id: 'hindi-lofi',
        name: '🌙 Late Night Hindi Lo-Fi',
        title: '🌙 Hindi Lo-Fi',
        tracks: [
            { id: 'hl-1', title: 'Kesariya x Saibo (Lo-Fi)', artist: 'Hindi Lo-Fi Collective', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80', url: 'https://api.audius.co/v1/tracks/ZO0yNA6/stream?app_name=lovelink', fallback_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', duration: 437, type: 'audio' },
            { id: 'hl-2', title: 'Kabira (Midnight Chill)', artist: 'Bollywood Chill Room', cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80', url: 'https://api.audius.co/v1/tracks/Eq7JRXM/stream?app_name=lovelink', fallback_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', duration: 251, type: 'audio' },
        ]
    }
];

const notifyNativeMediaService = (playing, track) => {
    try {
        if (typeof window !== 'undefined' && window.LoveLinkNativeAudio?.setPlaybackState) {
            window.LoveLinkNativeAudio.setPlaybackState(
                Boolean(playing),
                String(track?.title || 'LoveLink Radio'),
                String(track?.artist || 'Couple Sanctuary')
            );
        }
    } catch { }
};

export const MusicProvider = ({ children }) => {
    const location = useLocation();
    const [channels, setChannels] = useState([]);
    const [customPlaylist, setCustomPlaylist] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [djName, setDjName] = useState(null);
    const [isSynced, setIsSynced] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'

    const [likedTracks, setLikedTracks] = useState(() => {
        try {
            const saved = typeof window !== 'undefined' ? localStorage.getItem(SPOTIFY_LIKES_KEY) : null;
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [token, setToken] = useState(() => (typeof window !== 'undefined' ? window.localStorage.getItem('token') : null));
    const [coupleId, setCoupleId] = useState(() => (typeof window !== 'undefined' ? window.localStorage.getItem('couple_id') : null));

    const audioRef = useRef(null);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isLocalAction = useRef(true);
    const savedPositionRef = useRef(0);
    const lastSavedSecRef = useRef(-1);
    const fallbackTriedTrackRef = useRef(null);
    const wasPlayingBeforeFocusLossRef = useRef(false);

    // Live state refs to eliminate stale closures in WS/DOM/MediaSession callbacks
    const currentTrackRef = useRef(currentTrack);
    const isPlayingRef = useRef(isPlaying);
    const currentTimeRef = useRef(currentTime);
    const durationRef = useRef(duration);
    const volumeRef = useRef(volume);
    const isShuffleRef = useRef(isShuffle);
    const repeatModeRef = useRef(repeatMode);
    const channelsRef = useRef(channels);
    const customPlaylistRef = useRef(customPlaylist);

    currentTrackRef.current = currentTrack;
    isPlayingRef.current = isPlaying;
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
    volumeRef.current = volume;
    isShuffleRef.current = isShuffle;
    repeatModeRef.current = repeatMode;
    channelsRef.current = channels;
    customPlaylistRef.current = customPlaylist;

    const getAudioEl = useCallback(() => audioRef.current, []);

    const persistPlaybackState = useCallback(() => {
        const track = currentTrackRef.current;
        if (!track) return;
        const sec = Math.floor(currentTimeRef.current || 0);
        try {
            localStorage.setItem(SPOTIFY_STATE_KEY, JSON.stringify({
                track,
                currentTime: sec,
                duration: durationRef.current || track.duration || 0,
                volume: volumeRef.current,
                savedAt: Date.now()
            }));
        } catch { }
    }, []);

    // Restore saved Spotify playback state on startup (Resume exact track & timestamp)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(SPOTIFY_STATE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.track) {
                    setCurrentTrack(data.track);
                    if (data.currentTime && data.currentTime > 0) {
                        setCurrentTime(data.currentTime);
                        savedPositionRef.current = data.currentTime;
                    }
                    if (data.duration && data.duration > 0) {
                        setDuration(data.duration);
                    }
                    if (data.volume !== undefined) {
                        setVolume(data.volume);
                    }
                }
            }
        } catch (e) {
            console.warn("Could not restore saved Spotify state:", e);
        }
    }, []);

    // Persist playback state throttled cleanly (every 2s or when pausing/switching track)
    useEffect(() => {
        if (!currentTrack) return;
        const sec = Math.floor(currentTime || 0);
        if (!isPlaying || Math.abs(sec - lastSavedSecRef.current) >= 2) {
            lastSavedSecRef.current = sec;
            persistPlaybackState();
        }
    }, [currentTrack, currentTime, isPlaying, volume, persistPlaybackState]);

    // Sync Native Android Foreground Service with current playing status
    useEffect(() => {
        notifyNativeMediaService(isPlaying && Boolean(currentTrack), currentTrack);
    }, [isPlaying, currentTrack]);

    // Cross-frame YouTube Player control bridge
    const controlYouTube = useCallback((action, param = null) => {
        const iframe = document.getElementById('yt-music-iframe');
        if (iframe && iframe.contentWindow) {
            let command = null;
            if (action === 'play') command = { event: 'command', func: 'playVideo', args: [] };
            else if (action === 'pause') command = { event: 'command', func: 'pauseVideo', args: [] };
            else if (action === 'seek') command = { event: 'command', func: 'seekTo', args: [param, true] };
            else if (action === 'listen') command = { event: 'listening', id: 'yt-music-iframe' };
            if (command) {
                iframe.contentWindow.postMessage(JSON.stringify(command), '*');
            }
        }
    }, []);

    // Background Audio Carrier for YouTube iframe tracks only (direct <audio> tracks act as their own media session!)
    const ensureAudioCarrier = useCallback((active) => {
        const audio = getAudioEl();
        if (!audio) return;
        if (active) {
            try {
                if (audio.src !== SILENT_CARRIER_URI) {
                    audio.src = SILENT_CARRIER_URI;
                    audio.loop = true;
                    audio.volume = 0.05;
                }
                audio.play().catch(() => { });
            } catch { }
        } else {
            try {
                if (audio.src === SILENT_CARRIER_URI) {
                    audio.pause();
                    audio.removeAttribute('src');
                    audio.load?.();
                }
            } catch { }
        }
    }, [getAudioEl]);

    const dispatchMediaCommand = useCallback((action) => {
        if (action === 'play') {
            if (!isPlayingRef.current) togglePlayRef.current();
        } else if (action === 'pause') {
            if (isPlayingRef.current) togglePlayRef.current();
        } else if (action === 'toggle') {
            togglePlayRef.current();
        } else if (action === 'next') {
            playNextRef.current();
        } else if (action === 'prev') {
            playPrevRef.current();
        }
    }, []);

    // Save on beforeunload & handle Android AudioFocus & lockscreen MediaSession actions
    useEffect(() => {
        const handleSave = () => persistPlaybackState();
        window.addEventListener('beforeunload', handleSave);

        const handleFocusLost = () => {
            if (!isPlayingRef.current) return;
            wasPlayingBeforeFocusLossRef.current = true;
            const audio = getAudioEl();
            if (audio && !audio.paused) audio.pause();
            controlYouTube('pause');
            setIsPlaying(false);
        };
        const handleFocusGain = () => {
            if (!wasPlayingBeforeFocusLossRef.current || !currentTrackRef.current) return;
            wasPlayingBeforeFocusLossRef.current = false;
            const track = currentTrackRef.current;
            const audio = getAudioEl();
            if (isTrackYouTube(track)) {
                controlYouTube('play');
                ensureAudioCarrier(true);
                setIsPlaying(true);
            } else if (audio && audio.src) {
                audio.play().then(() => setIsPlaying(true)).catch(() => { });
            }
        };
        const handleNativeMediaAction = (e) => {
            dispatchMediaCommand(e?.detail?.action);
        };

        window.addEventListener('lovelink:audiofocus_lost', handleFocusLost);
        window.addEventListener('lovelink:audiofocus_gain', handleFocusGain);
        window.addEventListener('lovelink:media_action', handleNativeMediaAction);

        return () => {
            window.removeEventListener('beforeunload', handleSave);
            window.removeEventListener('lovelink:audiofocus_lost', handleFocusLost);
            window.removeEventListener('lovelink:audiofocus_gain', handleFocusGain);
            window.removeEventListener('lovelink:media_action', handleNativeMediaAction);
        };
    }, [persistPlaybackState, getAudioEl, controlYouTube, ensureAudioCarrier, dispatchMediaCommand]);

    // System MediaSession API: Lockscreen, Notification controls & OS media status
    useEffect(() => {
        if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

        if (currentTrack) {
            try {
                navigator.mediaSession.metadata = new window.MediaMetadata({
                    title: currentTrack.title || 'LoveLink Lofi Sanctuary',
                    artist: currentTrack.artist || 'LoveLink Radio',
                    album: 'Couple Sanctuary',
                    artwork: [
                        { src: currentTrack.cover || '/logo192.png', sizes: '96x96', type: 'image/png' },
                        { src: currentTrack.cover || '/logo192.png', sizes: '128x128', type: 'image/png' },
                        { src: currentTrack.cover || '/logo192.png', sizes: '192x192', type: 'image/png' },
                        { src: currentTrack.cover || '/logo512.png', sizes: '512x512', type: 'image/png' }
                    ]
                });
                navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

                if ('setPositionState' in navigator.mediaSession) {
                    const dur = Math.max(duration || currentTrack.duration || 1, 1);
                    const pos = Math.min(Math.max(currentTime || 0, 0), dur);
                    navigator.mediaSession.setPositionState({
                        duration: dur,
                        playbackRate: 1.0,
                        position: pos
                    });
                }
            } catch (e) {
                console.warn('MediaSession metadata error:', e);
            }
        } else {
            navigator.mediaSession.playbackState = 'none';
        }
    }, [currentTrack, isPlaying, currentTime, duration]);

    // Keep token & coupleId in sync on navigation / state changes
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const activeToken = window.localStorage.getItem('token');
        const activeCoupleId = window.localStorage.getItem('couple_id');

        if (activeToken !== token) setToken(activeToken);
        if (activeCoupleId !== coupleId) setCoupleId(activeCoupleId);

        if (activeToken && !activeCoupleId) {
            api.get('/auth/me').then(res => {
                if (res.data?.couple_id) {
                    setCoupleId(res.data.couple_id);
                    window.localStorage.setItem('couple_id', res.data.couple_id);
                }
            }).catch(() => { });
        }
    }, [location.pathname, token, coupleId]);

    // 1. Fetch initial channels & couple playlist
    useEffect(() => {
        if (!token) return;

        api.get('/music/channels')
            .then(res => {
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setChannels(res.data);
                    if (res.data[0].tracks?.length > 0 && !currentTrackRef.current) {
                        setCurrentTrack(res.data[0].tracks[0]);
                    }
                } else {
                    throw new Error("No channels returned");
                }
            })
            .catch(err => {
                console.warn("Using curated couple lofi channels:", err);
                setChannels(DEFAULT_FALLBACK_CHANNELS);
                if (!currentTrackRef.current) setCurrentTrack(DEFAULT_FALLBACK_CHANNELS[0].tracks[0]);
            });

        api.get('/music/playlist')
            .then(res => {
                if (Array.isArray(res.data)) setCustomPlaylist(res.data);
            })
            .catch(() => { });
    }, [token]);

    // Live callback refs updated below
    const playNextRef = useRef(() => {});
    const playPrevRef = useRef(() => {});
    const togglePlayRef = useRef(() => {});
    const seekRef = useRef(() => {});
    const handleRemoteEventRef = useRef(() => {});

    // 2. HTML5 <audio> element listeners (using refs to avoid stale closures)
    useEffect(() => {
        const audio = getAudioEl();
        if (!audio) return;

        const updateTime = () => {
            if (audio.src === SILENT_CARRIER_URI) return;
            setCurrentTime(audio.currentTime || 0);
        };
        const updateDuration = () => {
            if (audio.src === SILENT_CARRIER_URI) return;
            if (audio.duration && Number.isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };
        const onEnded = () => {
            if (audio.src === SILENT_CARRIER_URI) return;
            playNextRef.current();
        };
        const onError = () => {
            const activeSrc = audio.getAttribute('src');
            if (!activeSrc || activeSrc === SILENT_CARRIER_URI) return;
            const track = currentTrackRef.current;
            if (track?.fallback_url && fallbackTriedTrackRef.current !== track.id) {
                fallbackTriedTrackRef.current = track.id;
                audio.src = track.fallback_url;
                audio.volume = volumeRef.current;
                audio.play().catch(() => setIsPlaying(false));
                return;
            }
            console.warn('[Music] Audio stream error for:', track?.title, activeSrc);
            setIsPlaying(false);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
        };
    }, [getAudioEl]);

    // 2a. YouTube iframe postMessage listener
    useEffect(() => {
        const handleYtMessage = (event) => {
            if (event.origin && !/youtube(-nocookie)?\.com$/i.test(event.origin)) return;
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (!data) return;

                if (data.event === 'infoDelivery' && data.info) {
                    if (data.info.currentTime !== undefined) {
                        setCurrentTime(data.info.currentTime);
                    }
                    if (data.info.duration !== undefined && data.info.duration > 0) {
                        setDuration(data.info.duration);
                    }
                    if (data.info.playerState !== undefined) {
                        if (data.info.playerState === 0) {
                            playNextRef.current();
                        } else if (data.info.playerState === 1) {
                            setIsPlaying(true);
                        } else if (data.info.playerState === 2) {
                            setIsPlaying(false);
                        }
                    }
                }
            } catch { }
        };

        window.addEventListener('message', handleYtMessage);
        return () => window.removeEventListener('message', handleYtMessage);
    }, []);

    // 2b. YouTube smooth progress ticker (only runs for YouTube-only tracks without direct audio URL)
    useEffect(() => {
        if (!isTrackYouTube(currentTrack) || !isPlaying) return;

        const interval = setInterval(() => {
            setCurrentTime(prev => {
                const dur = duration || currentTrack?.duration || 0;
                if (dur > 0 && prev >= dur) return dur;
                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [currentTrack, isPlaying, duration]);

    // 3. WebSockets for partner synchronization (single-use ticket with token fallback)
    useEffect(() => {
        if (!coupleId || !token) return;

        let isUnmounted = false;
        let reconnectDelay = 2000;

        const connectWs = async () => {
            if (isUnmounted) return;
            const wsBase = getWsBaseUrl();
            let authQuery = `token=${encodeURIComponent(token)}`;
            try {
                const res = await api.post('/auth/ws-ticket');
                if (res.data?.ticket) {
                    authQuery = `ticket=${encodeURIComponent(res.data.ticket)}`;
                }
            } catch { }

            if (isUnmounted) return;
            const wsUrl = `${wsBase}/music/ws/${coupleId}?${authQuery}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (isUnmounted) return;
                setIsSynced(true);
                reconnectDelay = 2000;
                ws.send(JSON.stringify({ type: 'sync_request' }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleRemoteEventRef.current(data);
                } catch (e) {
                    console.error("Music WS parse error:", e);
                }
            };

            ws.onclose = (e) => {
                if (isUnmounted) return;
                setIsSynced(false);
                if (e.code !== 1000) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
                        connectWs();
                    }, reconnectDelay);
                }
            };

            ws.onerror = () => {
                setIsSynced(false);
            };
        };

        connectWs();

        const handleOnlineOrVisible = () => {
            if (!isUnmounted && document.visibilityState !== 'hidden') {
                const state = wsRef.current?.readyState;
                if (state !== WebSocket.OPEN && state !== WebSocket.CONNECTING) {
                    connectWs();
                }
            }
        };
        window.addEventListener('online', handleOnlineOrVisible);
        document.addEventListener('visibilitychange', handleOnlineOrVisible);

        return () => {
            isUnmounted = true;
            window.removeEventListener('online', handleOnlineOrVisible);
            document.removeEventListener('visibilitychange', handleOnlineOrVisible);
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close(1000, "Component unmounted");
            }
        };
    }, [coupleId, token]);

    // Handle messages coming from partner (reads live refs, never stale state)
    const handleRemoteEvent = (data) => {
        const audio = getAudioEl();
        if (!audio) return;
        isLocalAction.current = false;

        if (data.type === 'sync_state' || data.type === 'change_track') {
            if (data.track) {
                fallbackTriedTrackRef.current = null;
                setCurrentTrack(data.track);
                const directAudio = hasDirectAudioStream(data.track);
                const isYt = isTrackYouTube(data.track);
                if (directAudio) {
                    ensureAudioCarrier(false);
                    audio.loop = false;
                    audio.volume = volumeRef.current;
                    audio.src = data.track.url;
                    if (data.position !== undefined) {
                        audio.currentTime = data.position;
                        setCurrentTime(data.position);
                    }
                    setDuration(data.track.duration || 0);
                    if (data.is_playing) {
                        audio.play().catch(() => { });
                        setIsPlaying(true);
                    } else {
                        audio.pause();
                        setIsPlaying(false);
                    }
                } else if (isYt) {
                    audio.pause();
                    audio.removeAttribute('src');
                    setCurrentTime(data.position || 0);
                    setDuration(data.track.duration || 210);
                    setIsPlaying(Boolean(data.is_playing));
                    if (data.is_playing) {
                        ensureAudioCarrier(true);
                        controlYouTube('play');
                        if (data.position) controlYouTube('seek', data.position);
                    } else {
                        controlYouTube('pause');
                        ensureAudioCarrier(false);
                    }
                }
            }
            if (data.dj_name) setDjName(data.dj_name);
        } else if (data.type === 'play') {
            const activeTrack = currentTrackRef.current;
            const isYt = isTrackYouTube(activeTrack);
            if (!isYt && audio.getAttribute('src')) {
                if (data.position !== undefined && Math.abs(audio.currentTime - data.position) > 1.5) {
                    audio.currentTime = data.position;
                    setCurrentTime(data.position);
                }
                audio.play().catch(() => { });
            } else if (isYt) {
                ensureAudioCarrier(true);
                controlYouTube('play');
                if (data.position !== undefined) controlYouTube('seek', data.position);
            }
            if (data.position !== undefined) setCurrentTime(data.position);
            setIsPlaying(true);
            if (data.dj_name) setDjName(data.dj_name);
        } else if (data.type === 'pause') {
            const isYt = isTrackYouTube(currentTrackRef.current);
            if (!isYt) audio.pause();
            else {
                controlYouTube('pause');
                ensureAudioCarrier(false);
            }
            setIsPlaying(false);
            if (data.position !== undefined) {
                if (!isYt && audio.getAttribute('src')) audio.currentTime = data.position;
                setCurrentTime(data.position);
            }
        } else if (data.type === 'seek') {
            const isYt = isTrackYouTube(currentTrackRef.current);
            if (data.position !== undefined) {
                if (!isYt && audio.getAttribute('src')) audio.currentTime = data.position;
                else if (isYt) controlYouTube('seek', data.position);
                setCurrentTime(data.position);
            }
        }

        setTimeout(() => {
            isLocalAction.current = true;
        }, 300);
    };
    handleRemoteEventRef.current = handleRemoteEvent;

    const getCurrentUserName = () => {
        try {
            return JSON.parse(window.localStorage.getItem('user') || '{}')?.name || 'Partner';
        } catch {
            return 'Partner';
        }
    };

    // Broadcast event to partner
    const sendEvent = (type, payload = {}) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const activeTrack = payload.track || currentTrackRef.current;
        const isYt = isTrackYouTube(activeTrack);
        const audio = getAudioEl();
        wsRef.current.send(JSON.stringify({
            type,
            track: activeTrack,
            position: payload.position !== undefined ? payload.position : (isYt ? currentTimeRef.current : (audio?.currentTime || 0)),
            dj_name: getCurrentUserName(),
            ...payload
        }));
    };

    // User Controls
    const playTrack = (track) => {
        const audio = getAudioEl();
        if (!track || !audio) return;
        fallbackTriedTrackRef.current = null;
        wasPlayingBeforeFocusLossRef.current = false;
        setCurrentTrack(track);
        currentTrackRef.current = track;

        const directAudio = hasDirectAudioStream(track);
        const isYt = isTrackYouTube(track);

        if (directAudio) {
            ensureAudioCarrier(false);
            audio.loop = false;
            audio.volume = volumeRef.current;
            audio.src = track.url;
            audio.currentTime = 0;
            setCurrentTime(0);
            setDuration(track.duration || 0);
            audio.play().then(() => {
                setIsPlaying(true);
                sendEvent('change_track', { track, is_playing: true, position: 0 });
            }).catch(err => {
                console.warn("Audio play failed:", err);
                setIsPlaying(false);
            });
        } else if (isYt) {
            audio.pause();
            audio.removeAttribute('src');
            ensureAudioCarrier(true);
            setCurrentTime(0);
            setDuration(track.duration || 210);
            setIsPlaying(true);
            controlYouTube('play');
            sendEvent('change_track', { track, is_playing: true, position: 0 });
        }
    };

    const togglePlay = () => {
        const audio = getAudioEl();
        const track = currentTrackRef.current;
        if (!track) {
            const chans = channelsRef.current;
            if (chans.length > 0 && chans[0].tracks?.length > 0) {
                playTrack(chans[0].tracks[0]);
            }
            return;
        }

        const directAudio = hasDirectAudioStream(track);
        const isYt = isTrackYouTube(track);

        if (isPlayingRef.current) {
            if (!isYt && audio) audio.pause();
            else {
                controlYouTube('pause');
                ensureAudioCarrier(false);
            }
            wasPlayingBeforeFocusLossRef.current = false;
            setIsPlaying(false);
            sendEvent('pause', { position: isYt ? currentTimeRef.current : (audio?.currentTime || 0) });
        } else {
            if (directAudio && audio) {
                ensureAudioCarrier(false);
                audio.loop = false;
                audio.volume = volumeRef.current;
                if (!audio.getAttribute('src') || audio.src === SILENT_CARRIER_URI) {
                    audio.src = track.url;
                    if (savedPositionRef.current > 0) {
                        audio.currentTime = savedPositionRef.current;
                    }
                }
                audio.play().then(() => {
                    setIsPlaying(true);
                    sendEvent('play', { position: audio.currentTime || 0 });
                }).catch(err => {
                    console.warn("Audio resume failed:", err);
                    setIsPlaying(false);
                });
            } else if (isYt) {
                controlYouTube('play');
                ensureAudioCarrier(true);
                setIsPlaying(true);
                sendEvent('play', { position: currentTimeRef.current });
            }
        }
    };
    togglePlayRef.current = togglePlay;

    const seek = (time) => {
        const audio = getAudioEl();
        const track = currentTrackRef.current;
        const isYt = isTrackYouTube(track);
        if (isYt) {
            controlYouTube('seek', time);
        } else if (audio && audio.getAttribute('src')) {
            audio.currentTime = time;
        }
        setCurrentTime(time);
        sendEvent('seek', { position: time });
    };
    seekRef.current = seek;

    const changeVolume = (newVol) => {
        setVolume(newVol);
        const audio = getAudioEl();
        if (audio) audio.volume = newVol;
    };

    const toggleShuffle = () => setIsShuffle(prev => !prev);

    const toggleRepeat = () => {
        setRepeatMode(prev => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
    };

    const toggleLikeTrack = (trackToToggle) => {
        const target = trackToToggle || currentTrackRef.current;
        if (!target) return;
        const targetId = target.id || target.videoId;
        setLikedTracks(prev => {
            const exists = prev.some(t => (t.id || t.videoId) === targetId);
            const updated = exists
                ? prev.filter(t => (t.id || t.videoId) !== targetId)
                : [target, ...prev];
            try {
                localStorage.setItem(SPOTIFY_LIKES_KEY, JSON.stringify(updated));
            } catch { }
            return updated;
        });
    };

    const isLiked = (targetTrack) => {
        const target = targetTrack || currentTrack;
        if (!target) return false;
        const targetId = target.id || target.videoId;
        return likedTracks.some(t => (t.id || t.videoId) === targetId);
    };

    const resolveActivePool = (track) => {
        const custom = customPlaylistRef.current;
        const chans = channelsRef.current;
        if (custom && custom.length > 0 && custom.some(t => t.id === track?.id)) {
            return custom;
        }
        for (const channel of chans) {
            if (channel.tracks?.some(t => t.id === track?.id || (t.videoId && !t.url && t.videoId === track?.videoId))) {
                return channel.tracks;
            }
        }
        if (chans.length > 0 && chans[0].tracks?.length > 0) {
            return chans[0].tracks;
        }
        return custom || [];
    };

    const playNext = () => {
        const track = currentTrackRef.current;
        if (!track) return;

        if (repeatModeRef.current === 'one') {
            seekRef.current(0);
            if (isTrackYouTube(track)) {
                controlYouTube('play');
            } else {
                getAudioEl()?.play().catch(() => { });
            }
            setIsPlaying(true);
            return;
        }

        const pool = resolveActivePool(track);
        if (pool.length === 0) return;

        if (isShuffleRef.current && pool.length > 1) {
            const idx = pool.findIndex(t => t.id === track.id);
            let randomIdx = Math.floor(Math.random() * pool.length);
            if (randomIdx === idx) randomIdx = (randomIdx + 1) % pool.length;
            playTrack(pool[randomIdx]);
            return;
        }

        const idx = pool.findIndex(t => t.id === track.id || (t.videoId && !t.url && t.videoId === track.videoId));
        if (idx !== -1) {
            const nextTrack = pool[(idx + 1) % pool.length];
            playTrack(nextTrack);
        } else {
            playTrack(pool[0]);
        }
    };
    playNextRef.current = playNext;

    const playPrev = () => {
        const track = currentTrackRef.current;
        if (!track) return;
        const pool = resolveActivePool(track);
        if (pool.length === 0) return;

        const idx = pool.findIndex(t => t.id === track.id || (t.videoId && !t.url && t.videoId === track.videoId));
        if (idx !== -1) {
            const prevTrack = pool[(idx - 1 + pool.length) % pool.length];
            playTrack(prevTrack);
        } else {
            playTrack(pool[0]);
        }
    };
    playPrevRef.current = playPrev;

    // Register MediaSession lockscreen / notification action handlers ONCE cleanly via refs
    useEffect(() => {
        if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

        const actionHandlers = [
            ['play', () => dispatchMediaCommand('play')],
            ['pause', () => dispatchMediaCommand('pause')],
            ['previoustrack', () => dispatchMediaCommand('prev')],
            ['nexttrack', () => dispatchMediaCommand('next')],
            ['seekto', (details) => {
                if (details.seekTime !== undefined && details.seekTime !== null) {
                    seekRef.current(details.seekTime);
                }
            }],
        ];

        for (const [action, handler] of actionHandlers) {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (e) {
                console.warn(`MediaSession action ${action} not supported:`, e);
            }
        }

        return () => {
            for (const [action] of actionHandlers) {
                try {
                    navigator.mediaSession.setActionHandler(action, null);
                } catch { }
            }
        };
    }, [dispatchMediaCommand]);

    const addCustomTrack = async (trackData) => {
        try {
            const res = await api.post('/music/playlist', trackData);
            setCustomPlaylist(prev => [res.data.track, ...prev]);
            return res.data.track;
        } catch (e) {
            console.error("Failed to add track:", e);
            throw e;
        }
    };

    const showYouTubeCarrier = isTrackYouTube(currentTrack);

    return (
        <MusicContext.Provider value={{
            channels,
            customPlaylist,
            currentTrack,
            isPlaying,
            currentTime,
            duration,
            volume,
            isPlayerOpen,
            setIsPlayerOpen,
            djName,
            isSynced,
            isShuffle,
            toggleShuffle,
            repeatMode,
            toggleRepeat,
            likedTracks,
            toggleLikeTrack,
            isLiked,
            playTrack,
            togglePlay,
            seek,
            changeVolume,
            playNext,
            playPrev,
            addCustomTrack,
        }}>
            {children}
            {/* Live DOM <audio> element keeps background WebMediaPlayer & MediaSession active across Android WebView */}
            <audio
                ref={audioRef}
                playsInline
                preload="auto"
                style={{ display: 'none' }}
            />
            {/* YouTube Audio Carrier (only mounted for YouTube-only tracks that lack direct audio streams) */}
            {showYouTubeCarrier && currentTrack?.videoId && (
                <div
                    className="fixed bottom-0 right-0 w-[2px] h-[2px] opacity-[0.01] pointer-events-none z-[1] overflow-hidden"
                    style={{ position: 'fixed', bottom: '0px', right: '0px', width: '2px', height: '2px', opacity: 0.01, pointerEvents: 'none', zIndex: 1 }}
                >
                    <iframe
                        id="yt-music-iframe"
                        title="YouTube Music Player"
                        width="2"
                        height="2"
                        src={`https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=1&enablejsapi=1&controls=0&playsinline=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                        allow="autoplay; encrypted-media"
                        onLoad={() => {
                            const iframe = document.getElementById('yt-music-iframe');
                            if (iframe?.contentWindow) {
                                iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'yt-music-iframe' }), '*');
                                const resumePos = savedPositionRef.current || 0;
                                if (resumePos > 0) {
                                    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [resumePos, true] }), '*');
                                }
                                if (isPlayingRef.current) {
                                    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
                                }
                            }
                        }}
                    />
                </div>
            )}
        </MusicContext.Provider>
    );
};
