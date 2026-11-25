import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Video, Paperclip, Mic, Send, ArrowLeft, Flame, WifiOff, Clock, Lock, ShieldCheck, Search, Smile, X } from 'lucide-react';
import SafetyCodeModal from '../components/SafetyCodeModal';
import { encryptText, decryptText, isE2EEMessage, initDeviceE2EEKey } from '../utils/crypto';
import {
    getCachedMessages,
    saveMessagesToCache,
    saveSingleMessageToCache,
    replaceTempMessageInCache,
    markMessageBurnedInCache
} from '../utils/chatCache';
import api from '../api';
import useWebSocket from '../hooks/useWebSocket';
import { getWsBaseUrl } from '../utils/wsUrl';

function Chat() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isEphemeralMode, setIsEphemeralMode] = useState(false);
    const [coupleId, setCoupleId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('couple_id') : null));
    const [myUserId, setMyUserId] = useState(() => { try { return JSON.parse(localStorage.getItem('user') || '{}')?.id || null; } catch { return null; } });
    const [partner, setPartner] = useState(() => {
        try { return JSON.parse(localStorage.getItem('partner_user') || 'null'); } catch { return null; }
    });
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
    const [typingPartner, setTypingPartner] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [calling, setCalling] = useState(false);
    const [showSafetyCode, setShowSafetyCode] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
    const [reactions, setReactions] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('lovelink_reactions') || '{}');
        } catch {
            return {};
        }
    });

    const sendMessageRef = useRef(null);

    const handleAddReaction = (msgId, emoji) => {
        setReactions(prev => {
            const next = { ...prev, [msgId]: emoji };
            try { localStorage.setItem('lovelink_reactions', JSON.stringify(next)); } catch { }
            return next;
        });
        setActiveReactionMsgId(null);
        sendMessageRef.current?.({
            type: "message_reaction",
            message_id: msgId,
            emoji
        });
    };

    const messagesEndRef = useRef(null);
    const listRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const typingTimeoutRef = useRef(null);
    const lastTypingSentRef = useRef(0);

    const WS_URL = getWsBaseUrl();

    // Reset calling state on mount
    useEffect(() => {
        setCalling(false);
        initDeviceE2EEKey().catch(console.error);
    }, []);

    // Instant offline cache load (0ms WhatsApp speed)
    useEffect(() => {
        if (coupleId) {
            getCachedMessages(coupleId).then((cached) => {
                if (cached && cached.length > 0) {
                    setMessages(cached);
                    setLoading(false);
                    setTimeout(scrollToBottom, 50);
                }
            });
        }
    }, [coupleId]);

    // Network connectivity listener
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Handle incoming websocket messages
    const onWSMessage = useCallback((data) => {
        if (data.type === 'message' || data.type === 'new_message') {
            const incoming = data.message || data.data;
            if (!incoming) return;

            // Client-side E2EE decryption
            if (incoming.text && isE2EEMessage(incoming.text)) {
                decryptText(incoming.text, coupleId).then(decrypted => {
                    setMessages(prev => prev.map(m => m.id === incoming.id ? { ...m, text: decrypted, _isE2EE: true } : m));
                });
            }

            setMessages(prev => {
                // If we sent this message ourselves, replace the optimistic temp entry without flashing ciphertext
                const tempIdx = prev.findIndex(
                    m => m._tempId && m.sender_id === incoming.sender_id
                );
                if (tempIdx !== -1) {
                    const tempMsg = prev[tempIdx];
                    const preserved = isE2EEMessage(incoming.text)
                        ? { ...incoming, text: tempMsg.text, _isE2EE: true }
                        : incoming;
                    replaceTempMessageInCache(coupleId, tempMsg.id, preserved);
                    const next = [...prev];
                    next[tempIdx] = preserved; // swap temp with real DB message preserving readable text
                    return next;
                }

                // If this EXACT message ID already exists (e.g. from an HTTP upload response), ignore the WS broadcast
                if (prev.some(m => m.id === incoming.id)) {
                    return prev;
                }

                // Otherwise it's from the partner (or a new message we didn't optimistically render)
                saveSingleMessageToCache(coupleId, incoming);
                return [...prev, incoming];
            });

            // Mark read implicitly if we get a message when open
            Promise.resolve(api.put('/chat/messages/mark-read')).catch(console.error);

            // Auto-burn ephemeral message when received and viewed
            if (incoming.is_ephemeral && !incoming.is_burned && incoming.sender_id !== myUserId) {
                setTimeout(() => {
                    api.post(`/chat/messages/${incoming.id}/burn`).catch(() => { });
                }, (incoming.burn_after_seconds || 10) * 1000);
            }

            // Auto-scroll to bottom for new messages
            setTimeout(scrollToBottom, 100);

            // Clear typing indicator
            setTypingPartner(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        } else if (data.type === 'typing') {
            setTypingPartner(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                setTypingPartner(false);
            }, 2000);

        } else if (data.type === 'message_burned') {
            markMessageBurnedInCache(coupleId, data.message_id);
            setMessages(prev => prev.map(msg =>
                msg.id === data.message_id
                    ? { ...msg, is_burned: true, text: '🔥 [Self-destructed message]', file_url: null }
                    : msg
            ));
        } else if (data.type === 'read_receipt') {
            setMessages(prev => prev.map(msg =>
                (msg.sender_id !== data.reader_id && !msg.read_at)
                    ? { ...msg, read_at: new Date().toISOString() }
                    : msg
            ));
        } else if (data.type === 'message_reaction') {
            if (data.message_id && data.emoji) {
                setReactions(prev => {
                    const next = { ...prev, [data.message_id]: data.emoji };
                    try { localStorage.setItem('lovelink_reactions', JSON.stringify(next)); } catch { }
                    return next;
                });
            }
        } else if (data.type === 'nudge') {
            // Heart-shaped confetti!
            import('canvas-confetti').then((confettiLib) => {
                const confetti = confettiLib.default;
                const defaults = { spread: 360, ticks: 100, gravity: 0, decay: 0.94, startVelocity: 30, colors: ['#ffc0cb', '#ff69b4', '#ff1493', '#c71585'] };

                function shoot() {
                    confetti({
                        ...defaults,
                        particleCount: 80,
                        scalar: 2,
                        shapes: ['heart']
                    });
                }

                setTimeout(shoot, 0);
                setTimeout(shoot, 200);
                setTimeout(shoot, 400);
            }).catch(() => { });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coupleId, myUserId]);

    const { sendMessage, isConnected } = useWebSocket(
        coupleId ? `${WS_URL}/ws/chat/${coupleId}` : null,
        onWSMessage
    );
    sendMessageRef.current = sendMessage;

    // Initial load
    useEffect(() => {
        const initChat = async () => {
            try {
                const dashRes = await api.get('/dashboard');
                setMyUserId(dashRes.data.my_user.id);

                if (!dashRes.data.linked || !dashRes.data.couple_id) {
                    navigate('/dashboard');
                    return;
                }

                setPartner(dashRes.data.partner_user);
                setCoupleId(dashRes.data.couple_id);
                try {
                    localStorage.setItem('partner_user', JSON.stringify(dashRes.data.partner_user));
                    localStorage.setItem('couple_id', dashRes.data.couple_id);
                } catch { }

                const msgRes = await api.get('/chat/messages');
                const decryptedList = await Promise.all(msgRes.data.map(async m => {
                    if (m.text && isE2EEMessage(m.text)) {
                        return { ...m, text: await decryptText(m.text, dashRes.data.couple_id), _isE2EE: true };
                    }
                    return m;
                }));
                setMessages(prev => {
                    const map = new Map();
                    // Seed with cached / previous messages
                    prev.forEach(m => { if (m.id) map.set(m.id, m); });
                    // Merge latest decrypted messages from backend
                    decryptedList.forEach(m => { if (m.id) map.set(m.id, m); });
                    const merged = Array.from(map.values()).sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
                    saveMessagesToCache(dashRes.data.couple_id, merged);
                    return merged;
                });
                setHasMore(msgRes.data.length === 50);

                setTimeout(scrollToBottom, 200);
            } catch (err) {
                console.error("Failed to load chat", err);
                if (err.response?.status === 401) navigate('/login');
            } finally {
                setLoading(false);
            }
        };
        initChat();
        return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
    }, [navigate]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || messages.length === 0) return;

        setLoadingMore(true);
        const oldestMsgId = messages[0].id; // First element is oldest in current view

        // Store current scroll height
        const prevScrollHeight = listRef.current.scrollHeight;

        try {
            const res = await api.get(`/chat/messages?before_id=${oldestMsgId}`);
            if (res.data.length > 0) {
                const decryptedPage = await Promise.all(
                    res.data.map(async (m) => {
                        if (m.text && isE2EEMessage(m.text)) {
                            const decrypted = await decryptText(m.text, coupleId);
                            return { ...m, text: decrypted, _isE2EE: true };
                        }
                        return m;
                    })
                );
                setMessages(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const fresh = decryptedPage.filter(m => !existingIds.has(m.id));
                    return [...fresh, ...prev];
                });
                setHasMore(res.data.length === 50);

                // Restore scroll position so it doesn't jump
                setTimeout(() => {
                    if (listRef.current) {
                        const newScrollHeight = listRef.current.scrollHeight;
                        listRef.current.scrollTop = newScrollHeight - prevScrollHeight;
                    }
                }, 10);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error("Failed to load older messages", err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleScroll = (e) => {
        if (e.target.scrollTop === 0) {
            loadMoreMessages();
        }
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);

        // Throttle typing events to 1s
        const now = Date.now();
        if (now - lastTypingSentRef.current > 1000) {
            sendMessage({ type: "typing" });
            lastTypingSentRef.current = now;
        }
    };

    const sendTextMessage = async (e) => {
        e?.preventDefault();
        if (!inputValue.trim() || !myUserId) return;

        const text = inputValue.trim();
        setInputValue('');

        // Optimistic update — show message immediately on sender's screen
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: tempId,
            _tempId: tempId,
            sender_id: myUserId,
            couple_id: coupleId,
            text,
            message_type: 'text',
            file_url: null,
            is_ephemeral: isEphemeralMode,
            burn_after_seconds: isEphemeralMode ? 10 : null,
            is_burned: false,
            read_at: null,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);
        saveSingleMessageToCache(coupleId, optimisticMsg);
        setTimeout(scrollToBottom, 50);

        // E2EE encrypt text before broadcasting over WebSocket
        const cipherText = await encryptText(text, coupleId);

        sendMessage({
            type: 'message',
            content: cipherText,
            message_type: 'text',
            is_ephemeral: isEphemeralMode,
            burn_after_seconds: isEphemeralMode ? 10 : null,
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Do NOT set Content-Type manually — axios sets it with the correct
            // multipart boundary automatically when FormData is passed.
            const res = await api.post('/chat/upload', formData);
            // Append returned message so image bubble appears immediately
            setMessages(prev => [...prev, res.data]);
            saveSingleMessageToCache(coupleId, res.data);
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            console.error('Upload failed', err);
            setUploadError('Failed to upload file. Please try again.');
            setTimeout(() => setUploadError(''), 4000);
        }

        // Reset file input
        e.target.value = null;
    };

    const isPressHeldRef = useRef(false);

    const startRecording = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (isPressHeldRef.current || isRecording) return;
        isPressHeldRef.current = true;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isPressHeldRef.current) {
                // User already released button before getUserMedia resolved
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            // Cross-platform audio format negotiation (iOS Safari vs Chromium)
            let mimeType = '';
            let fileExt = 'webm';
            if (typeof MediaRecorder !== 'undefined') {
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mimeType = 'audio/webm;codecs=opus';
                    fileExt = 'webm';
                } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    mimeType = 'audio/webm';
                    fileExt = 'webm';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                    fileExt = 'mp4';
                }
            }

            const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const finalType = mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
                const file = new File([audioBlob], `voice_message.${fileExt}`, { type: finalType });

                const formData = new FormData();
                formData.append('file', file);

                try {
                    // No manual Content-Type — let axios set the boundary
                    const res = await api.post('/chat/upload', formData);
                    setMessages(prev => [...prev, res.data]);
                    saveSingleMessageToCache(coupleId, res.data);
                    setTimeout(scrollToBottom, 50);
                } catch (err) {
                    console.error('Voice upload failed', err);
                    setUploadError('Failed to upload voice message.');
                    setTimeout(() => setUploadError(''), 4000);
                }

                // Cleanup stream
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            isPressHeldRef.current = false;
            console.error("Microphone access denied or error", err);
            setUploadError('Microphone permission required to record voice messages.');
            setTimeout(() => setUploadError(''), 4000);
        }
    };

    const stopRecording = () => {
        isPressHeldRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
    };

    const startCall = async (callType = 'video') => {
        if (calling) return;
        setCalling(true);
        try {
            const res = await api.post('/calls/initiate', { call_type: callType });
            navigate(`/call/${res.data.call_id}`, {
                state: {
                    token: res.data.token,
                    room_id: res.data.room_id,
                    zego_app_id: res.data.zego_app_id,
                    user_id: res.data.user_id,
                    user_name: res.data.user_name,
                    partner_id: res.data.partner_id,
                    partner_name: res.data.partner_name,
                    partner_photo: res.data.partner_photo,
                    call_type: callType,
                    status: 'initiated'
                }
            });
        } catch (err) {
            console.error("Failed to initiate call:", err);
            setUploadError(err.response?.data?.detail || 'Could not start call. Check partner connection.');
            setTimeout(() => setUploadError(''), 4000);
        } finally {
            setCalling(false);
        }
    };

    // Filter messages if search is active
    const displayedMessages = isSearching && searchQuery.trim()
        ? messages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    // Group messages logic (if < 2 min diff, group them)
    const groupedMessages = displayedMessages.reduce((acc, msg) => {
        if (acc.length === 0) return [[msg]];
        const lastGroup = acc[acc.length - 1];
        const lastMsg = lastGroup[lastGroup.length - 1];

        const timeDiff = new Date(msg.created_at) - new Date(lastMsg.created_at);
        if (msg.sender_id === lastMsg.sender_id && timeDiff < 120000) {
            lastGroup.push(msg);
        } else {
            acc.push([msg]);
        }
        return acc;
    }, []);

    const formatTime = (isoString) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <div className="h-screen bg-[#07080c] flex items-center justify-center text-gray-400">Loading chat...</div>;
    }

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-[#07080c] text-gray-100 overflow-hidden animate-in fade-in duration-700">
            {/* Top Bar */}
            <header className="flex-none flex items-center justify-between px-2.5 sm:px-6 py-2.5 sm:py-3.5 bg-[#07080c]/90 backdrop-blur-md border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.4)] z-20">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <button onClick={() => navigate('/dashboard')} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-300 hover:text-white flex-shrink-0">
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="relative group cursor-pointer flex-shrink-0">
                            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm sm:text-base font-bold shadow-inner group-hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-shadow">
                                {partner?.name?.[0] || '?'}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-brand-darker transition-colors duration-500 ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'}`} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white truncate max-w-[100px] sm:max-w-[180px]">{partner?.name || 'Partner'}</h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-pink-300/80">
                                    {typingPartner ? 'typing...' : (isConnected ? 'Online' : 'Offline')}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowSafetyCode(true)}
                                    className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/25 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono transition cursor-pointer"
                                    title="View E2EE Safety Code & Verify Keys"
                                >
                                    <ShieldCheck size={10} />
                                    <span className="hidden sm:inline">E2EE Verified</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {partner && (
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <button
                            onClick={() => { setIsSearching(!isSearching); if (isSearching) setSearchQuery(''); }}
                            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border transition-all flex-shrink-0 ${isSearching ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/15'}`}
                            title="Search Messages"
                        >
                            <Search size={16} />
                        </button>
                        <button
                            onClick={() => startCall('voice')}
                            disabled={calling}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/35 transition-all disabled:opacity-50 flex-shrink-0 shadow-sm"
                            title="Start Voice Call"
                        >
                            <Phone size={16} />
                        </button>
                        <button
                            onClick={() => startCall('video')}
                            disabled={calling}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-600 text-white shadow-md shadow-rose-500/30 border border-rose-400/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
                            title="Start Video Call"
                        >
                            <Video size={16} />
                        </button>
                    </div>
                )}
            </header>

            {/* In-Chat Search Bar */}
            {isSearching && (
                <div className="flex-none px-4 py-2 bg-black/70 border-b border-white/10 flex items-center gap-2 animate-in slide-in-from-top-2 z-10">
                    <Search size={15} className="text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search romantic messages..."
                        className="flex-1 bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none"
                        autoFocus
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white">
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Offline Connectivity Banner */}
            {!isOnline && (
                <div className="flex-none bg-amber-500/20 text-amber-200 text-xs px-3 py-1.5 text-center border-b border-amber-500/30 flex items-center justify-center gap-2 backdrop-blur-md z-10 animate-in fade-in">
                    <WifiOff size={13} className="text-amber-400" />
                    <span className="font-medium">You are offline • Showing cached messages</span>
                </div>
            )}

            {/* Messages List */}
            <div
                ref={listRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 scroll-smooth"
            >
                {loadingMore && (
                    <div className="text-center py-2 text-xs text-gray-500">Loading older messages...</div>
                )}

                {groupedMessages.map((group, gIdx) => {
                    const isMine = group[0].sender_id === myUserId;
                    return (
                        <div key={`group-${gIdx}`} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] ${isMine ? 'self-end' : 'self-start'}`}>
                            <div className="flex items-end gap-2 w-full">
                                {/* Partner Avatar for first message in group */}
                                {!isMine && (
                                    <div className="w-6 h-6 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-500/50 to-pink-500/50 flex items-center justify-center text-[10px] mb-1">
                                        {partner?.name?.[0]}
                                    </div>
                                )}

                                <div className={`flex flex-col gap-[2px] w-full ${isMine ? 'items-end' : 'items-start'}`}>
                                    {group.map((msg, idx) => {
                                        const isFirst = idx === 0;
                                        const isLast = idx === group.length - 1;

                                        let borderRadius = isMine
                                            ? `${isFirst ? '18px' : '6px'} 18px 18px ${isLast ? '18px' : '6px'}`
                                            : `18px ${isFirst ? '18px' : '6px'} ${isLast ? '18px' : '6px'} 18px`;

                                        // If single message in group
                                        if (group.length === 1) {
                                            borderRadius = isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px';
                                        } else if (isMine && isLast) {
                                            borderRadius = '18px 6px 4px 18px'
                                        } else if (!isMine && isLast) {
                                            borderRadius = '6px 18px 18px 4px'
                                        }

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`relative group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                                                title={formatTime(msg.created_at)}
                                            >
                                                {/* Floating Emoji Reactions Drawer */}
                                                {activeReactionMsgId === msg.id && (
                                                    <div className="absolute -top-9 z-30 flex items-center gap-1.5 p-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-full shadow-2xl animate-in zoom-in-75 duration-200">
                                                        {['❤️', '😂', '🥺', '🔥', '😮', '💋'].map(em => (
                                                            <button
                                                                key={em}
                                                                type="button"
                                                                onClick={() => handleAddReaction(msg.id, em)}
                                                                className="p-1 hover:scale-125 transition-transform text-sm"
                                                            >
                                                                {em}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <div
                                                    className={`px-4 py-3 shadow-md inline-block max-w-full backdrop-blur-md border relative ${isMine
                                                        ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-500/30 shadow-lg shadow-rose-950/40'
                                                        : 'bg-[#11141e]/95 text-gray-100 border-white/[0.08] shadow-md'
                                                        } transition-transform hover:scale-[1.01]`}
                                                    style={{ borderRadius }}
                                                >
                                                    {msg.is_burned ? (
                                                        <p className="text-xs italic text-stone-400 flex items-center gap-1.5 py-0.5">
                                                            <Flame className="w-3.5 h-3.5 text-stone-500" />
                                                            This message has self-destructed into ashes.
                                                        </p>
                                                    ) : (
                                                        <>
                                                            {msg.is_ephemeral && (
                                                                <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1 mb-1 pb-1 border-b border-white/10">
                                                                    <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                                                                    Self-destructing in {msg.burn_after_seconds || 10}s
                                                                </span>
                                                            )}
                                                            {msg.message_type === 'text' && (
                                                                <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                                                            )}
                                                        </>
                                                    )}

                                                    {msg.message_type === 'image' && (
                                                        <img
                                                            src={msg.file_url}
                                                            alt="Chat attachment"
                                                            className="max-w-[240px] max-h-[300px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                        />
                                                    )}

                                                    {msg.message_type === 'voice' && (
                                                        <div className="flex items-center gap-3 w-[200px] h-8">
                                                            <audio src={msg.file_url} controls className="w-full h-8 outline-none"
                                                                controlsList="nodownload noplaybackrate" />
                                                        </div>
                                                    )}

                                                    {/* Message meta (time + status)  */}
                                                    <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                                                        <span>{formatTime(msg.created_at)}</span>
                                                        {msg._isE2EE && (
                                                            <Lock size={9} className="text-emerald-400/80 inline ml-0.5" title="End-to-End Encrypted" />
                                                        )}
                                                        {isMine && (
                                                            <span className="ml-0.5">
                                                                {msg._tempId ? (
                                                                    <span title="Sending..." className="inline-flex items-center text-white/50">
                                                                        <Clock size={11} className="animate-spin text-pink-300" style={{ animationDuration: '3s' }} />
                                                                    </span>
                                                                ) : msg.read_at ? (
                                                                    <span className="text-pink-200 font-semibold" title="Read">✓✓</span>
                                                                ) : (
                                                                    <span title="Sent">✓</span>
                                                                )}
                                                            </span>
                                                        )}
                                                        {/* Quick Reaction trigger */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                                                            className="ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-white/60 hover:text-white transition-opacity"
                                                            title="React"
                                                        >
                                                            <Smile size={11} />
                                                        </button>
                                                    </div>

                                                    {/* Reaction Badge */}
                                                    {reactions[msg.id] && (
                                                        <span className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-full bg-[#1A202C] border border-white/20 text-xs shadow-md">
                                                            {reactions[msg.id]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {typingPartner && (
                    <div className="self-start flex items-center gap-2 max-w-[85%]">
                        <div className="w-6 h-6 rounded-full flex-shrink-0 bg-white/5" />
                        <div className="bg-white/5 rounded-full px-4 py-2 flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Upload Error Toast */}
            {uploadError && (
                <div className="flex-none mx-4 mb-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm text-center animate-pulse">
                    {uploadError}
                </div>
            )}

            {/* Input Bar */}
            <div className="flex-none px-2 sm:px-4 py-2.5 sm:py-3.5 pb-[max(12px,env(safe-area-inset-bottom))] bg-[#07080c]/95 backdrop-blur-md border-t border-white/[0.08] shadow-[0_-10px_30px_rgba(0,0,0,0.4)] z-20">
                <div className="max-w-4xl mx-auto flex items-center gap-1.5 sm:gap-3 relative">

                    <label className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-full cursor-pointer transition-colors flex-shrink-0 border border-transparent hover:border-pink-500/20" title="Send Photo">
                        <Paperclip size={18} />
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </label>

                    <button
                        type="button"
                        onClick={() => setIsEphemeralMode(!isEphemeralMode)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0 border ${isEphemeralMode
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                                : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 border-transparent hover:border-amber-500/20'
                            }`}
                        title={isEphemeralMode ? "Self-Destruct Active (Burns in 10s)" : "Toggle Self-Destruct Mode"}
                    >
                        <Flame size={18} className={isEphemeralMode ? "animate-bounce text-amber-300" : ""} />
                    </button>

                    <form onSubmit={sendTextMessage} className="flex-1 flex items-center min-w-0 bg-white/[0.06] border border-white/10 rounded-2xl focus-within:border-pink-500/50 focus-within:ring-1 focus-within:ring-pink-500/30 transition-all shadow-inner overflow-hidden">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={(e) => { if (e.key === 'Enter') sendTextMessage(e); }}
                            placeholder={isRecording ? "Recording audio... Speak now" : "Type a message..."}
                            disabled={isRecording}
                            className="w-full bg-transparent px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white placeholder-gray-500 focus:outline-none"
                        />
                        {inputValue.trim() && (
                            <button
                                type="submit"
                                className="w-8 h-8 sm:w-9 sm:h-9 mr-1.5 text-white bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_20px_rgba(236,72,153,0.6)] hover:scale-105 transition-all"
                            >
                                <Send size={15} />
                            </button>
                        )}
                    </form>

                    {!inputValue.trim() && (
                        <button
                            type="button"
                            onPointerDown={startRecording}
                            onPointerUp={stopRecording}
                            onPointerCancel={stopRecording}
                            onPointerLeave={stopRecording}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all border
                ${isRecording
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                                    : 'text-gray-400 bg-white/5 border-white/5 hover:bg-white/10 hover:text-purple-400 hover:border-purple-400/30'}
              `}
                        >
                            {isRecording ? (
                                <div className="relative flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-40 scale-150" />
                                    <Mic size={18} className="relative z-10" />
                                </div>
                            ) : (
                                <Mic size={18} />
                            )}
                        </button>
                    )}

                </div>
            </div>
            <SafetyCodeModal isOpen={showSafetyCode} onClose={() => setShowSafetyCode(false)} partnerName={partner?.name || 'Partner'} />
        </div>
    );
}

export default Chat;
