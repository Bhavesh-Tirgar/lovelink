import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Battery, BatteryCharging, BatteryWarning, Navigation, RefreshCw, Heart, Radio } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function LoveRadarWidget({ partner, coupleId }) {
    const [myBattery, setMyBattery] = useState({ level: null, charging: null });
    const [myCoords, setMyCoords] = useState(null);
    const [partnerStatus, setPartnerStatus] = useState(null);
    const [distanceKm, setDistanceKm] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSharingLocation, setIsSharingLocation] = useState(() => {
        try {
            return localStorage.getItem('lovelink_share_location') !== 'false';
        } catch {
            return true;
        }
    });
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const batteryObjRef = useRef(null);

    // 1. Fetch & Monitor Local Device Battery
    useEffect(() => {
        let isMounted = true;
        if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
            navigator.getBattery().then((battery) => {
                if (!isMounted) return;
                batteryObjRef.current = battery;
                const updateBat = () => {
                    setMyBattery({
                        level: Math.round(battery.level * 100),
                        charging: battery.charging
                    });
                };
                updateBat();
                battery.addEventListener('levelchange', updateBat);
                battery.addEventListener('chargingchange', updateBat);
            }).catch(() => {
                // Battery API not supported or denied
            });
        }
        return () => {
            isMounted = false;
        };
    }, []);

    // 2. Fetch Partner Status from Backend
    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get('/dashboard/status');
            if (res.data) {
                if (res.data.partner_status) {
                    setPartnerStatus(res.data.partner_status);
                }
                if (res.data.distance_km !== undefined) {
                    setDistanceKm(res.data.distance_km);
                }
                setLastSyncTime(new Date());
            }
        } catch (e) {
            console.error("Could not fetch partner live status", e);
        }
    }, []);

    // 3. Send My Live Status (Location & Battery)
    const sendMyStatus = useCallback(async (manual = false) => {
        setLoading(true);
        let currentCoords = myCoords;

        // Try getting fresh location if user enabled sharing
        if (isSharingLocation && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 10000,
                        enableHighAccuracy: false
                    });
                });
                if (pos?.coords) {
                    currentCoords = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    };
                    setMyCoords(currentCoords);
                }
            } catch (err) {
                if (manual) {
                    toast("Location permission is optional. Battery status will still sync!", { icon: '📍' });
                }
            }
        }

        const payload = {
            latitude: isSharingLocation ? currentCoords?.latitude : null,
            longitude: isSharingLocation ? currentCoords?.longitude : null,
            battery_level: myBattery.level,
            is_charging: myBattery.charging,
            device_label: typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'Phone' : 'Computer'
        };

        try {
            const res = await api.post('/dashboard/status', payload);
            if (res.data) {
                if (res.data.partner_status) {
                    setPartnerStatus(res.data.partner_status);
                }
                if (res.data.distance_km !== undefined) {
                    setDistanceKm(res.data.distance_km);
                }
                setLastSyncTime(new Date());
                if (manual) {
                    toast.success("Live status synced with your partner! 💖");
                }
            }
        } catch (e) {
            console.error("Failed to post status", e);
            if (manual) toast.error("Could not sync live status");
        } finally {
            setLoading(false);
        }
    }, [isSharingLocation, myCoords, myBattery]);

    // Initial fetch and periodic auto-sync every 45s
    useEffect(() => {
        fetchStatus();
        const timer = setTimeout(() => {
            sendMyStatus(false);
        }, 1200);

        const interval = setInterval(() => {
            sendMyStatus(false);
        }, 45000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [fetchStatus, sendMyStatus]);

    const toggleLocationSharing = () => {
        const next = !isSharingLocation;
        setIsSharingLocation(next);
        try {
            localStorage.setItem('lovelink_share_location', String(next));
        } catch {}
        if (next) {
            toast.success("Location sharing enabled 📍");
        } else {
            toast("Location sharing paused 🛡️");
        }
    };

    const partnerName = partner?.name || "Partner";
    const partnerBattery = partnerStatus?.battery_level;
    const partnerCharging = partnerStatus?.is_charging;

    const formatDistance = (km) => {
        if (km === null || km === undefined) return null;
        if (km < 0.2) return "Right next to each other! ❤️";
        if (km < 1) return `${Math.round(km * 1000)} meters away`;
        return `${km.toLocaleString()} km away`;
    };

    const getBatteryColor = (level, charging) => {
        if (charging) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
        if (level === null || level === undefined) return 'text-gray-400 border-white/10 bg-white/5';
        if (level <= 20) return 'text-rose-400 border-rose-500/40 bg-rose-500/10 animate-pulse';
        if (level <= 45) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    };

    return (
        <div className="glass-card p-6 md:p-7 relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-950/30 via-black/40 to-pink-950/20 shadow-xl">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="relative">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block animate-ping absolute" />
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block relative" />
                    </div>
                    <h3 className="text-sm font-bold tracking-wide uppercase text-white flex items-center gap-2">
                        <span>Where is My Love?</span>
                        <span className="text-pink-400">📍</span>
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => sendMyStatus(true)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                        title="Sync live status now"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-pink-400' : ''}`} />
                        <span>{loading ? 'Syncing...' : 'Sync'}</span>
                    </button>
                </div>
            </div>

            {/* Main Grid: Distance & Partner Battery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* 1. Distance Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300/80 flex items-center gap-1.5">
                            <Navigation className="w-3.5 h-3.5 text-purple-400" />
                            Live Distance
                        </span>
                        {distanceKm !== null && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Realtime
                            </span>
                        )}
                    </div>

                    <div className="my-2">
                        {distanceKm !== null ? (
                            <div>
                                <p className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-white">
                                    {formatDistance(distanceKm)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                                    <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/40 inline animate-pulse" />
                                    {distanceKm < 0.2 ? "Together in the same room!" : "Connected by heart across every mile."}
                                </p>
                            </div>
                        ) : (
                            <div className="py-2">
                                <p className="text-sm font-semibold text-gray-300">
                                    {isSharingLocation ? "Syncing coordinates..." : "Location sharing paused"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {partner?.city ? `Partner's registered city: ${partner.city}` : "Enable location sharing to see exact distance"}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                            <Radio className="w-3 h-3 text-pink-400 animate-pulse" />
                            {isSharingLocation ? "Location active" : "Location paused"}
                        </span>
                        <button
                            onClick={toggleLocationSharing}
                            className="text-pink-400 hover:text-pink-300 font-semibold underline"
                        >
                            {isSharingLocation ? "Pause" : "Share"}
                        </button>
                    </div>
                </div>

                {/* 2. Partner Battery Status Card */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${getBatteryColor(partnerBattery, partnerCharging)}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                            {partnerCharging ? (
                                <BatteryCharging className="w-4 h-4 text-emerald-400 animate-bounce" />
                            ) : partnerBattery !== null && partnerBattery <= 20 ? (
                                <BatteryWarning className="w-4 h-4 text-rose-400" />
                            ) : (
                                <Battery className="w-4 h-4 text-gray-300" />
                            )}
                            {partnerName}'s Battery
                        </span>
                        {partnerCharging && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                                ⚡ Charging
                            </span>
                        )}
                    </div>

                    <div className="my-2">
                        {partnerBattery !== null && partnerBattery !== undefined ? (
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                        {partnerBattery}%
                                    </span>
                                    {partnerCharging && (
                                        <span className="text-xs font-bold text-emerald-300">
                                            Plugged in ⚡
                                        </span>
                                    )}
                                </div>

                                {/* Visual Battery Gauge */}
                                <div className="w-full h-2.5 rounded-full bg-black/40 border border-white/10 mt-3 p-0.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${
                                            partnerCharging
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                                : partnerBattery <= 20
                                                ? 'bg-gradient-to-r from-rose-600 to-red-500'
                                                : partnerBattery <= 50
                                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(5, partnerBattery))}%` }}
                                    />
                                </div>

                                <p className="text-xs text-gray-300 mt-2 font-medium">
                                    {partnerBattery <= 20
                                        ? "🪫 Low battery! Phone might die soon — send them love!"
                                        : partnerCharging
                                        ? "Phone is getting juiced up ⚡"
                                        : "Phone has plenty of charge 🔋"}
                                </p>
                            </div>
                        ) : (
                            <div className="py-2">
                                <p className="text-sm font-semibold text-gray-300">
                                    Waiting for {partnerName}'s status
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Status updates automatically whenever they open LoveLink.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <span>
                            {myBattery.level !== null ? `Your battery: ${myBattery.level}% ${myBattery.charging ? '⚡' : ''}` : "Your device connected"}
                        </span>
                        <span>
                            {lastSyncTime ? `${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
