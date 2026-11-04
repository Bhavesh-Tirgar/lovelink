import React, { useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import api from '../api';
import toast from 'react-hot-toast';
import { PhoneOff } from 'lucide-react';

export default function VideoCall() {
    const { callId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const { token, room_id, zego_app_id, user_id, user_name } = location.state || {};

    useEffect(() => {
        if (!token || !containerRef.current) return;

        // Initialize ZegoUIKitPrebuilt
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
            zego_app_id, token, room_id, user_id, user_name
        );
        const zp = ZegoUIKitPrebuilt.create(kitToken);

        zp.joinRoom({
            container: containerRef.current,
            scenario: {
                mode: ZegoUIKitPrebuilt.OneONoneCall,
            },
            showPreJoinView: false,
            turnOnCameraWhenJoining: true,
            turnOnMicrophoneWhenJoining: true,
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

        return () => {
            zp.destroy();
        };
    }, [token, callId, navigate]);

    // Guard against direct URL access without state
    if (!token) {
        return (
            <div className="min-h-screen bg-[#05080f] flex flex-col items-center justify-center text-white p-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                    <PhoneOff size={32} />
                </div>
                <h1 className="text-xl font-semibold mb-2">Call Failed</h1>
                <p className="text-gray-400 mb-6">Missing credentials or call state.</p>
                <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">Return to Dashboard</button>
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
