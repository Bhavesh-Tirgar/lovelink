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
            }).catch(() => {});
        }
    }, [location.pathname, token, coupleId]);

    // 1. Fetch initial channels & couple playlist
    useEffect(() => {
        if (!token) return;

        api.get('/music/channels')
            .then(res => {
                setChannels(res.data);
                if (res.data.length > 0 && res.data[0].tracks.length > 0 && !currentTrack) {
                    setCurrentTrack(res.data[0].tracks[0]);
                }
            })
            .catch(err => console.warn("Failed to load music channels:", err));

        api.get('/music/playlist')
            .then(res => setCustomPlaylist(res.data))
            .catch(() => {});
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
                        audio.play().catch(() => {});
                        setIsPlaying(true);
                    } else {
                        audio.pause();
                        setIsPlaying(false);
                    }
                } else {
                    audio.pause();
                    audio.src = '';
                    setIsPlaying(Boolean(data.is_playing));
                }
            }
            if (data.dj_name) setDjName(data.dj_name);
        } else if (data.type === 'play') {
            const isYt = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);
            if (!isYt && audio.src) {
                if (data.position && Math.abs(audio.currentTime - data.position) > 1.5) {
                    audio.currentTime = data.position;
                }
                audio.play().catch(() => {});
            }
            setIsPlaying(true);
            if (data.dj_name) setDjName(data.dj_name);
        } else if (data.type === 'pause') {
            const isYt = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);
            if (!isYt) audio.pause();
            setIsPlaying(false);
            if (data.position) {
                audio.currentTime = data.position;
                setCurrentTime(data.position);
            }
        } else if (data.type === 'seek') {
            if (data.position !== undefined) {
                audio.currentTime = data.position;
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
        wsRef.current.send(JSON.stringify({
            type,
            track: currentTrack,
            position: audioRef.current.currentTime,
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
            setIsPlaying(true);
            sendEvent('change_track', { track, is_playing: true, position: 0 });
        } else if (track.url) {
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
            setIsPlaying(false);
            sendEvent('pause', { position: audio.currentTime });
        } else {
            if (!isYt && audio.src) {
                audio.play().catch(console.warn);
            }
            setIsPlaying(true);
            sendEvent('play', { position: audio.currentTime });
        }
    };

    const seek = (time) => {
        const audio = audioRef.current;
        audio.currentTime = time;
        setCurrentTime(time);
        sendEvent('seek', { position: time });
    };

    const changeVolume = (newVol) => {
        setVolume(newVol);
        audioRef.current.volume = newVol;
    };

    const playNext = () => {
        if (!currentTrack || channels.length === 0) return;
        for (const channel of channels) {
            const idx = channel.tracks.findIndex(t => t.id === currentTrack.id);
            if (idx !== -1) {
                const nextTrack = channel.tracks[(idx + 1) % channel.tracks.length];
                playTrack(nextTrack);
                return;
            }
        }
    };

    const playPrev = () => {
        if (!currentTrack || channels.length === 0) return;
        for (const channel of channels) {
            const idx = channel.tracks.findIndex(t => t.id === currentTrack.id);
            if (idx !== -1) {
                const prevTrack = channel.tracks[(idx - 1 + channel.tracks.length) % channel.tracks.length];
                playTrack(prevTrack);
                return;
            }
        }
    };

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
