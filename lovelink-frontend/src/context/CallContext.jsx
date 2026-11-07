import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useWebSocket from '../hooks/useWebSocket';
import api from '../api';
import { getWsBaseUrl } from '../utils/wsUrl';
import { Phone, PhoneOff, Video, Maximize2 } from 'lucide-react';

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [incomingCall, setIncomingCall] = useState(null);
    const [minimizedCall, setMinimizedCall] = useState(null);
    const [coupleId, setCoupleId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('couple_id') : null));
    const audioCtxRef = useRef(null);
    const oscRef = useRef(null);
    const timeoutRef = useRef(null);

    // Keep coupleId in sync whenever location changes or token is present
    useEffect(() => {
        const storedCoupleId = localStorage.getItem('couple_id');
        if (storedCoupleId && storedCoupleId !== coupleId) {
            setCoupleId(storedCoupleId);
        }
        const token = localStorage.getItem('token');
        if (token && (!coupleId || !storedCoupleId)) {
            api.get('/auth/me')
                .then((res) => {
                    if (res.data?.couple_id) {
                        setCoupleId(res.data.couple_id);
                        localStorage.setItem('couple_id', res.data.couple_id);
                    }
                })
                .catch(() => {});
        }
    }, [location.pathname, coupleId]);

    const wsUrl = coupleId ? `${getWsBaseUrl()}/ws/chat/${coupleId}` : null;

    const stopRinging = useCallback(() => {
        if (oscRef.current) {
            try { oscRef.current.stop(); } catch (e) { }
            oscRef.current.disconnect();
            oscRef.current = null;
        }
    }, []);

    const clearIncoming = useCallback(() => {
        setIncomingCall(null);
        stopRinging();
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [stopRinging]);

    const declineCall = useCallback(async (callId) => {
        clearIncoming();
        try {
            await api.post(`/calls/${callId}/decline`);
        } catch (err) {
            console.error("Failed to decline call:", err);
        }
    }, [clearIncoming]);

    const startRinging = useCallback(() => {
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
            const interval = setInterval(() => {
                if (!oscRef.current) {
                    clearInterval(interval);
                    return;
                }
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
    }, []);

    const handleWsMessage = useCallback((data) => {
        const storedUser = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user') || '{}' : '{}');
        const myUserId = storedUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null);

        if (data.type === 'incoming_call') {
            // Never show incoming call to the caller, or if already in a call
            if (data.caller_id && myUserId && String(data.caller_id) === String(myUserId)) {
                return;
            }
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/call/')) {
                return;
            }

            setIncomingCall(data);
            startRinging();

            // Auto decline after 30s only on the RECEIVER's side if not answered
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                declineCall(data.call_id);
            }, 30000);

        } else if (data.type === 'call_answered') {
            clearIncoming();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('lovelink:call_answered', { detail: data }));
            }

        } else if (data.type === 'call_declined') {
            if (incomingCall?.call_id === data.call_id) {
                clearIncoming();
            }
            if (minimizedCall?.callId === data.call_id) {
                setMinimizedCall(null);
            }
            if (location.pathname === `/call/${data.call_id}`) {
                toast.error("Call was declined or partner is unavailable");
                navigate('/dashboard', { replace: true });
            }

        } else if (data.type === 'call_ended') {
            if (incomingCall?.call_id === data.call_id) {
                clearIncoming();
            }
            if (minimizedCall?.callId === data.call_id) {
                setMinimizedCall(null);
                toast("Call ended");
            }
            if (location.pathname === `/call/${data.call_id}`) {
                toast("Call ended");
                navigate('/dashboard', { replace: true });
            }
        }
    }, [incomingCall, minimizedCall, startRinging, declineCall, clearIncoming, location.pathname, navigate]);

    useWebSocket(wsUrl, handleWsMessage);

    const answerCall = async (callId) => {
        const callData = incomingCall;
        clearIncoming();
        try {
            const res = await api.post(`/calls/${callId}/answer`);
            navigate(`/call/${callId}`, {
                state: {
                    token: res.data.token,
                    room_id: res.data.room_id,
                    zego_app_id: res.data.zego_app_id,
                    user_id: res.data.user_id,
                    user_name: res.data.user_name,
                    partner_id: res.data.partner_id || callData?.caller_id,
                    partner_name: res.data.partner_name || callData?.caller_name || 'Partner',
                    partner_photo: res.data.partner_photo || callData?.caller_photo,
                    call_type: callData?.call_type || res.data.call_type || 'video',
                    status: res.data.status || 'answered'
                }
            });
        } catch (err) {
            console.error("Failed to answer call:", err);
            toast.error("Failed to connect call");
        }
    };

    const minimizeCall = useCallback((data) => {
        setMinimizedCall(data);
    }, []);

    const restoreCall = useCallback(() => {
        if (!minimizedCall) return;
        const target = { ...minimizedCall };
        setMinimizedCall(null);
        navigate(`/call/${target.callId}`, {
            state: target
        });
    }, [minimizedCall, navigate]);

    const endMinimizedCall = useCallback(async () => {
        if (!minimizedCall) return;
        const cid = minimizedCall.callId;
        setMinimizedCall(null);
        try {
            await api.post(`/calls/${cid}/end`);
        } catch (e) {
            console.error("Failed to notify backend of call end", e);
        }
        toast("Call ended");
    }, [minimizedCall]);

    return (
        <CallContext.Provider value={{ incomingCall, declineCall, answerCall, minimizeCall, restoreCall, endMinimizedCall }}>
            {children}

            {/* Telegram Floating PiP Card (when call is minimized) */}
            {minimizedCall && !location.pathname.startsWith('/call/') && (
                <div className="fixed bottom-24 right-4 z-[9999] flex items-center gap-3 p-2.5 pr-4 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/15 shadow-2xl animate-in slide-in-from-bottom-5">
                    <div className="relative">
                        {minimizedCall.partner_photo ? (
                            <img src={minimizedCall.partner_photo} alt={minimizedCall.partner_name} className="w-10 h-10 rounded-full object-cover border border-purple-500/40" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white text-xs">
                                {minimizedCall.partner_name?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
                    </div>

                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white leading-tight">{minimizedCall.partner_name || 'Partner'}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            {minimizedCall.isVoice ? <Phone size={10} className="text-emerald-400" /> : <Video size={10} className="text-pink-400" />}
                            <span>Active Call</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                        <button
                            onClick={restoreCall}
                            title="Expand Call"
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                        >
                            <Maximize2 size={14} />
                        </button>
                        <button
                            onClick={endMinimizedCall}
                            title="End Call"
                            className="p-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white transition-all active:scale-95"
                        >
                            <PhoneOff size={14} />
                        </button>
                    </div>
                </div>
            )}

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
                            {incomingCall.call_type === 'video' ? <Video size={16} className="text-pink-400" /> : <Phone size={16} className="text-emerald-400" />}
                            {incomingCall.call_type === 'video' ? 'Incoming Video Call...' : 'Incoming Voice Call...'}
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
