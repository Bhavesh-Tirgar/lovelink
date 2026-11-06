import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import api from '../api';
import toast from 'react-hot-toast';
import { Loader2, PhoneOff, ShieldAlert } from 'lucide-react';

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
    const [permissionDenied, setPermissionDenied] = useState(false);

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

    // 1. Fetch credentials if missing (e.g. reload or direct URL)
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

    // 2. Pre-check Camera/Microphone permissions with the browser
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            const isVoice = (callState?.call_type === 'voice');
            navigator.mediaDevices.getUserMedia({ audio: true, video: !isVoice })
                .then(stream => {
                    setPermissionDenied(false);
                    // Stop probe tracks so Zego can claim the hardware cleanly
                    stream.getTracks().forEach(track => track.stop());
                })
                .catch(err => {
                    console.warn("Browser media access error:", err);
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setPermissionDenied(true);
                    }
                });
        }
    }, [callState?.call_type]);

    // 3. Initialize ZegoUIKit using GroupCall mode (renders grid layout with your face immediately!)
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
                    // GroupCall mode ensures you see YOUR OWN camera feed immediately,
                    // and as soon as partner joins, splits into a responsive side-by-side grid!
                    mode: ZegoUIKitPrebuilt.GroupCall,
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
                        toast.success("Partner joined call! ❤️", { duration: 3000 });
                    }
                },
                onLeaveRoom: () => {
                    console.log("Left Zego room container");
                    handleEndCall();
                },
                onUserLeave: (users) => {
                    if (remoteUserJoinedRef.current) {
                        toast("Partner left the call");
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

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black">
            {/* Camera & Mic Permission Blocked Alert */}
            {permissionDenied && (
                <div className="absolute top-4 inset-x-4 z-50 flex justify-center pointer-events-auto">
                    <div className="px-5 py-3 rounded-2xl bg-amber-950/95 border border-amber-500/50 shadow-2xl flex items-center gap-3 text-amber-200 text-xs max-w-md">
                        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                            <p className="font-bold">Camera/Microphone Blocked by Browser</p>
                            <p className="text-[11px] text-amber-300/80 mt-0.5">
                                Please click the lock or camera icon in Chrome's URL bar, set Camera & Microphone to <strong>"Allow"</strong>, then reload.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Zego Call Container: Direct full viewport mount */}
            <div
                ref={containerRef}
                style={{
                    width: '100vw',
                    height: '100vh',
                }}
            />
        </div>
    );
}
