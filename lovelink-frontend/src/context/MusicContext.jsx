import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api';

const MusicContext = createContext();

export const useMusic = () => useContext(MusicContext);

export const MusicProvider = ({ children }) => {
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

    const audioRef = useRef(new Audio());
    const wsRef = useRef(null);
    const isLocalAction = useRef(true);

    const user = JSON.parse(window.localStorage.getItem('user') || '{}');
    const token = window.localStorage.getItem('token');
    const coupleId = user?.couple_id;

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
    }, [token]);

    // 2. Audio element listeners
    useEffect(() => {
        const audio = audioRef.current;
        audio.volume = volume;

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
    }, [currentTrack]);

    // 3. WebSockets for partner synchronization
    useEffect(() => {
        if (!coupleId || !token) return;

        const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
        const wsUrl = `${WS_BASE}/music/ws/${coupleId}?token=${token}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsSynced(true);
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

        ws.onclose = () => setIsSynced(false);

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
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

    // Broadcast event to partner
    const sendEvent = (type, payload = {}) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({
            type,
            track: currentTrack,
            position: audioRef.current.currentTime,
            dj_name: user?.name || 'Partner',
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
