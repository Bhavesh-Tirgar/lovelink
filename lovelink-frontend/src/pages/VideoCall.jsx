import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import api from '../api';
import toast from 'react-hot-toast';
import { PhoneOff, Loader2, ArrowLeft, Phone, Video } from 'lucide-react';

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

    // Fallback: If page was reloaded or state was lost, fetch call credentials from backend
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
                // Skip pre-join device lobby so users connect directly
                showPreJoinView: false,
                // Do not display Zego's generic "Left Room" screen
                showLeavingView: false,
                // Do not display Zego's "End Room / Leave Room" confirmation dialog
                showLeaveRoomConfirmDialog: false,
                showRoomTimer: true,
                turnOnCameraWhenJoining: !isVoice,
                turnOnMicrophoneWhenJoining: true,
                showCameraToggleButton: !isVoice,
                showMyCameraToggleButton: !isVoice,
                showAudioVideoSettingsButton: false,
                showRoomDetailsButton: false,
                showScreenSharingButton: false,
                showUserList: false,
                showTextChat: false,
                showLayoutButton: false,
                lowerLeftNotification: {
                    showUserJoinAndLeave: false,
                    showTextChat: false,
                },
                sharedLinks: [],
                onJoinRoom: () => {
                    console.log("Joined call room successfully");
                },
                onUserJoin: (users) => {
                    if (users && users.length > 0) {
                        remoteUserJoinedRef.current = true;
                        toast.success("Partner connected! ❤️", { duration: 3000 });
                    }
                },
                onLeaveRoom: () => {
                    // Do not end call session on internal SDK leave events
                    console.log("Left Zego room container");
                },
                onUserLeave: (users) => {
                    // Only auto-cut if partner was actually in the call and left
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
            {/* Top Romantic Floating Controls */}
            <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
                <button
                    onClick={handleEndCall}
                    className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-medium transition-all shadow-lg"
                >
                    <ArrowLeft size={14} />
                    <span>Exit</span>
                </button>

                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-purple-500/20 shadow-lg text-xs font-medium text-purple-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {isVoice ? (
                        <span className="flex items-center gap-1.5"><Phone size={13} className="text-emerald-400" /> Voice Call</span>
                    ) : (
                        <span className="flex items-center gap-1.5"><Video size={13} className="text-pink-400" /> Video Call</span>
                    )}
                </div>

                <button
                    onClick={handleEndCall}
                    className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white text-xs font-semibold shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                >
                    <PhoneOff size={14} />
                    <span>End</span>
                </button>
            </div>

            {/* Zego Video Call Fullscreen Container */}
            <div
                className="w-full h-full"
                ref={containerRef}
            />
        </div>
    );
}
