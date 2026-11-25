import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Move, X, Sparkles } from 'lucide-react';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

export default function WatchCamBubble({ coupleId, myUser, partnerUser, sendWsMessage, onIncomingSync }) {
    const [active, setActive] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 80 }); // Top-right offset
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, startRight: 20, startTop: 80 });

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const pcRef = useRef(null);
    const pendingCandidatesRef = useRef([]);
    const pendingOfferRef = useRef(null);
    const [incomingCamInvite, setIncomingCamInvite] = useState(false);

    // 1. Cleanup media on unmount
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (pcRef.current) {
                pcRef.current.close();
            }
        };
    }, []);

    // 2. Handle incoming Watch Cam signaling over the watch party WebSocket
    useEffect(() => {
        if (!onIncomingSync) return;
        const data = onIncomingSync;

        if (data.type === 'watch_cam_join') {
            if (!active && !connecting) {
                setIncomingCamInvite(true);
            }
        } else if (data.type === 'watch_cam_offer') {
            if (active) {
                handleReceiveOffer(data.offer);
            } else {
                pendingOfferRef.current = data.offer;
                setIncomingCamInvite(true);
            }
        } else if (data.type === 'watch_cam_answer' && active) {
            handleReceiveAnswer(data.answer);
        } else if (data.type === 'watch_cam_candidate') {
            handleReceiveCandidate(data.candidate);
        } else if (data.type === 'watch_cam_leave') {
            pendingOfferRef.current = null;
            setIncomingCamInvite(false);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onIncomingSync, active]);

    const startCam = async () => {
        setConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: true
            });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Create WebRTC Peer Connection
            const pc = new RTCPeerConnection(ICE_SERVERS);
            pcRef.current = pc;

            // Add local tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Remote track handler
            pc.ontrack = (event) => {
                if (remoteVideoRef.current && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // ICE Candidate handler
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sendWsMessage({
                        type: 'watch_cam_candidate',
                        candidate: event.candidate
                    });
                }
            };

            // Answer partner's buffered offer if they started Watch Cam first; otherwise create fresh offer
            if (pendingOfferRef.current) {
                const offer = pendingOfferRef.current;
                pendingOfferRef.current = null;
                await handleReceiveOffer(offer);
            } else {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                sendWsMessage({
                    type: 'watch_cam_offer',
                    offer: offer
                });
            }

            setIncomingCamInvite(false);
            setActive(true);
            setConnecting(false);
        } catch (e) {
            console.error("Camera access failed", e);
            setConnecting(false);
        }
    };

    const stopCam = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        sendWsMessage({ type: 'watch_cam_leave' });
        setActive(false);
    };

    const handleReceiveOffer = async (offer) => {
        if (!pcRef.current) {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            pcRef.current = pc;
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
            }
            pc.ontrack = (event) => {
                if (remoteVideoRef.current && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sendWsMessage({ type: 'watch_cam_candidate', candidate: event.candidate });
                }
            };
        }

        const pc = pcRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process pending candidates
        while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            try { await pc.addIceCandidate(cand); } catch (e) {}
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendWsMessage({
            type: 'watch_cam_answer',
            answer: answer
        });
    };

    const handleReceiveAnswer = async (answer) => {
        if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const handleReceiveCandidate = async (candidate) => {
        const iceCandidate = new RTCIceCandidate(candidate);
        if (pcRef.current && pcRef.current.remoteDescription) {
            try { await pcRef.current.addIceCandidate(iceCandidate); } catch (e) {}
        } else {
            pendingCandidatesRef.current.push(iceCandidate);
        }
    };

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleCam = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCamOff(!videoTrack.enabled);
            }
        }
    };

    // Unified Pointer/Touch Drag handlers (ref-backed so fast first move is never dropped before re-render)
    const handlePointerDown = (e) => {
        if (e.target.closest('button')) return;
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            startRight: position.x,
            startTop: position.y,
        };
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!isDraggingRef.current) return;
            const dx = dragStartRef.current.x - e.clientX;
            const dy = e.clientY - dragStartRef.current.y;
            setPosition({
                x: Math.max(10, Math.min(window.innerWidth - 180, dragStartRef.current.startRight + dx)),
                y: Math.max(10, Math.min(window.innerHeight - 240, dragStartRef.current.startTop + dy))
            });
        };

        const handlePointerUp = () => {
            isDraggingRef.current = false;
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, []);

    if (!active) {
        return (
            <button
                onClick={startCam}
                disabled={connecting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg ${
                    incomingCamInvite
                        ? 'bg-emerald-500/30 hover:bg-emerald-500/50 border-emerald-400/60 text-emerald-100 animate-pulse shadow-emerald-500/20'
                        : 'bg-pink-600/30 hover:bg-pink-600/50 border-pink-500/40 text-pink-200 shadow-pink-600/20'
                }`}
                title="Start Face-to-Face Video Bubble over cinema"
            >
                <Video size={14} className={connecting ? "animate-spin" : "text-pink-400"} />
                <span>{connecting ? "Starting Cam..." : incomingCamInvite ? "Join Partner Cam" : "Live Cam Bubble"}</span>
            </button>
        );
    }

    return (
        <aside
            aria-label="Floating Video Call Bubble"
            className="fixed z-50 select-none animate-fade-in touch-none"
            style={{ top: `${position.y}px`, right: `${position.x}px` }}
        >
            <div className="relative w-44 rounded-3xl bg-black/85 backdrop-blur-xl border border-pink-500/40 p-2 shadow-2xl shadow-pink-950/60 overflow-hidden">
                {/* Drag handle header */}
                <div 
                    onPointerDown={handlePointerDown}
                    className="flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-white transition"
                >
                    <div className="flex items-center gap-1 text-[10px] font-bold text-pink-300">
                        <Sparkles size={11} className="text-pink-400" />
                        <span>Watch Cam</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Move size={12} className="text-gray-400" />
                        <button 
                            onClick={stopCam}
                            className="p-0.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>

                {/* Partner Video Viewport */}
                <div className="relative w-full h-36 rounded-2xl bg-black/90 overflow-hidden border border-white/10 mb-2">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    
                    {/* Partner avatar fallback if video track not arrived yet */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none -z-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs mb-1">
                            {partnerUser?.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <span className="text-[10px] text-gray-300">{partnerUser?.name || 'Partner'}</span>
                    </div>

                    {/* Local pip mini video in corner */}
                    <div className="absolute bottom-1.5 right-1.5 w-12 h-16 rounded-xl bg-black border border-pink-500/40 overflow-hidden shadow-lg z-10">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover scale-x-[-1]"
                        />
                    </div>
                </div>

                {/* Quick In-Bubble Media Controls */}
                <div className="flex items-center justify-center gap-2 py-1">
                    <button
                        onClick={toggleMic}
                        className={`p-2 rounded-xl transition ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                    <button
                        onClick={toggleCam}
                        className={`p-2 rounded-xl transition ${isCamOff ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                        {isCamOff ? <VideoOff size={14} /> : <Video size={14} />}
                    </button>
                    <button
                        onClick={stopCam}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-500 transition shadow"
                    >
                        Close
                    </button>
                </div>
            </div>
        </aside>
    );
}
