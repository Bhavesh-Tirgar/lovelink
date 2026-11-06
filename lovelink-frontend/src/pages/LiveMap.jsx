import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SnapMap from '../components/SnapMap';
import api from '../api';

export default function LiveMap() {
    const navigate = useNavigate();
    const [user] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    });
    const coupleId = user?.couple_id || localStorage.getItem('couple_id');
    const [partnerUser, setPartnerUser] = useState(null);

    useEffect(() => {
        api.get('/dashboard').then(res => {
            if (res.data?.partner_user) {
                setPartnerUser(res.data.partner_user);
            }
        }).catch(() => {});
    }, []);

    return (
        <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden z-50 flex flex-col font-sans">
            {/* Top Navigation */}
            <header className="absolute top-4 left-4 z-20 flex items-center gap-3 pointer-events-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-3 rounded-2xl bg-black/75 hover:bg-black border border-white/20 text-white transition-all backdrop-blur-md flex items-center gap-2 text-xs font-semibold shadow-2xl"
                >
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>
            </header>

            {/* Fullscreen Snap Map */}
            <main className="w-full h-full">
                <SnapMap partner={partnerUser} coupleId={coupleId} isFullscreen={true} />
            </main>
        </div>
    );
}
