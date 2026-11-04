import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import api from '../api';
import { Phone, PhoneOff, Video } from 'lucide-react';

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
    const navigate = useNavigate();
    const [incomingCall, setIncomingCall] = useState(null);
    const [myUserId, setMyUserId] = useState(null);
    const [coupleId, setCoupleId] = useState(null);
    const audioCtxRef = useRef(null);
    const oscRef = useRef(null);
    const timeoutRef = useRef(null);

    // Fetch basic user context so we know if we have a couple ID for the WS
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await api.get('/auth/me');
                setMyUserId(res.data.user?.id);
                setCoupleId(res.data.couple_id);
            } catch (err) {
                // User not logged in, ignore
            }
        };
        fetchMe();
    }, []);

    const wsUrl = coupleId ? `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/chat/${coupleId}` : null;

    const handleWsMessage = useCallback((data) => {
        if (data.type === 'incoming_call') {
            setIncomingCall(data);
            startRinging();
            // Auto decline after 30s
            timeoutRef.current = setTimeout(() => {
                declineCall(data.call_id);
            }, 30000);
        } else if (data.type === 'call_declined' || data.type === 'call_ended') {
            if (incomingCall?.call_id === data.call_id) {
                clearIncoming();
            }
        }
    }, [incomingCall]);

    const { sendMessage } = useWebSocket(wsUrl, handleWsMessage);

    const startRinging = () => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);

            // Ring modulation effect
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);

            // Loop it
            setInterval(() => {
                if (!oscRef.current) return;
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
            }, 2000);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            oscRef.current = osc;
        } catch (e) {
            console.log('Audio playback blocked by browser', e);
        }
    };

    const stopRinging = () => {
        if (oscRef.current) {
            try { oscRef.current.stop(); } catch (e) { }
            oscRef.current.disconnect();
            oscRef.current = null;
        }
    };

    const clearIncoming = () => {
        setIncomingCall(null);
        stopRinging();
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const answerCall = async (callId) => {
        const callData = incomingCall;
        clearIncoming();
        try {
            // Get our token for the room
            const res = await api.post(`/calls/${callId}/answer`);
            navigate(`/call/${callId}`, {
                state: {
                    token: res.data.token,
                    room_id: res.data.room_id,
                    zego_app_id: res.data.zego_app_id,
                    user_id: res.data.user_id,
                    user_name: res.data.user_name
                }
            });
        } catch (err) {
            console.error("Failed to answer call:", err);
        }
    };

    const declineCall = async (callId) => {
        clearIncoming();
        try {
            await api.post(`/calls/${callId}/decline`);
        } catch (err) {
            console.error("Failed to decline call:", err);
        }
    };

    return (
        <CallContext.Provider value={{ incomingCall, declineCall, answerCall }}>
            {children}

            {/* Incoming Call Modal Overlay */}
            {incomingCall && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0d0f1a] border border-white/10 rounded-3xl p-8 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-300">

                        <div className="relative mb-6">
                            {/* Pulse rings */}
                            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute inset-[-10px] rounded-full bg-purple-500/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>

                            {incomingCall.caller_photo ? (
                                <img src={incomingCall.caller_photo} alt={incomingCall.caller_name} className="w-24 h-24 rounded-full object-cover relative z-10 border-2 border-purple-500/50" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold text-white relative z-10">
                                    {incomingCall.caller_name?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>

                        <h2 className="text-xl font-semibold text-white mb-1">{incomingCall.caller_name}</h2>
                        <p className="text-gray-400 mb-8 flex items-center gap-2">
                            {incomingCall.call_type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                            is calling...
                        </p>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => declineCall(incomingCall.call_id)}
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white transition-all hover:scale-105 shadow-lg shadow-red-500/20"
                            >
                                <PhoneOff size={24} />
                            </button>

                            <button
                                onClick={() => answerCall(incomingCall.call_id)}
                                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-white transition-all hover:scale-105 shadow-lg shadow-green-500/20 animate-bounce"
                            >
                                <Phone size={24} />
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </CallContext.Provider>
    );
};
