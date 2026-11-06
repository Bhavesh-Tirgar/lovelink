import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Crosshair, Users, MapPin, Layers } from 'lucide-react';
import api from '../api';
import { getWsBaseUrl } from '../utils/wsUrl';

export default function SnapMap({ partner, coupleId, isFullscreen = false }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const myMarkerRef = useRef(null);
    const partnerMarkerRef = useRef(null);
    const lineRef = useRef(null);
    const distanceBadgeRef = useRef(null);
    const wsRef = useRef(null);
    const watchIdRef = useRef(null);

    const [user] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    });
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const [myLocation, setMyLocation] = useState(null);
    const [partnerLocation, setPartnerLocation] = useState(null);
    const [myBattery, setMyBattery] = useState({ level: null, charging: null });
    const [partnerBattery, setPartnerBattery] = useState({ level: null, charging: null });
    const [distanceKm, setDistanceKm] = useState(null);
    const [partnerAddress, setPartnerAddress] = useState('');
    const [mapTheme, setMapTheme] = useState('dark'); // 'dark' | 'satellite' | 'voyager'
    const tileLayerRef = useRef(null);

    const partnerName = partner?.name || "Partner";
    const myName = user?.name || "You";

    // 1. Calculate distance between two lat/lng points
    const calcDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 10) / 10;
    };

    // 2. Battery monitoring
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
            navigator.getBattery().then(bat => {
                const update = () => {
                    setMyBattery({
                        level: Math.round(bat.level * 100),
                        charging: bat.charging
                    });
                };
                update();
                bat.addEventListener('levelchange', update);
                bat.addEventListener('chargingchange', update);
            }).catch(() => {});
        }
    }, []);

    // 3. Reverse Geocode helper
    const reverseGeocode = async (lat, lng, isPartner = false) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`, {
                headers: { 'Accept-Language': 'en' }
            });
            const data = await res.json();
            const place = data?.address?.suburb || data?.address?.city || data?.address?.town || data?.address?.county || data?.display_name?.split(',')[0];
            if (place && isPartner) {
                setPartnerAddress(place);
            }
        } catch {}
    };

    // 4. Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [20.5937, 78.9629], // Default center
            zoom: 5,
            zoomControl: false,
            attributionControl: false
        });

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // 4b. Update Tile Layer when mapTheme changes
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
            tileLayerRef.current = null;
        }

        const cartoKey = 'cb1_53pa_1_5a018e2cbb4fe0260c5d225c';
        let newLayer;

        if (mapTheme === 'satellite') {
            // High-detail Satellite Hybrid: Real 3D buildings, rooftops, houses & streets from aerial imagery
            newLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                attribution: '© Google Satellite Hybrid'
            });
        } else if (mapTheme === 'voyager') {
            // Clean CartoDB Voyager
            newLayer = L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`, {
                maxZoom: 19,
                subdomains: 'abcd',
            });
        } else {
            // Default: CartoDB Dark Matter with building footprints, dark roads & neon highlights
            newLayer = L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoKey}`, {
                maxZoom: 19,
                subdomains: 'abcd',
            });
        }

        newLayer.addTo(map);
        tileLayerRef.current = newLayer;
    }, [mapTheme]);

    // 5. Create Custom Avatar Icon
    const createAvatarIcon = (name, photo, isUser, battery) => {
        const borderGradient = isUser ? 'from-pink-500 to-rose-500' : 'from-purple-500 to-cyan-400';
        const pingColor = isUser ? 'bg-pink-500' : 'bg-cyan-400';
        const batteryText = battery?.level !== null && battery?.level !== undefined ? `${battery.level}%${battery.charging ? ' ⚡' : ''}` : '';

        const html = `
            <div class="relative flex flex-col items-center select-none" style="transform: translate(-50%, -100%);">
                <!-- Floating Battery Pill -->
                ${batteryText ? `
                    <div class="mb-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-black/80 text-white border border-white/20 shadow-lg flex items-center gap-1 backdrop-blur-md">
                        <span class="${battery?.charging ? 'text-emerald-400' : battery?.level <= 20 ? 'text-rose-400' : 'text-yellow-300'}">●</span>
                        <span>${batteryText}</span>
                    </div>
                ` : ''}

                <!-- Glowing Avatar with Pulsing Radar Rings -->
                <div class="relative">
                    <span class="absolute -inset-2 rounded-full ${pingColor} opacity-40 animate-ping"></span>
                    <div class="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr ${borderGradient} shadow-[0_0_20px_rgba(236,72,153,0.6)]">
                        <div class="w-full h-full rounded-full bg-black/60 overflow-hidden flex items-center justify-center text-xl">
                            ${photo ? `<img src="${photo}" class="w-full h-full object-cover" />` : (isUser ? '💖' : '💑')}
                        </div>
                    </div>
                </div>

                <!-- Name Tag -->
                <div class="mt-1 px-2.5 py-0.5 rounded-full bg-black/85 text-[11px] font-bold text-white border border-white/20 shadow-xl whitespace-nowrap">
                    ${name}
                </div>
            </div>
        `;

        return L.divIcon({
            html,
            className: 'snap-map-avatar-icon',
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        });
    };

    // 6. WebSocket Live Connection
    useEffect(() => {
        if (!coupleId || !token) return;

        let ws = null;
        let isAlive = true;

        const connectWs = () => {
            const wsBase = getWsBaseUrl();
            ws = new WebSocket(`${wsBase}/ws/chat/${coupleId}?token=${token}`);
            wsRef.current = ws;

            ws.onmessage = (e) => {
                if (!isAlive) return;
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'location_update') {
                        if (data.latitude && data.longitude) {
                            const newLoc = { lat: Number(data.latitude), lng: Number(data.longitude) };
                            setPartnerLocation(newLoc);
                            reverseGeocode(newLoc.lat, newLoc.lng, true);
                        }
                        if (data.battery_level !== undefined) {
                            setPartnerBattery({
                                level: data.battery_level,
                                charging: Boolean(data.is_charging)
                            });
                        }
                    }
                } catch {}
            };

            ws.onclose = () => {
                if (isAlive) setTimeout(connectWs, 3000);
            };
        };

        connectWs();

        return () => {
            isAlive = false;
            if (wsRef.current) wsRef.current.close();
        };
    }, [coupleId, token]);

    // 7. Initial Fetch from backend
    useEffect(() => {
        api.get('/dashboard/status').then(res => {
            if (res.data?.partner_status?.latitude && res.data?.partner_status?.longitude) {
                const pLoc = {
                    lat: Number(res.data.partner_status.latitude),
                    lng: Number(res.data.partner_status.longitude)
                };
                setPartnerLocation(pLoc);
                reverseGeocode(pLoc.lat, pLoc.lng, true);
            }
            if (res.data?.partner_status?.battery_level !== undefined) {
                setPartnerBattery({
                    level: res.data.partner_status.battery_level,
                    charging: Boolean(res.data.partner_status.is_charging)
                });
            }
        }).catch(() => {});
    }, []);

    // 8. Live GPS Tracking (Updates every few seconds)
    useEffect(() => {
        if (!navigator.geolocation) return;

        const handleSuccess = (pos) => {
            const { latitude, longitude, speed, heading } = pos.coords;
            const newLoc = { lat: latitude, lng: longitude };
            setMyLocation(newLoc);
            reverseGeocode(latitude, longitude, false);

            // Send to partner over WebSocket in real time!
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'location_update',
                    latitude,
                    longitude,
                    battery_level: myBattery.level,
                    is_charging: myBattery.charging,
                    speed,
                    heading
                }));
            }

            // Also persist to backend status store
            api.post('/dashboard/status', {
                latitude,
                longitude,
                battery_level: myBattery.level,
                is_charging: myBattery.charging
            }).catch(() => {});
        };

        const handleError = (err) => {
            console.log("GPS watch error", err);
        };

        watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 10000
        });

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [myBattery]);

    // 9. Update Leaflet Map Markers & Connecting Love Line
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // User Marker
        if (myLocation) {
            const icon = createAvatarIcon(myName, user?.photo_url, true, myBattery);
            if (!myMarkerRef.current) {
                myMarkerRef.current = L.marker([myLocation.lat, myLocation.lng], { icon }).addTo(map);
            } else {
                myMarkerRef.current.setLatLng([myLocation.lat, myLocation.lng]);
                myMarkerRef.current.setIcon(icon);
            }
        }

        // Partner Marker
        if (partnerLocation) {
            const icon = createAvatarIcon(partnerName, partner?.photo_url, false, partnerBattery);
            if (!partnerMarkerRef.current) {
                partnerMarkerRef.current = L.marker([partnerLocation.lat, partnerLocation.lng], { icon }).addTo(map);
            } else {
                partnerMarkerRef.current.setLatLng([partnerLocation.lat, partnerLocation.lng]);
                partnerMarkerRef.current.setIcon(icon);
            }
        }

        // Connecting Love Line & Midpoint Distance Badge
        if (myLocation && partnerLocation) {
            const dist = calcDistance(myLocation.lat, myLocation.lng, partnerLocation.lat, partnerLocation.lng);
            setDistanceKm(dist);

            const latlngs = [
                [myLocation.lat, myLocation.lng],
                [partnerLocation.lat, partnerLocation.lng]
            ];

            if (!lineRef.current) {
                lineRef.current = L.polyline(latlngs, {
                    color: '#ec4899',
                    weight: 3,
                    dashArray: '8, 8',
                    opacity: 0.8
                }).addTo(map);
            } else {
                lineRef.current.setLatLngs(latlngs);
            }

            // Midpoint badge
            const midLat = (myLocation.lat + partnerLocation.lat) / 2;
            const midLng = (myLocation.lng + partnerLocation.lng) / 2;

            const distHtml = `
                <div class="px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-extrabold text-[11px] shadow-2xl border border-white/30 whitespace-nowrap animate-pulse flex items-center gap-1.5" style="transform: translate(-50%, -50%);">
                    <span>❤️</span>
                    <span>${dist < 0.2 ? 'Together!' : `${dist} km apart`}</span>
                </div>
            `;
            const badgeIcon = L.divIcon({ html: distHtml, className: 'dist-badge-icon', iconSize: [0, 0] });

            if (!distanceBadgeRef.current) {
                distanceBadgeRef.current = L.marker([midLat, midLng], { icon: badgeIcon }).addTo(map);
            } else {
                distanceBadgeRef.current.setLatLng([midLat, midLng]);
                distanceBadgeRef.current.setIcon(badgeIcon);
            }
        }
    }, [myLocation, partnerLocation, myBattery, partnerBattery, myName, partnerName, user?.photo_url, partner?.photo_url]);

    // Camera Centering Controls
    const fitBoth = () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        if (myLocation && partnerLocation) {
            map.fitBounds([
                [myLocation.lat, myLocation.lng],
                [partnerLocation.lat, partnerLocation.lng]
            ], { padding: [60, 60], maxZoom: 15 });
        } else if (myLocation) {
            map.setView([myLocation.lat, myLocation.lng], 14);
        } else if (partnerLocation) {
            map.setView([partnerLocation.lat, partnerLocation.lng], 14);
        }
    };

    const centerOnMe = () => {
        if (mapInstanceRef.current && myLocation) {
            mapInstanceRef.current.flyTo([myLocation.lat, myLocation.lng], 15, { duration: 1 });
        }
    };

    const centerOnPartner = () => {
        if (mapInstanceRef.current && partnerLocation) {
            mapInstanceRef.current.flyTo([partnerLocation.lat, partnerLocation.lng], 15, { duration: 1 });
        }
    };

    return (
        <div className={`relative w-full rounded-3xl overflow-hidden border border-purple-500/30 shadow-2xl bg-[#090b14] ${isFullscreen ? 'h-full' : 'h-[360px] sm:h-[420px]'}`}>
            {/* Map Container */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Top Bar Overlay */}
            <div className="absolute top-4 inset-x-4 z-10 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 border border-white/15 backdrop-blur-md shadow-xl pointer-events-auto">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                    <span className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                        <span>Snap Map Live</span>
                        <span className="text-pink-400">📍</span>
                    </span>
                    {distanceKm !== null && (
                        <span className="ml-1 pl-2 border-l border-white/20 text-xs text-pink-300 font-extrabold">
                            {distanceKm < 0.2 ? 'Together! ❤️' : `${distanceKm} km`}
                        </span>
                    )}
                </div>

                {/* Live GPS Active Pill */}
                <div className="px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-medium text-gray-300 backdrop-blur-md hidden sm:flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-pink-400 animate-pulse" />
                    <span>Real-time GPS • Updates live</span>
                </div>
            </div>

            {/* Bottom Bar: Locations & Battery Quick Info */}
            <div className="absolute bottom-4 inset-x-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-none">
                {/* Place info */}
                <div className="px-4 py-2 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-md shadow-xl text-xs text-white pointer-events-auto flex items-center gap-3">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-pink-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {partnerName}
                        </p>
                        <p className="font-semibold text-gray-200">
                            {partnerAddress || (partnerLocation ? "Location shared" : "Waiting for partner's GPS...")}
                        </p>
                    </div>
                </div>

                {/* Camera Buttons & Layer Switcher */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Map Theme Toggle: Dark Matter with Buildings vs Satellite 3D Buildings */}
                    <button
                        onClick={() => setMapTheme(prev => prev === 'dark' ? 'satellite' : prev === 'satellite' ? 'voyager' : 'dark')}
                        className="px-3 py-3 rounded-2xl bg-black/80 hover:bg-black border border-white/20 text-white backdrop-blur-md shadow-xl transition-all hover:scale-105 flex items-center gap-1.5 text-xs font-semibold"
                        title="Switch between Dark Mode with Buildings, Satellite 3D Buildings, or Street View"
                    >
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>{mapTheme === 'dark' ? '🌙 Dark' : mapTheme === 'satellite' ? '🛰️ Satellite' : '🗺️ Streets'}</span>
                    </button>

                    <button
                        onClick={centerOnMe}
                        className="p-3 rounded-2xl bg-black/80 hover:bg-black border border-white/20 text-white backdrop-blur-md shadow-xl transition-all hover:scale-105"
                        title="Center on Me"
                    >
                        <Crosshair className="w-4 h-4 text-pink-400" />
                    </button>
                    <button
                        onClick={centerOnPartner}
                        className="p-3 rounded-2xl bg-black/80 hover:bg-black border border-white/20 text-white backdrop-blur-md shadow-xl transition-all hover:scale-105"
                        title="Center on Partner"
                    >
                        <Navigation className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                        onClick={fitBoth}
                        className="px-3.5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-xl transition-all flex items-center gap-1.5 hover:scale-105"
                        title="View Both Lovers"
                    >
                        <Users className="w-4 h-4" />
                        <span>Both</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
