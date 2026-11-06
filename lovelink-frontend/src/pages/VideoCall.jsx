import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import api from '../api';
import toast from 'react-hot-toast';
import { PhoneOff, Loader2, ArrowLeft, Phone, Video, ShieldAlert } from 'lucide-react';

export default function VideoCall() {
    const { callId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const zpRef = useRef(null);
    const remoteUserJoinedRef = useRef(false);

    const [callState, setCallState] = useState(() => location.state || null);
    const [loading, setLoading] = useState(!location.state);
    const [error, setError] = useState(null);
    const [partnerConnected, setPartnerConnected] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('checking'); // 'checking' | 'granted' | 'prompt' | 'denied'

    const handleEndCall = useCallback(async () => {
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
        navigate("/dashboard", { replace: true });
    }, [callId, navigate]);

    // 1. Fetch credentials if not in location.state
    useEffect(() => {
        if (callState?.token) {
            setLoading(false);
            return;
        }

        api.get(`/calls/${callId}/token`)
            .then(res => {
                setCallState(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to retrieve call credentials:", err);
                setError("Unable to join or call expired.");
                setLoading(false);
            });
    }, [callId, callState]);

    // 2. Pre-check browser media permissions & trigger prompt if needed
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            const isVoice = (callState?.call_type === 'voice');
            navigator.mediaDevices.getUserMedia({ audio: true, video: !isVoice })
                .then(stream => {
                    setPermissionStatus('granted');
                    // Release the probe tracks immediately so Zego has full hardware access
                    stream.getTracks().forEach(track => track.stop());
                })
                .catch(err => {
                    console.warn("Media permission prompt or error:", err);
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setPermissionStatus('denied');
                    } else {
                        setPermissionStatus('granted'); // Device exists, Zego will attempt
                    }
                });
        }
    }, [callState?.call_type]);

    // 3. Initialize ZegoUIKit Room
    useEffect(() => {
        if (!callState?.token || !containerRef.current) return;

        const { token, room_id, zego_app_id, user_id, user_name, call_type } = callState;
        const isVoice = (call_type === 'voice');

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
                    mode: ZegoUIKitPrebuilt.OneONoneCall,
                },
                showPreJoinView: false,
                showLeavingView: false,
                showLeaveRoomConfirmDialog: false,
                showRoomTimer: true,
                turnOnCameraWhenJoining: !isVoice,
                turnOnMicrophoneWhenJoining: true,
                showCameraToggleButton: !isVoice,
                showMyCameraToggleButton: !isVoice,
                showMyMicrophoneToggleButton: true,
                showAudioVideoSettingsButton: true,
                showNonVideoUserPhoto: true,
                showScreenSharingButton: false,
                showUserList: false,
                showTextChat: false,
                showLayoutButton: false,
                lowerLeftNotification: {
                    showUserJoinAndLeave: true,
                    showTextChat: false,
                },
                sharedLinks: [],
                onJoinRoom: () => {
                    console.log("Joined call room successfully");
                },
                onUserJoin: (users) => {
                    if (users && users.length > 0) {
                        remoteUserJoinedRef.current = true;
                        setPartnerConnected(true);
                        toast.success("Partner connected! ❤️", { duration: 3000 });
                    }
                },
                onLeaveRoom: () => {
                    console.log("Left Zego room container");
                },
                onUserLeave: (users) => {
                    if (remoteUserJoinedRef.current) {
                        toast("Partner ended the call");
                        handleEndCall();
                    }
                }
            });
        } catch (err) {
            console.error("Error initializing ZegoUIKit:", err);
            setError("Failed to initialize call client.");
        }

        return () => {
            if (zpRef.current) {
                try { zpRef.current.destroy(); } catch (e) { }
                zpRef.current = null;
            }
        };
    }, [callState, handleEndCall]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-[#05080f] flex flex-col items-center justify-center text-white p-4 z-50">
                <Loader2 size={36} className="text-purple-400 animate-spin mb-4" />
                <p className="text-gray-300">Connecting to secure private call...</p>
            </div>
        );
    }

    if (error || !callState?.token) {
        return (
            <div className="fixed inset-0 bg-[#05080f] flex flex-col items-center justify-center text-white p-4 z-50">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                    <PhoneOff size={32} />
                </div>
                <h1 className="text-xl font-semibold mb-2">Call Disconnected</h1>
                <p className="text-gray-400 mb-6">{error || "Missing credentials or call state."}</p>
                <button
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl transition-all shadow-lg shadow-purple-500/20 text-white font-medium"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const isVoice = (callState?.call_type === 'voice');

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#05080f]">
            {/* Top Floating Header */}
            <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
                <button
                    onClick={handleEndCall}
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white text-xs font-semibold transition-all shadow-xl hover:scale-105"
                >
                    <ArrowLeft size={14} />
                    <span>Exit</span>
                </button>

                <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-purple-500/30 shadow-xl text-xs font-semibold text-purple-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    {isVoice ? (
                        <span className="flex items-center gap-1.5"><Phone size={13} className="text-emerald-400" /> Voice Call</span>
                    ) : (
                        <span className="flex items-center gap-1.5"><Video size={13} className="text-pink-400" /> Video Call</span>
                    )}
                </div>

                <button
                    onClick={handleEndCall}
                    className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-xl shadow-red-500/30 transition-all hover:scale-105"
                >
                    <PhoneOff size={14} />
                    <span>End</span>
                </button>
            </div>

            {/* Waiting for Partner Floating Banner (Only shown while alone in room) */}
            {!partnerConnected && (
                <div className="absolute top-20 inset-x-4 z-30 flex justify-center pointer-events-none animate-fade-in">
                    <div className="px-5 py-3 rounded-2xl bg-black/85 backdrop-blur-md border border-pink-500/30 shadow-[0_0_25px_rgba(236,72,153,0.3)] flex items-center gap-3 max-w-md">
                        <div className="w-3 h-3 rounded-full bg-pink-400 animate-ping" />
                        <div>
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>Waiting for your partner to join...</span>
                                <span>❤️</span>
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Your camera and audio are connected. As soon as your partner answers on their phone, both of your faces and voices will appear here!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Browser Permission Denied Warning Banner */}
            {permissionStatus === 'denied' && (
                <div className="absolute bottom-24 inset-x-4 z-30 flex justify-center pointer-events-auto">
                    <div className="px-5 py-3.5 rounded-2xl bg-amber-950/90 border border-amber-500/50 shadow-2xl flex items-center gap-3 text-amber-200 text-xs max-w-md">
                        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                            <p className="font-bold">Camera/Mic Permission Blocked by Browser</p>
                            <p className="text-[11px] text-amber-300/80 mt-0.5">
                                Click the lock/camera icon in Chrome's URL bar, set Camera & Microphone to "Allow", then refresh.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Zego Video Call Fullscreen Container (Guaranteed 100vw & 100vh) */}
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 10
                }}
            />
        </div>
    );
}
