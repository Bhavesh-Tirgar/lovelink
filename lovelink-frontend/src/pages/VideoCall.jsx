import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import api from '../api';
import toast from 'react-hot-toast';
import { PhoneOff, Loader2 } from 'lucide-react';

export default function VideoCall() {
    const { callId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const zpRef = useRef(null);

    const [callState, setCallState] = useState(() => location.state || null);
    const [loading, setLoading] = useState(!location.state);
    const [error, setError] = useState(null);

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
                showPreJoinView: false,
                turnOnCameraWhenJoining: !isVoice,
                turnOnMicrophoneWhenJoining: true,
                showCameraToggleButton: !isVoice,
                showMyCameraToggleButton: !isVoice,
                showAudioVideoSettingsButton: true,
                showRoomDetailsButton: false,
                showScreenSharingButton: false,
                onLeaveRoom: async () => {
                    try {
                        await api.post(`/calls/${callId}/end`);
                    } catch (e) {
                        console.error("Failed to notify backend of call end");
                    }
                    navigate("/dashboard");
                },
                onUserLeave: () => {
                    toast("Partner has left the call");
                }
            });
        } catch (err) {
            console.error("Error initializing ZegoUIKit:", err);
            setError("Failed to initialize video call client.");
        }

        return () => {
            if (zpRef.current) {
                try { zpRef.current.destroy(); } catch (e) { }
                zpRef.current = null;
            }
        };
    }, [callState, callId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#05080f] flex flex-col items-center justify-center text-white p-4">
                <Loader2 size={36} className="text-purple-400 animate-spin mb-4" />
                <p className="text-gray-300">Connecting to secure video room...</p>
            </div>
        );
    }

    if (error || !callState?.token) {
        return (
            <div className="min-h-screen bg-[#05080f] flex flex-col items-center justify-center text-white p-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                    <PhoneOff size={32} />
                </div>
                <h1 className="text-xl font-semibold mb-2">Call Disconnected</h1>
                <p className="text-gray-400 mb-6">{error || "Missing credentials or call state."}</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl transition-all shadow-lg shadow-purple-500/20"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div
            className="bg-[#05080f]"
            ref={containerRef}
            style={{ width: "100vw", height: "100vh" }}
        />
    );
}
