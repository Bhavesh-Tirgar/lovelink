import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Video, Paperclip, Mic, Send, ArrowLeft, Flame } from 'lucide-react';
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
    const [partner, setPartner] = useState(null);
    const [typingPartner, setTypingPartner] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [calling, setCalling] = useState(false);

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
    }, []);

    // Handle incoming websocket messages
    const onWSMessage = useCallback((data) => {
        if (data.type === 'message' || data.type === 'new_message') {
            const incoming = data.message || data.data;
            if (!incoming) return;

            setMessages(prev => {
                // If we sent this message ourselves, replace the optimistic temp entry
                const tempIdx = prev.findIndex(
                    m => m._tempId && m.sender_id === incoming.sender_id
                );
                if (tempIdx !== -1) {
                    const next = [...prev];
                    next[tempIdx] = incoming; // swap temp with real DB message
                    return next;
                }

                // If this EXACT message ID already exists (e.g. from an HTTP upload response), ignore the WS broadcast
                if (prev.some(m => m.id === incoming.id)) {
                    return prev;
                }

                // Otherwise it's from the partner (or a new message we didn't optimistically render)
                return [...prev, incoming];
            });

            // Mark read implicitly if we get a message when open
            api.put('/chat/messages/mark-read').catch(console.error);

            // Auto-burn ephemeral message when received and viewed
            if (incoming.is_ephemeral && !incoming.is_burned && incoming.sender_id !== myUserId) {
                setTimeout(() => {
                    api.post(`/chat/messages/${incoming.id}/burn`).catch(() => {});
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
    }, []);

    const { sendMessage, isConnected } = useWebSocket(
        coupleId ? `${WS_URL}/ws/chat/${coupleId}` : null,
        onWSMessage
    );

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

                const msgRes = await api.get('/chat/messages');
                setMessages(msgRes.data); // backend returns oldest first in chunk (chunk is newest 50)
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
                setMessages(prev => [...res.data, ...prev]);
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
        setTimeout(scrollToBottom, 50);

        sendMessage({
            type: 'message',
            content: text,
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
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            console.error('Upload failed', err);
            setUploadError('Failed to upload file. Please try again.');
            setTimeout(() => setUploadError(''), 4000);
        }

        // Reset file input
        e.target.value = null;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });

                const formData = new FormData();
                formData.append('file', file);

                try {
                    // No manual Content-Type — let axios set the boundary
                    const res = await api.post('/chat/upload', formData);
                    setMessages(prev => [...prev, res.data]);
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
            console.error("Microphone access denied or error", err);
        }
    };

    const stopRecording = () => {
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
        } finally {
            setCalling(false);
        }
    };

    // Group messages logic (if < 2 min diff, group them)
    const groupedMessages = messages.reduce((acc, msg) => {
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
        return <div className="h-screen bg-[#080612] flex items-center justify-center text-gray-400">Loading chat...</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-screen w-full text-gray-100 overflow-hidden animate-in fade-in duration-700">
            {/* Top Bar */}
            <header className="flex-none flex items-center justify-between px-4 sm:px-6 py-4 bg-brand-darker/60 backdrop-blur-xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="relative group cursor-pointer">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold shadow-inner group-hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-shadow">
                                {partner?.name?.[0] || '?'}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-brand-darker transition-colors duration-500 ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'}`} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight tracking-tight text-white">{partner?.name || 'Partner'}</h2>
                            <p className="text-xs font-medium uppercase tracking-widest text-pink-300/80">
                                {typingPartner ? 'typing...' : (isConnected ? 'Online' : 'Offline')}
                            </p>
                        </div>
                    </div>
                </div>

                {partner && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => startCall('voice')}
                            disabled={calling}
                            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/5 text-gray-200 border border-white/10 hover:bg-white/15 hover:text-white transition-all disabled:opacity-50"
                            title="Voice Call"
                        >
                            <Phone size={18} />
                        </button>
                        <button
                            onClick={() => startCall('video')}
                            disabled={calling}
                            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-pink-300 border border-pink-500/20 hover:border-pink-500/50 hover:bg-pink-500/30 transition-all disabled:opacity-50 shadow-sm"
                            title="Video Call"
                        >
                            <Video size={18} />
                        </button>
                    </div>
                )}
            </header>

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
                                                <div
                                                    className={`px-4 py-3 shadow-md inline-block max-w-full backdrop-blur-md border ${isMine
                                                        ? 'bg-gradient-to-br from-purple-600/90 to-pink-600/90 text-white border-pink-500/30'
                                                        : 'glass-card text-gray-100 border-white/10'
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
                                                        // Note: Fullscreen lightbox could be added here on click
                                                        />
                                                    )}

                                                    {msg.message_type === 'voice' && (
                                                        <div className="flex items-center gap-3 w-[200px] h-8">
                                                            <audio src={msg.file_url} controls className="w-full h-8 outline-none"
                                                                controlsList="nodownload noplaybackrate" />
                                                        </div>
                                                    )}

                                                    {/* Messsage meta (time + status)  */}
                                                    <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                                                        <span>{formatTime(msg.created_at)}</span>
                                                        {isMine && (
                                                            <span className="ml-0.5">
                                                                {msg.read_at ? (
                                                                    <span className="text-pink-200">✓✓</span>
                                                                ) : (
                                                                    <span>✓</span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
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

            {/* Input Nav */}
            <div className="flex-none p-4 pb-safe bg-brand-darker/70 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] z-20">
                <div className="max-w-4xl mx-auto flex items-end gap-3 relative">

                    <label className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-full cursor-pointer transition-colors flex-shrink-0 mb-0 border border-transparent hover:border-pink-500/20" title="Send Photo">
                        <Paperclip size={20} />
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
                        className={`w-11 h-11 flex items-center justify-center rounded-full transition-all flex-shrink-0 border ${
                            isEphemeralMode 
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                                : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 border-transparent hover:border-amber-500/20'
                        }`}
                        title={isEphemeralMode ? "Self-Destruct Active (Burns in 10s)" : "Toggle Self-Destruct Mode"}
                    >
                        <Flame size={20} className={isEphemeralMode ? "animate-bounce text-amber-300" : ""} />
                    </button>

                    <form onSubmit={sendTextMessage} className="flex-1 flex max-w-full glass-card rounded-[28px] focus-within:border-pink-500/50 focus-within:ring-1 focus-within:ring-pink-500/30 transition-all shadow-inner overflow-hidden">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={(e) => { if (e.key === 'Enter') sendTextMessage(e); }}
                            placeholder={isRecording ? "Recording audio... Speak now" : "Type a romantic message..."}
                            disabled={isRecording}
                            className="w-full bg-transparent px-5 py-4 text-[15px] font-medium text-white placeholder-gray-500 focus:outline-none"
                        />
                        {inputValue.trim() && (
                            <button
                                type="submit"
                                className="w-10 h-10 m-1 text-white bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_20px_rgba(236,72,153,0.6)] hover:scale-105 transition-all"
                            >
                                <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
                            </button>
                        )}
                    </form>

                    {!inputValue.trim() && (
                        <button
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mb-0 transition-all border
                ${isRecording
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                                    : 'text-gray-400 bg-white/5 border-white/5 hover:bg-white/10 hover:text-purple-400 hover:border-purple-400/30'}
              `}
                        >
                            {isRecording ? (
                                <div className="relative flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-40 scale-150" />
                                    <Mic size={22} className="relative z-10" />
                                </div>
                            ) : (
                                <Mic size={22} />
                            )}
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
}

export default Chat;
