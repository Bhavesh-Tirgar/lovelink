import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import { getWsBaseUrl } from '../utils/wsUrl';

const MusicContext = createContext();

export const useMusic = () => useContext(MusicContext);

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

    const [token, setToken] = useState(() => (typeof window !== 'undefined' ? window.localStorage.getItem('token') : null));
    const [coupleId, setCoupleId] = useState(() => (typeof window !== 'undefined' ? window.localStorage.getItem('couple_id') : null));

    const audioRef = useRef(new Audio());
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isLocalAction = useRef(true);

    const SILENT_CARRIER_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

    // Cross-frame YouTube Player control bridge
    const controlYouTube = (action, param = null) => {
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
    };

    // YouTube iframe postMessage listener for real continuous playback & accurate duration
    useEffect(() => {
        const handleYtMessage = (event) => {
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
                            // Video finished naturally -> play next track!
                            playNext();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrack]);

    // Background Audio Carrier to ensure mobile OS & Android WebView keep audio process alive in background
    const ensureAudioCarrier = (active) => {
        const audio = audioRef.current;
        if (!audio) return;
        if (active) {
            try {
                if (audio.src !== SILENT_CARRIER_URI) {
                    audio.src = SILENT_CARRIER_URI;
                    audio.loop = true;
                    audio.volume = 0.05;
                }
                audio.play().catch(() => {});
            } catch {}
        } else {
            try {
                if (audio.src === SILENT_CARRIER_URI) {
                    audio.pause();
                }
            } catch {}
        }
    };

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
            } catch (e) {
                console.warn('MediaSession metadata error:', e);
            }
        } else {
            navigator.mediaSession.playbackState = 'none';
        }
    }, [currentTrack, isPlaying]);

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
                    if (res.data[0].tracks?.length > 0 && !currentTrack) {
                        setCurrentTrack(res.data[0].tracks[0]);
                    }
                } else {
                    throw new Error("No channels returned");
                }
            })
            .catch(err => {
                console.warn("Using curated couple lofi channels:", err);
                const defaultChannels = [
                    {
                        id: 'midnight_lofi',
                        title: 'Midnight Lofi',
                        icon: '🌙',
                        tracks: [
                            { id: 'track_1', title: 'Coffee Under The Stars', artist: 'LoveLink Lofi', videoId: 'jfKfPfyJRdk', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80', duration: 240, type: 'youtube' },
                            { id: 'track_2', title: 'Sunset Boulevard & You', artist: 'Acoustic Dreams', videoId: '5qap5aO4i9A', cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80', duration: 210, type: 'youtube' }
                        ]
                    }
                ];
                setChannels(defaultChannels);
                if (!currentTrack) setCurrentTrack(defaultChannels[0].tracks[0]);
            });

        api.get('/music/playlist')
            .then(res => setCustomPlaylist(res.data))
            .catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // 2. Audio element listeners
    useEffect(() => {
        const audio = audioRef.current;
        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration || 0);
        const onEnded = () => playNext();

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', onEnded);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrack]);

    // 2b. YouTube smooth progress ticker (never cuts off song prematurely - YouTube playerState ended event controls track completion)
    useEffect(() => {
        const isYt = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);
        if (!isYt || !isPlaying) return;

        const interval = setInterval(() => {
            setCurrentTime(prev => {
                const dur = duration || currentTrack?.duration || 0;
                if (dur > 0 && prev >= dur) {
                    return dur;
                }
                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [currentTrack, isPlaying, duration]);

    // 3. WebSockets for partner synchronization
    useEffect(() => {
        if (!coupleId || !token) return;

        let isUnmounted = false;
        let reconnectDelay = 2000;

        const connectWs = () => {
            if (isUnmounted) return;
            const wsBase = getWsBaseUrl();
            const wsUrl = `${wsBase}/music/ws/${coupleId}?token=${token}`;

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
                    handleRemoteEvent(data);
                } catch (e) {
                    console.error("Music WS parse error:", e);
                }
            };

            ws.onclose = (e) => {
                if (isUnmounted) return;
                setIsSynced(false);
                // Reconnect if not intentional close
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

        return () => {
            isUnmounted = true;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close(1000, "Component unmounted");
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coupleId, token]);

    // Handle messages coming from partner
    const handleRemoteEvent = (data) => {
        const audio = audioRef.current;
        isLocalAction.current = false;

        if (data.type === 'sync_state' || data.type === 'change_track') {
            if (data.track) {
                setCurrentTrack(data.track);
                const isYt = data.track.type === 'youtube' || Boolean(data.track.videoId);
                if (!isYt && data.track.url) {
                    audio.src = data.track.url;
                    if (data.position) {
                        audio.currentTime = data.position;
                        setCurrentTime(data.position);
                    }
                    if (data.is_playing) {
                        audio.play().catch(() => { });
                        setIsPlaying(true);
                    } else {
                        audio.pause();
                        setIsPlaying(false);
                    }
                } else {
                    audio.pause();
                    audio.src = '';
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
            const isYt = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);
            if (!isYt && audio.src) {
                if (data.position && Math.abs(audio.currentTime - data.position) > 1.5) {
                    audio.currentTime = data.position;
                }
                audio.play().catch(() => { });
            } else if (isYt) {
                ensureAudioCarrier(true);
                controlYouTube('play');
                if (data.position) controlYouTube('seek', data.position);
            }
            if (data.position !== undefined) setCurrentTime(data.position);
            setIsPlaying(true);
            if (data.dj_name) setDjName(data.dj_name);
        } else if (data.type === 'pause') {
            const isYt = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);
            if (!isYt) audio.pause();
            else {
                controlYouTube('pause');
                ensureAudioCarrier(false);
            }
            setIsPlaying(false);
            if (data.position) {
                if (!isYt) audio.currentTime = data.position;
                setCurrentTime(data.position);
            }
        } else if (data.type === 'seek') {
            const isYt = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);
            if (data.position !== undefined) {
                if (!isYt) audio.currentTime = data.position;
                else controlYouTube('seek', data.position);
                setCurrentTime(data.position);
            }
        }

        setTimeout(() => {
            isLocalAction.current = true;
        }, 300);
    };

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
        const isYt = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);
        wsRef.current.send(JSON.stringify({
            type,
            track: currentTrack,
            position: isYt ? currentTime : audioRef.current.currentTime,
            dj_name: getCurrentUserName(),
            ...payload
        }));
    };

    // User Controls
    const playTrack = (track) => {
        const audio = audioRef.current;
        setCurrentTrack(track);
        const isYt = track.type === 'youtube' || Boolean(track.videoId);

        if (isYt) {
            audio.pause();
            audio.src = '';
            ensureAudioCarrier(true);
            setCurrentTime(0);
            setDuration(track.duration || 210);
            setIsPlaying(true);
            controlYouTube('play');
            sendEvent('change_track', { track, is_playing: true, position: 0 });
        } else if (track.url) {
            ensureAudioCarrier(false);
            audio.loop = false;
            audio.volume = volume;
            audio.src = track.url;
            audio.play().then(() => {
                setIsPlaying(true);
                sendEvent('change_track', { track, is_playing: true, position: 0 });
            }).catch(err => console.warn("Autoplay blocked:", err));
        }
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!currentTrack) {
            if (channels.length > 0 && channels[0].tracks.length > 0) {
                playTrack(channels[0].tracks[0]);
            }
            return;
        }

        const isYt = currentTrack.type === 'youtube' || Boolean(currentTrack.videoId);

        if (isPlaying) {
            if (!isYt) audio.pause();
            else {
                controlYouTube('pause');
                ensureAudioCarrier(false);
            }
            setIsPlaying(false);
            sendEvent('pause', { position: isYt ? currentTime : audio.currentTime });
        } else {
            if (!isYt && audio.src) {
                audio.loop = false;
                audio.volume = volume;
                audio.play().catch(console.warn);
            } else if (isYt) {
                controlYouTube('play');
                ensureAudioCarrier(true);
            }
            setIsPlaying(true);
            sendEvent('play', { position: isYt ? currentTime : audio.currentTime });
        }
    };

    const seek = (time) => {
        const isYt = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);
        if (isYt) {
            controlYouTube('seek', time);
        } else {
            audioRef.current.currentTime = time;
        }
        setCurrentTime(time);
        sendEvent('seek', { position: time });
    };

    const changeVolume = (newVol) => {
        setVolume(newVol);
        audioRef.current.volume = newVol;
    };

    const playNext = () => {
        if (!currentTrack) return;
        if (customPlaylist && customPlaylist.length > 0) {
            const idx = customPlaylist.findIndex(t => t.id === currentTrack.id || (t.videoId && t.videoId === currentTrack.videoId));
            if (idx !== -1) {
                const nextTrack = customPlaylist[(idx + 1) % customPlaylist.length];
                playTrack(nextTrack);
                return;
            }
        }
        for (const channel of channels) {
            const idx = channel.tracks.findIndex(t => t.id === currentTrack.id);
            if (idx !== -1) {
                const nextTrack = channel.tracks[(idx + 1) % channel.tracks.length];
                playTrack(nextTrack);
                return;
            }
        }
        if (channels.length > 0 && channels[0].tracks.length > 0) {
            playTrack(channels[0].tracks[0]);
        }
    };

    const playPrev = () => {
        if (!currentTrack) return;
        if (customPlaylist && customPlaylist.length > 0) {
            const idx = customPlaylist.findIndex(t => t.id === currentTrack.id || (t.videoId && t.videoId === currentTrack.videoId));
            if (idx !== -1) {
                const prevTrack = customPlaylist[(idx - 1 + customPlaylist.length) % customPlaylist.length];
                playTrack(prevTrack);
                return;
            }
        }
        for (const channel of channels) {
            const idx = channel.tracks.findIndex(t => t.id === currentTrack.id);
            if (idx !== -1) {
                const prevTrack = channel.tracks[(idx - 1 + channel.tracks.length) % channel.tracks.length];
                playTrack(prevTrack);
                return;
            }
        }
    };

    // Register MediaSession lockscreen / notification action handlers
    useEffect(() => {
        if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

        const actionHandlers = [
            ['play', () => togglePlay()],
            ['pause', () => togglePlay()],
            ['previoustrack', () => playPrev()],
            ['nexttrack', () => playNext()],
            ['seekto', (details) => {
                if (details.seekTime !== undefined && details.seekTime !== null) {
                    seek(details.seekTime);
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
    });

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
            playTrack,
            togglePlay,
            seek,
            changeVolume,
            playNext,
            playPrev,
            addCustomTrack,
        }}>
            {children}
        </MusicContext.Provider>
    );
};
