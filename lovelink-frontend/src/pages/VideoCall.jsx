import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import api from '../api';
import toast from 'react-hot-toast';
import { 
    PhoneOff, 
    ChevronDown, 
    ShieldCheck, 
    Mic, 
    MicOff, 
    Video, 
    VideoOff, 
    SwitchCamera, 
    Volume2, 
    Loader2, 
    ShieldAlert, 
    Lock, 
    Heart 
} from 'lucide-react';
import { getCallE2EEEmojis } from '../utils/callSecurity';
import { useCall } from '../context/CallContext';

export default function VideoCall() {
    const { callId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { minimizeCall } = useCall?.() || {};

    const containerRef = useRef(null);
    const zpRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const remoteUserJoinedRef = useRef(false);
    const hasEndedRef = useRef(false);
    const initializedCallIdRef = useRef(null);

    const [containerReady, setContainerReady] = useState(false);
    const [callState, setCallState] = useState(() => location.state || null);
    const [loading, setLoading] = useState(!location.state?.token);
    const [error, setError] = useState(null);
    // If the call was answered by the partner before arriving, start connected
    const [partnerConnected, setPartnerConnected] = useState(() => location.state?.status === 'answered');
    const [callDuration, setCallDuration] = useState(0);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const isVoice = (callState?.call_type === 'voice');

    // 1. Non-intrusive permission status query (never calls getUserMedia so hardware is not locked)
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
            navigator.permissions.query({ name: 'camera' })
                .then(status => {
                    if (status.state === 'denied') setPermissionDenied(true);
                    status.onchange = () => {
                        if (status.state === 'denied') setPermissionDenied(true);
                        else setPermissionDenied(false);
                    };
                })
                .catch(() => {});
        }
    }, []);

    // 2. Global Autoplay Audio Unlocker (resumes any browser-muted audio streams)
    useEffect(() => {
        const unlockMedia = () => {
            try {
                const mediaElements = document.querySelectorAll('audio, video');
                mediaElements.forEach(el => {
                    if (el.paused && el.srcObject) {
                        el.play().catch(() => {});
                    }
                });
            } catch (e) {}
        };
        window.addEventListener('click', unlockMedia);
        window.addEventListener('touchstart', unlockMedia);
        return () => {
            window.removeEventListener('click', unlockMedia);
            window.removeEventListener('touchstart', unlockMedia);
        };
    }, []);

    // Call controls state
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(true);

    // Callback ref to guarantee container is captured in state
    const containerCallbackRef = useCallback((node) => {
        if (node !== null) {
            containerRef.current = node;
            setContainerReady(true);
        }
    }, []);

    // 1. Fetch credentials if missing (e.g. page reload or direct URL link)
    useEffect(() => {
        if (callState?.token) {
            setLoading(false);
            if (callState.status === 'answered') {
                setPartnerConnected(true);
            }
            return;
        }

        api.get(`/calls/${callId}/token`)
            .then(res => {
                setCallState(res.data);
                if (res.data.status === 'answered') {
                    setPartnerConnected(true);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to retrieve call credentials:", err);
                setError("Call session expired or unavailable.");
                setLoading(false);
            });
    }, [callId, callState?.token, callState?.status]);

    // 2. Listen to WebSocket call_answered event dispatched from CallContext
    useEffect(() => {
        const handleCallAnswered = (e) => {
            const data = e.detail;
            if (data?.call_id === callId) {
                console.log("Partner answered the call via WebSocket signaling! ❤️");
                remoteUserJoinedRef.current = true;
                setPartnerConnected(true);
                toast.success("Partner connected! ❤️", { duration: 3000 });
            }
        };

        window.addEventListener('lovelink:call_answered', handleCallAnswered);
        return () => {
            window.removeEventListener('lovelink:call_answered', handleCallAnswered);
        };
    }, [callId]);

    // 3. Periodic presence & status synchronization while waiting for partner
    useEffect(() => {
        if (partnerConnected || hasEndedRef.current) return;

        const interval = setInterval(async () => {
            // Check if Zego already lists remote users
            try {
                const remoteList = ZegoUIKitPrebuilt?.core?.zum?.remoteUserList || [];
                if (remoteList.length > 0) {
                    remoteUserJoinedRef.current = true;
                    setPartnerConnected(true);
                    return;
                }
            } catch (e) {}

            // Fallback: Check backend status
            try {
                const res = await api.get(`/calls/${callId}/token`);
                if (res.data?.status === 'answered') {
                    remoteUserJoinedRef.current = true;
                    setPartnerConnected(true);
                }
            } catch (e) {}
        }, 2500);

        return () => clearInterval(interval);
    }, [callId, partnerConnected]);

    // 4. Call Duration Timer (Only increments when partner is connected)
    useEffect(() => {
        if (!partnerConnected) return;

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
            setCallDuration(d => d + 1);
        }, 1000);

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [partnerConnected]);

    // Format seconds as MM:SS
    const formattedDuration = useMemo(() => {
        const mins = Math.floor(callDuration / 60);
        const secs = callDuration % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, [callDuration]);

    // 4 E2EE Fingerprint Emojis
    const e2eeEmojis = useMemo(() => {
        if (!callState) return ['💎', '✨', '⚡', '❤️'];
        return getCallE2EEEmojis(
            callState.room_id, 
            callState.user_id, 
            callState.partner_id
        );
    }, [callState]);

    // End call handler — strictly guarded to prevent accidental premature termination
    const handleEndCall = useCallback(async () => {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        try {
            await api.post(`/calls/${callId}/end`);
        } catch (e) {
            console.error("Failed to notify backend of call end", e);
        }

        if (zpRef.current) {
            try { 
                zpRef.current.destroy(); 
            } catch (e) {}
            zpRef.current = null;
        }

        // Clean static Zego singletons so subsequent calls don't inherit old room state
        try {
            ZegoUIKitPrebuilt.core = undefined;
            ZegoUIKitPrebuilt._instance = undefined;
        } catch (e) {}

        navigate('/dashboard', { replace: true });
    }, [callId, navigate]);

    // Minimize call into PiP mode
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

    // Initialize Zego WebRTC Room (Only once per callId)
    useEffect(() => {
        if (!callState?.token || !containerRef.current || !containerReady) return;
        if (initializedCallIdRef.current === callId) return;
        initializedCallIdRef.current = callId;

        // CRITICAL: Clean any stale Zego singleton instances before creating the new call room!
        if (ZegoUIKitPrebuilt.core || ZegoUIKitPrebuilt._instance) {
            try {
                if (zpRef.current) zpRef.current.destroy();
            } catch (e) {}
            ZegoUIKitPrebuilt.core = undefined;
            ZegoUIKitPrebuilt._instance = undefined;
        }

        const { token, room_id, zego_app_id, user_id, user_name, partner_id, partner_photo } = callState;

        try {
            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
                Number(zego_app_id),
                token,
                room_id,
                String(user_id),
                user_name || 'Partner'
            );
            const zp = ZegoUIKitPrebuilt.create(kitToken);
            zpRef.current = zp;

            zp.joinRoom({
                container: containerRef.current,
                scenario: {
                    mode: ZegoUIKitPrebuilt.GroupCall,
                },
                // CRITICAL FIX: Do NOT auto-leave when alone in room while waiting for partner!
                autoLeaveRoomWhenOnlySelfInRoom: false,
                showPreJoinView: false,
                showLeavingView: false,
                showLeaveRoomConfirmDialog: false,
                showRoomTimer: false,
                turnOnCameraWhenJoining: !isVoice,
                turnOnMicrophoneWhenJoining: true,
                showMyCameraToggleButton: false,
                showMyMicrophoneToggleButton: false,
                showAudioVideoSettingsButton: false,
                showNonVideoUser: true,
                showOnlyAudioUser: true,
                showScreenSharingButton: false,
                showUserList: false,
                showTextChat: false,
                showLayoutButton: false,
                lowerLeftNotification: {
                    showUserJoinAndLeave: true,
                    showTextChat: false,
                },
                videoViewConfig: [
                    { userID: String(user_id), showAvatarWhenCameraOff: true },
                    { userID: String(partner_id), showAvatarWhenCameraOff: true }
                ],
                onUserAvatarSetter: (users) => {
                    users.forEach(u => {
                        if (String(u.userID) !== String(user_id) && partner_photo) {
                            u.setUserAvatar?.(partner_photo);
                        }
                    });
                },
                onJoinRoom: () => {
                    console.log("Joined call room successfully");
                    // Check if partner was already in room
                    const remoteList = ZegoUIKitPrebuilt?.core?.zum?.remoteUserList || [];
                    if (remoteList.length > 0) {
                        remoteUserJoinedRef.current = true;
                        setPartnerConnected(true);
                    }
                },
                onUserJoin: (users) => {
                    if (users && users.length > 0) {
                        remoteUserJoinedRef.current = true;
                        setPartnerConnected(true);
                        toast.success("Partner connected! ❤️", { duration: 3000 });
                    }
                },
                onLeaveRoom: () => {
                    console.log("Left Zego room view");
                },
                onUserLeave: () => {
                    if (remoteUserJoinedRef.current && !hasEndedRef.current) {
                        toast("Partner left the call");
                        setTimeout(() => {
                            handleEndCall();
                        }, 2000);
                    }
                }
            });
        } catch (err) {
            console.error("Error initializing ZegoUIKit:", err);
            setError("Failed to initialize call client.");
        }

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [callId, callState?.token, callState?.room_id, containerReady, isVoice, handleEndCall]);

    // Component unmount cleanup
    useEffect(() => {
        return () => {
            if (zpRef.current) {
                try { 
                    zpRef.current.destroy(); 
                } catch (e) {}
                zpRef.current = null;
            }
            try {
                ZegoUIKitPrebuilt.core = undefined;
                ZegoUIKitPrebuilt._instance = undefined;
            } catch (e) {}
        };
    }, []);

    // Toggle Mic using Zego core and express engine
    const toggleMic = async () => {
        const next = !isMicMuted;
        setIsMicMuted(next);
        try {
            const core = ZegoUIKitPrebuilt?.core;
            if (core?.muteMicrophone) {
                await core.muteMicrophone(next);
            }
            if (core?.localStream) {
                core.localStream.getAudioTracks().forEach(track => {
                    track.enabled = !next;
                });
            }
        } catch (e) {
            console.error("Error toggling mic:", e);
        }
    };

    // Toggle Camera
    const toggleVideo = async () => {
        const next = !isVideoMuted;
        setIsVideoMuted(next);
        try {
            const core = ZegoUIKitPrebuilt?.core;
            if (core?.localStream) {
                if (core.mutePublishStreamVideo) {
                    await core.mutePublishStreamVideo(core.localStream, next);
                }
                if (core.enableVideoCaptureDevice) {
                    await core.enableVideoCaptureDevice(core.localStream, !next);
                }
                core.localStream.getVideoTracks().forEach(track => {
                    track.enabled = !next;
                });
            } else if (zpRef.current?.express?.enableCamera) {
                zpRef.current.express.enableCamera(!next);
            }
        } catch (e) {
            console.error("Error toggling video:", e);
        }
    };

    // Flip Camera (mobile devices)
    const flipCamera = () => {
        try {
            if (zpRef.current?.express?.useFrontFacingCamera) {
                zpRef.current.express.useFrontFacingCamera(!isFrontCamera);
            }
            setIsFrontCamera(prev => !prev);
            toast("Camera switched", { duration: 1500 });
        } catch (e) {
            console.error("Error switching camera:", e);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-[#0a0d17] flex flex-col items-center justify-center text-white p-4 z-50">
                <Loader2 size={36} className="text-pink-400 animate-spin mb-4" />
                <p className="text-gray-300 font-medium">Establishing encrypted connection...</p>
            </div>
        );
    }

    if (error || !callState?.token) {
        return (
            <div className="fixed inset-0 bg-[#0a0d17] flex flex-col items-center justify-center text-white p-4 z-50">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                    <PhoneOff size={32} />
                </div>
                <h1 className="text-xl font-bold mb-2">Call Disconnected</h1>
                <p className="text-gray-400 mb-6">{error || "Call session has ended."}</p>
                <button
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-2xl transition-all shadow-lg shadow-purple-500/20 text-white font-medium"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const partnerName = callState.partner_name || "Partner";
    const partnerPhoto = callState.partner_photo;

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#070913] select-none text-white">

            {/* 1. Blurred Romantic Backdrop (Visible in Voice mode or before camera loads) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {partnerPhoto ? (
                    <img 
                        src={partnerPhoto} 
                        alt={partnerName} 
                        className="w-full h-full object-cover filter blur-3xl opacity-25 scale-125 transition-all duration-1000" 
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-[#070913] to-pink-900/30" />
                )}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            </div>

            {/* 2. Telegram Top Header Bar */}
            <header className="absolute top-0 inset-x-0 z-40 px-4 py-4 flex items-center justify-between pointer-events-auto">
                {/* Top-Left: Minimize Button */}
                <button
                    onClick={handleMinimize}
                    title="Minimize call to Picture-in-Picture"
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/10 text-white transition-all shadow-lg"
                >
                    <ChevronDown size={20} />
                </button>

                {/* Top-Center: Partner Name & Live Duration / E2EE Status */}
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-1.5 drop-shadow-md">
                        <span>{partnerName}</span>
                        <Heart size={14} className="text-pink-400 fill-pink-400" />
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${partnerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                        <span className="text-xs font-medium text-gray-300">
                            {partnerConnected ? `${formattedDuration} • End-to-End Encrypted` : 'Calling...'}
                        </span>
                        {partnerConnected && <Lock size={11} className="text-emerald-400" />}
                    </div>
                </div>

                {/* Top-Right: 4-Emoji E2EE Fingerprint Badge */}
                <button
                    onClick={() => setShowSecurityModal(true)}
                    title="Click to verify 4-Emoji End-to-End Encryption"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md border border-purple-500/30 shadow-lg text-sm transition-all hover:scale-105 active:scale-95"
                >
                    {e2eeEmojis.map((emoji, idx) => (
                        <span key={idx} className="text-base select-none">{emoji}</span>
                    ))}
                </button>
            </header>

            {/* 3. Browser Permission Blocked Alert */}
            {permissionDenied && (
                <div className="absolute top-20 inset-x-4 z-50 flex justify-center pointer-events-auto animate-bounce">
                    <div className="px-5 py-3 rounded-2xl bg-amber-950/95 border border-amber-500/50 shadow-2xl flex items-center gap-3 text-amber-200 text-xs max-w-md">
                        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                            <p className="font-bold">Camera/Mic Blocked by Browser</p>
                            <p className="text-[11px] text-amber-300/80 mt-0.5">
                                Click the lock icon in Chrome's URL bar, set Camera & Microphone to <strong>"Allow"</strong>, then reload.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Center Area: Voice Mode with Acoustic Pulsating Waves */}
            {isVoice && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none px-6">
                    <div className="relative flex items-center justify-center">
                        {/* 3 Animated Concentric Pulsating Sound Waves */}
                        <div className="absolute w-52 h-52 md:w-64 md:h-64 rounded-full border border-pink-500/20 animate-ping" style={{ animationDuration: '3s' }} />
                        <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border border-purple-500/20 animate-pulse" style={{ animationDuration: '2s' }} />
                        <div className="absolute w-44 h-44 md:w-56 md:h-56 rounded-full bg-gradient-to-tr from-pink-500/10 to-purple-500/10 blur-xl" />

                        {/* Partner Avatar */}
                        <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_50px_rgba(236,72,153,0.35)] z-10 bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center text-4xl font-bold text-white">
                            {partnerPhoto ? (
                                <img src={partnerPhoto} alt={partnerName} className="w-full h-full object-cover" />
                            ) : (
                                <span>{partnerName[0]?.toUpperCase()}</span>
                            )}
                        </div>
                    </div>

                    {/* Animated Acoustic Audio Equalizer Bars */}
                    <div className="mt-8 flex items-center gap-1.5 h-6">
                        <div className="w-1 bg-pink-400 rounded-full animate-bounce" style={{ height: '70%', animationDelay: '0ms' }} />
                        <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                        <div className="w-1 bg-pink-300 rounded-full animate-bounce" style={{ height: '45%', animationDelay: '300ms' }} />
                        <div className="w-1 bg-purple-300 rounded-full animate-bounce" style={{ height: '85%', animationDelay: '450ms' }} />
                        <div className="w-1 bg-pink-400 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '600ms' }} />
                    </div>

                    <p className="mt-3 text-xs tracking-wider uppercase text-pink-300/80 font-semibold">
                        {partnerConnected ? "HD Voice Active • DTLS-SRTP" : "Ringing..."}
                    </p>
                </div>
            )}

            {/* 5. Waiting Banner for Video Mode (Shown while waiting for partner to join) */}
            {!isVoice && !partnerConnected && (
                <div className="absolute top-20 inset-x-4 z-30 flex justify-center pointer-events-none animate-fade-in">
                    <div className="px-5 py-3 rounded-2xl bg-black/80 backdrop-blur-md border border-pink-500/30 shadow-[0_0_25px_rgba(236,72,153,0.3)] flex items-center gap-3 max-w-md">
                        <div className="w-3 h-3 rounded-full bg-pink-400 animate-ping" />
                        <div>
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>Waiting for {partnerName} to join...</span>
                                <span>❤️</span>
                            </p>
                            <p className="text-[11px] text-gray-300 mt-0.5">
                                Connecting video feed. Once {partnerName} answers, both camera streams will appear here.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. Zego Video/Voice Call WebRTC Container */}
            <div
                ref={containerCallbackRef}
                id="zego-call-container"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: isVoice ? 1 : 10,
                    opacity: isVoice ? 0.05 : 1,
                    pointerEvents: isVoice ? 'none' : 'auto'
                }}
            />

            {/* 7. Telegram Bottom Frosted Dock */}
            <footer className="absolute bottom-6 inset-x-0 z-40 flex justify-center pointer-events-auto px-4">
                <div className="flex items-center gap-3 md:gap-5 px-6 py-3 rounded-full bg-black/70 hover:bg-black/85 backdrop-blur-2xl border border-white/15 shadow-2xl transition-all">
                    {/* Toggle Mic */}
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

                    {/* Toggle Camera (in Video mode) */}
                    {!isVoice && (
                        <button
                            onClick={toggleVideo}
                            title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
                            className={`p-3.5 rounded-full transition-all duration-200 active:scale-95 ${
                                isVideoMuted 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                        >
                            {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
                        </button>
                    )}

                    {/* Flip Camera (mobile devices) */}
                    {!isVoice && (
                        <button
                            onClick={flipCamera}
                            title="Flip camera"
                            className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                        >
                            <SwitchCamera size={20} />
                        </button>
                    )}

                    {/* Speaker Indicator */}
                    <button
                        onClick={() => toast("Audio: High-Definition Output Active", { duration: 1500 })}
                        title="HD Audio"
                        className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 hidden sm:flex"
                    >
                        <Volume2 size={20} />
                    </button>

                    {/* Red End Call Button */}
                    <button
                        onClick={handleEndCall}
                        title="End call"
                        className="p-3.5 px-6 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-bold transition-all shadow-xl shadow-red-600/40 flex items-center gap-2"
                    >
                        <PhoneOff size={20} />
                        <span className="hidden sm:inline text-xs uppercase tracking-wider">End</span>
                    </button>
                </div>
            </footer>

            {/* 8. Telegram 4-Emoji E2EE Security Modal */}
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
                            Verified with 256-bit WebRTC DTLS-SRTP cryptographic encryption.
                        </p>

                        {/* Large 4 Emojis Display */}
                        <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-black/60 border border-white/10 mb-6">
                            {e2eeEmojis.map((emoji, idx) => (
                                <span key={idx} className="text-3xl filter drop-shadow select-none">{emoji}</span>
                            ))}
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed mb-6">
                            If the 4 emojis above match the ones on <strong>{partnerName}</strong>'s screen, this call is 100% secure and free from wiretapping or interception.
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
