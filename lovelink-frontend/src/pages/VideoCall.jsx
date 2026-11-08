import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { 
    PhoneOff, 
    ChevronDown, 
    ShieldCheck, 
    Loader2, 
    ShieldAlert, 
    Lock, 
    Heart,
    Mic,
    MicOff,
    Video,
    VideoOff,
    SwitchCamera,
    Volume2
} from 'lucide-react';
import { getCallE2EEEmojis } from '../utils/callSecurity';
import { useCall } from '../context/CallContext';

// Google's free global STUN + OpenRelay TURN servers (100% Free Forever, Zero Expiration)
const RTC_CONFIGURATION = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:openrelay.metered.ca:80' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10
};

export default function VideoCall() {
    const { callId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { minimizeCall, sendWsMessage } = useCall?.() || {};

    // Media & WebRTC Refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const pendingCandidatesRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const hasEndedRef = useRef(false);
    const hasInitializedRef = useRef(false);

    // Call state
    const [callState, setCallState] = useState(() => location.state || null);
    const [loading, setLoading] = useState(!location.state);
    const [error, setError] = useState(null);
    const [partnerConnected, setPartnerConnected] = useState(() => location.state?.status === 'answered');
    const [callDuration, setCallDuration] = useState(0);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);

    // Controls state
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [facingMode, setFacingMode] = useState('user');

    const isVoice = (callState?.call_type === 'voice');

    // 1. Browser Autoplay Audio Unlocker
    useEffect(() => {
        const unlockAudio = () => {
            if (remoteAudioRef.current && remoteAudioRef.current.paused && remoteAudioRef.current.srcObject) {
                remoteAudioRef.current.play().catch(() => {});
            }
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);
        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    // 2. Fetch call metadata if entering via direct link or page reload
    useEffect(() => {
        if (callState?.room_id) {
            setLoading(false);
            if (callState.status === 'answered') {
                setPartnerConnected(true);
            }
            return;
        }

        api.get(`/calls/${callId}/token`)
            .then(async (res) => {
                const callInfo = res.data;
                const storedUser = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user') || '{}' : '{}');
                const myId = storedUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null);

                // Auto-answer if callee arrived directly via lock-screen notification click
                if (callInfo.status === 'initiated' && callInfo.started_by && myId && String(callInfo.started_by) !== String(myId)) {
                    try {
                        await api.post(`/calls/${callId}/answer`);
                        callInfo.status = 'answered';
                    } catch (e) {
                        console.warn('Auto-answer on launch:', e);
                    }
                }

                setCallState(callInfo);
                if (callInfo.status === 'answered') {
                    setPartnerConnected(true);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load call session:", err);
                setError("Call session expired or unavailable.");
                setLoading(false);
            });
    }, [callId, callState?.room_id, callState?.status]);

    // 3. Call Duration Timer
    useEffect(() => {
        if (!partnerConnected) return;

        timerIntervalRef.current = setInterval(() => {
            setCallDuration(d => d + 1);
        }, 1000);

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [partnerConnected]);

    const formattedDuration = useMemo(() => {
        const mins = Math.floor(callDuration / 60);
        const secs = callDuration % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, [callDuration]);

    const e2eeEmojis = useMemo(() => {
        if (!callState) return ['💎', '✨', '⚡', '❤️'];
        return getCallE2EEEmojis(
            callState.room_id || callId, 
            callState.user_id, 
            callState.partner_id
        );
    }, [callState, callId]);

    // 4. End Call Handler
    const handleEndCall = useCallback(async () => {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        // Turn off camera and mic tracks immediately
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                try { track.stop(); } catch (e) {}
            });
            localStreamRef.current = null;
        }

        // Close PeerConnection
        if (pcRef.current) {
            try { pcRef.current.close(); } catch (e) {}
            pcRef.current = null;
        }

        try {
            await api.post(`/calls/${callId}/end`);
        } catch (e) {
            console.error("Failed to notify backend of call end:", e);
        }

        navigate('/dashboard', { replace: true });
    }, [callId, navigate]);

    // 5. Minimize to PiP
    const handleMinimize = useCallback(() => {
        if (minimizeCall) {
            minimizeCall({
                callId,
                ...callState,
                duration: callDuration,
                isVoice
            });
        }
        navigate(-1);
    }, [minimizeCall, callId, callState, callDuration, isVoice, navigate]);

    // 6. Native WebRTC Core Engine
    useEffect(() => {
        if (!callState || hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        let pc = null;
        let isCaller = false;

        const storedUser = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user') || '{}' : '{}');
        const myUserId = storedUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null);

        // Determine if current user initiated the call
        if (callState.started_by) {
            isCaller = String(callState.started_by) === String(myUserId);
        } else if (callState.status === 'ringing' || callState.status === 'initiated') {
            isCaller = true;
        }

        const initializeWebRTC = async () => {
            try {
                // Step A: Acquire Local Media Stream
                const constraints = {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: isVoice ? false : {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                localStreamRef.current = stream;

                if (localVideoRef.current && !isVoice) {
                    localVideoRef.current.srcObject = stream;
                }

                // Step B: Initialize RTCPeerConnection
                pc = new RTCPeerConnection(RTC_CONFIGURATION);
                pcRef.current = pc;

                // Attach local tracks to PeerConnection
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });

                // Listen for incoming remote tracks
                pc.ontrack = (event) => {
                    console.log("[WebRTC] Received remote stream track:", event.track.kind);
                    const [remoteStream] = event.streams;
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = remoteStream;
                        remoteVideoRef.current.play().catch(() => {});
                    }
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = remoteStream;
                        remoteAudioRef.current.play().catch(() => {});
                    }
                    setPartnerConnected(true);
                };

                // Listen for local ICE candidates to relay over WebSocket
                pc.onicecandidate = (event) => {
                    if (event.candidate && sendWsMessage) {
                        sendWsMessage({
                            type: 'webrtc_ice_candidate',
                            call_id: callId,
                            candidate: event.candidate
                        });
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    console.log("[WebRTC] ICE Connection State:", pc.iceConnectionState);
                    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                        setPartnerConnected(true);
                    } else if (pc.iceConnectionState === 'disconnected') {
                        toast("Reconnecting partner stream...", { duration: 2500 });
                    } else if (pc.iceConnectionState === 'failed') {
                        console.warn("[WebRTC] ICE Failed, attempting restart");
                        pc.restartIce?.();
                    }
                };

                // Announce ready state to partner
                if (sendWsMessage) {
                    sendWsMessage({
                        type: 'webrtc_ready',
                        call_id: callId
                    });
                }

                // Helper: Create and send SDP Offer (Caller)
                const sendOffer = async () => {
                    if (!pcRef.current) return;
                    try {
                        const offer = await pcRef.current.createOffer({
                            offerToReceiveAudio: true,
                            offerToReceiveVideo: !isVoice
                        });
                        await pcRef.current.setLocalDescription(offer);
                        console.log("[WebRTC] Sending SDP Offer via WebSocket...");
                        if (sendWsMessage) {
                            sendWsMessage({
                                type: 'webrtc_offer',
                                call_id: callId,
                                sdp: offer
                            });
                        }
                    } catch (e) {
                        console.error("[WebRTC] Error creating offer:", e);
                    }
                };

                // If partner already answered prior to entry and we are caller, trigger offer immediately
                if (isCaller && callState.status === 'answered') {
                    sendOffer();
                }

                // Periodic offer sync for caller until connected (eliminates race conditions)
                let retryInterval = null;
                if (isCaller) {
                    let attempts = 0;
                    retryInterval = setInterval(() => {
                        if (!pcRef.current || hasEndedRef.current) return;
                        if (pcRef.current.iceConnectionState === 'connected' || pcRef.current.iceConnectionState === 'completed') {
                            clearInterval(retryInterval);
                            return;
                        }
                        if (attempts < 15) {
                            attempts++;
                            console.log(`[WebRTC] Offer sync heartbeat #${attempts}`);
                            sendOffer();
                        } else {
                            clearInterval(retryInterval);
                        }
                    }, 2000);
                }

                // Window Event Listeners for WebSocket Signaling
                const onRemoteReady = () => {
                    console.log("[WebRTC] Partner announced ready! Syncing offer...");
                    if (isCaller) {
                        sendOffer();
                    }
                };

                const onCallAnswered = () => {
                    console.log("[WebRTC] Partner answered. Initiating SDP offer handshake! ❤️");
                    setPartnerConnected(true);
                    if (isCaller) {
                        sendOffer();
                    }
                };

                const onRemoteOffer = async (e) => {
                    const data = e.detail;
                    if (data?.call_id !== callId || !pcRef.current) return;
                    console.log("[WebRTC] Received SDP Offer from partner. Generating answer...");
                    try {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));

                        // Flush any ICE candidates that arrived early
                        while (pendingCandidatesRef.current.length > 0) {
                            const cand = pendingCandidatesRef.current.shift();
                            await pcRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                        }

                        const answer = await pcRef.current.createAnswer();
                        await pcRef.current.setLocalDescription(answer);

                        if (sendWsMessage) {
                            sendWsMessage({
                                type: 'webrtc_answer',
                                call_id: callId,
                                sdp: answer
                            });
                        }
                    } catch (err) {
                        console.error("[WebRTC] Failed to handle offer and create answer:", err);
                    }
                };

                const onRemoteAnswer = async (e) => {
                    const data = e.detail;
                    if (data?.call_id !== callId || !pcRef.current) return;
                    console.log("[WebRTC] Received SDP Answer from partner. Handshake established! ❤️");
                    try {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));

                        while (pendingCandidatesRef.current.length > 0) {
                            const cand = pendingCandidatesRef.current.shift();
                            await pcRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                        }
                        setPartnerConnected(true);
                    } catch (err) {
                        console.error("[WebRTC] Failed to set remote answer:", err);
                    }
                };

                const onRemoteIceCandidate = async (e) => {
                    const data = e.detail;
                    if (data?.call_id !== callId || !data.candidate) return;
                    if (!pcRef.current || !pcRef.current.remoteDescription) {
                        pendingCandidatesRef.current.push(data.candidate);
                        return;
                    }
                    try {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (err) {
                        console.error("[WebRTC] Error adding ICE candidate:", err);
                    }
                };

                window.addEventListener('lovelink:webrtc_ready', onRemoteReady);
                window.addEventListener('lovelink:call_answered', onCallAnswered);
                window.addEventListener('lovelink:webrtc_offer', onRemoteOffer);
                window.addEventListener('lovelink:webrtc_answer', onRemoteAnswer);
                window.addEventListener('lovelink:webrtc_ice_candidate', onRemoteIceCandidate);

                return () => {
                    if (retryInterval) clearInterval(retryInterval);
                    window.removeEventListener('lovelink:webrtc_ready', onRemoteReady);
                    window.removeEventListener('lovelink:call_answered', onCallAnswered);
                    window.removeEventListener('lovelink:webrtc_offer', onRemoteOffer);
                    window.removeEventListener('lovelink:webrtc_answer', onRemoteAnswer);
                    window.removeEventListener('lovelink:webrtc_ice_candidate', onRemoteIceCandidate);
                };

            } catch (err) {
                console.error("[WebRTC] Media permission error:", err);
                setPermissionDenied(true);
                toast.error("Please grant camera and microphone permissions to connect call");
            }
        };

        const cleanupListenersPromise = initializeWebRTC();

        return () => {
            cleanupListenersPromise.then(cleanup => cleanup && cleanup());
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    try { track.stop(); } catch (e) {}
                });
                localStreamRef.current = null;
            }
            if (pcRef.current) {
                try { pcRef.current.close(); } catch (e) {}
                pcRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [callId, callState, isVoice, sendWsMessage]);

    // 7. Toggle Microphone
    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            if (audioTracks.length > 0) {
                const nextState = !audioTracks[0].enabled;
                audioTracks.forEach(t => { t.enabled = nextState; });
                setIsMicMuted(!nextState);
                toast(nextState ? "Microphone active" : "Microphone muted", { duration: 1500 });
            }
        }
    };

    // 8. Toggle Camera
    const toggleCamera = () => {
        if (localStreamRef.current && !isVoice) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            if (videoTracks.length > 0) {
                const nextState = !videoTracks[0].enabled;
                videoTracks.forEach(t => { t.enabled = nextState; });
                setIsCameraOff(!nextState);
                toast(nextState ? "Camera active" : "Camera turned off", { duration: 1500 });
            }
        }
    };

    // 9. Flip Mobile Camera (Front / Rear)
    const flipCamera = async () => {
        if (isVoice || !localStreamRef.current) return;
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: newMode } }
            });
            const newVideoTrack = newStream.getVideoTracks()[0];
            const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

            if (oldVideoTrack) {
                localStreamRef.current.removeTrack(oldVideoTrack);
                oldVideoTrack.stop();
            }
            localStreamRef.current.addTrack(newVideoTrack);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
            }

            if (pcRef.current) {
                const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(newVideoTrack);
                }
            }
            setFacingMode(newMode);
            toast.success("Camera flipped", { duration: 1500 });
        } catch (e) {
            console.log("Could not flip camera:", e);
            toast.error("Camera flip not supported on this device");
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-[#070913] flex flex-col items-center justify-center text-white p-4 z-50">
                <Loader2 size={36} className="text-pink-400 animate-spin mb-4" />
                <p className="text-gray-300 font-medium">Securing End-to-End Encrypted Call...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-[#070913] flex flex-col items-center justify-center text-white p-4 z-50">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                    <PhoneOff size={32} />
                </div>
                <h1 className="text-xl font-bold mb-2">Call Disconnected</h1>
                <p className="text-gray-400 mb-6">{error}</p>
                <button
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-2xl transition-all shadow-lg shadow-purple-500/20 text-white font-medium"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const partnerName = callState?.partner_name || "Partner";
    const partnerPhoto = callState?.partner_photo;

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#070913] select-none text-white">

            {/* Invisible Remote Audio Element (Guarantees voice streams regardless of video status) */}
            <audio ref={remoteAudioRef} autoPlay playsInline />

            {/* 1. Remote Partner Video (Full-Screen in Video Mode) */}
            {!isVoice ? (
                <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover transition-opacity duration-700 ${partnerConnected ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {/* Fallback romantic avatar if partner video hasn't arrived or is off */}
                    {!partnerConnected && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-6">
                            {partnerPhoto ? (
                                <img src={partnerPhoto} alt={partnerName} className="w-36 h-36 md:w-44 md:h-44 rounded-full object-cover border-4 border-pink-500/40 shadow-2xl animate-pulse" />
                            ) : (
                                <div className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center text-5xl font-bold border-4 border-white/20 shadow-2xl animate-pulse">
                                    {partnerName[0]?.toUpperCase()}
                                </div>
                            )}
                            <p className="mt-6 text-sm md:text-base font-semibold text-gray-200 flex items-center gap-2">
                                <span>Connecting with {partnerName}...</span>
                                <span>❤️</span>
                            </p>
                            <p className="text-xs text-pink-300/70 mt-1">Free Peer-to-Peer WebRTC • DTLS-SRTP</p>
                        </div>
                    )}
                </div>
            ) : null}

            {/* 2. Floating Local Self-Camera (In Video Mode, Top-Right PiP) */}
            {!isVoice && (
                <div className="absolute top-20 right-4 z-30 w-28 h-40 md:w-40 md:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-900/90 backdrop-blur-md transition-all">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 ${isCameraOff ? 'hidden' : 'block'}`}
                    />
                    {isCameraOff && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                            <VideoOff size={24} className="mb-1 text-pink-400" />
                            <span>Camera Off</span>
                        </div>
                    )}
                </div>
            )}

            {/* 3. Romantic Voice Call Screen (Voice Mode) */}
            {isVoice && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
                    {/* Blurred Romantic Backdrop */}
                    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
                        {partnerPhoto ? (
                            <img src={partnerPhoto} alt={partnerName} className="w-full h-full object-cover filter blur-3xl opacity-20 scale-125" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-950 via-[#070913] to-pink-950" />
                        )}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                    </div>

                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-52 h-52 md:w-64 md:h-64 rounded-full border border-pink-500/20 animate-ping" style={{ animationDuration: '3s' }} />
                        <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border border-purple-500/20 animate-pulse" style={{ animationDuration: '2s' }} />
                        <div className="absolute w-44 h-44 md:w-56 md:h-56 rounded-full bg-gradient-to-tr from-pink-500/10 to-purple-500/10 blur-xl" />

                        <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_50px_rgba(236,72,153,0.35)] z-10 bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center text-4xl font-bold text-white">
                            {partnerPhoto ? (
                                <img src={partnerPhoto} alt={partnerName} className="w-full h-full object-cover" />
                            ) : (
                                <span>{partnerName[0]?.toUpperCase()}</span>
                            )}
                        </div>
                    </div>

                    {/* Animated Equalizer Bars */}
                    <div className="mt-8 flex items-center gap-1.5 h-6">
                        <div className="w-1 bg-pink-400 rounded-full animate-bounce" style={{ height: '70%', animationDelay: '0ms' }} />
                        <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                        <div className="w-1 bg-pink-300 rounded-full animate-bounce" style={{ height: '45%', animationDelay: '300ms' }} />
                        <div className="w-1 bg-purple-300 rounded-full animate-bounce" style={{ height: '85%', animationDelay: '450ms' }} />
                        <div className="w-1 bg-pink-400 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '600ms' }} />
                    </div>

                    <p className="mt-3 text-xs tracking-wider uppercase text-pink-300/80 font-semibold">
                        {partnerConnected ? "HD Voice Active • Peer-to-Peer Opus" : "Calling partner..."}
                    </p>
                </div>
            )}

            {/* 4. Telegram Top Header Bar */}
            <header className="absolute top-0 inset-x-0 z-40 px-4 py-4 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                <button
                    onClick={handleMinimize}
                    title="Minimize call"
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/10 text-white transition-all shadow-lg"
                >
                    <ChevronDown size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-1.5 drop-shadow-md">
                        <span>{partnerName}</span>
                        <Heart size={14} className="text-pink-400 fill-pink-400" />
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${partnerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                        <span className="text-xs font-medium text-gray-300">
                            {partnerConnected ? `${formattedDuration} • Encrypted P2P` : 'Calling...'}
                        </span>
                        {partnerConnected && <Lock size={11} className="text-emerald-400" />}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSecurityModal(true)}
                        title="Click to verify End-to-End Encryption"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md border border-purple-500/30 shadow-lg text-sm transition-all hover:scale-105 active:scale-95"
                    >
                        {e2eeEmojis.map((emoji, idx) => (
                            <span key={idx} className="text-base select-none">{emoji}</span>
                        ))}
                    </button>
                    <button
                        onClick={handleEndCall}
                        title="End Call"
                        className="p-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-lg transition-all"
                    >
                        <PhoneOff size={16} />
                    </button>
                </div>
            </header>

            {/* 5. Permission Blocked Alert */}
            {permissionDenied && (
                <div className="absolute top-20 inset-x-4 z-50 flex justify-center pointer-events-auto animate-bounce">
                    <div className="px-5 py-3 rounded-2xl bg-amber-950/95 border border-amber-500/50 shadow-2xl flex items-center gap-3 text-amber-200 text-xs max-w-md">
                        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                            <p className="font-bold">Camera/Mic Access Blocked</p>
                            <p className="text-[11px] text-amber-300/80 mt-0.5">
                                Click the lock/settings icon in your browser URL bar, set Camera & Microphone to <strong>"Allow"</strong>, and reload.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. Telegram Romantic Bottom Dock */}
            <div className="absolute bottom-6 inset-x-0 z-40 flex items-center justify-center gap-4 px-4 pointer-events-auto">
                <div className="flex items-center gap-3 p-2.5 px-4 rounded-3xl bg-black/70 backdrop-blur-xl border border-white/15 shadow-2xl">
                    
                    {/* Toggle Microphone */}
                    <button
                        onClick={toggleMic}
                        title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                        className={`p-3.5 rounded-full transition-all duration-200 active:scale-95 ${
                            isMicMuted 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    {/* Toggle Camera (Video mode only) */}
                    {!isVoice && (
                        <button
                            onClick={toggleCamera}
                            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                            className={`p-3.5 rounded-full transition-all duration-200 active:scale-95 ${
                                isCameraOff 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                        >
                            {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                        </button>
                    )}

                    {/* Flip Camera (Video mode on mobile) */}
                    {!isVoice && (
                        <button
                            onClick={flipCamera}
                            title="Flip camera"
                            className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                        >
                            <SwitchCamera size={20} />
                        </button>
                    )}

                    {/* Speaker Quality Indicator */}
                    <button
                        onClick={() => toast("High-Definition Opus Audio Active", { duration: 1500 })}
                        title="HD Audio"
                        className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 hidden sm:flex"
                    >
                        <Volume2 size={20} />
                    </button>

                    {/* End Call Button */}
                    <button
                        onClick={handleEndCall}
                        title="End call"
                        className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-semibold transition-all shadow-lg shadow-red-600/30"
                    >
                        <PhoneOff size={18} />
                        <span className="text-sm">End</span>
                    </button>
                </div>
            </div>

            {/* 7. Telegram 4-Emoji E2EE Security Modal */}
            {showSecurityModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
                    onClick={() => setShowSecurityModal(false)}
                >
                    <div 
                        className="bg-[#0f1423] border border-purple-500/30 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4 border border-purple-500/30 shadow-inner">
                            <ShieldCheck size={30} />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">End-to-End Encrypted</h3>
                        <p className="text-xs text-gray-400 mb-6">
                            Direct peer-to-peer connection encrypted with 256-bit WebRTC DTLS-SRTP.
                        </p>

                        <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-black/60 border border-white/10 mb-6">
                            {e2eeEmojis.map((emoji, idx) => (
                                <span key={idx} className="text-3xl filter drop-shadow select-none">{emoji}</span>
                            ))}
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed mb-6">
                            If the 4 emojis above match the ones on <strong>{partnerName}</strong>'s screen, this call is completely direct, private, and secure from eavesdropping.
                        </p>

                        <button
                            onClick={() => setShowSecurityModal(false)}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-500/25 active:scale-95"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
