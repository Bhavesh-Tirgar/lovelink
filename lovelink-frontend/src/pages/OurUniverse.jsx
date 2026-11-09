import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles, Plus, ArrowLeft, Star, X, Calendar, User, Trash2,
    Volume2, VolumeX, Eye, Heart, Camera, Compass, RefreshCw,
    Globe, Orbit
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const STAR_COLORS = {
    gold: { label: 'Golden Sun', hex: '#fbbf24', glow: 'rgba(251, 191, 36, 0.7)' },
    pink: { label: 'Rose Quartz', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.7)' },
    cyan: { label: 'Cosmic Cyan', hex: '#06b6d4', glow: 'rgba(6, 182, 212, 0.7)' },
    purple: { label: 'Violet Aura', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.7)' },
    emerald: { label: 'Emerald Spark', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.7)' },
};

const STAR_TYPES = {
    single: { label: 'Standard Star', desc: 'A classic eternal beacon' },
    binary: { label: 'Twin Souls (Binary)', desc: 'Two celestial stars dancing together' },
    supernova: { label: 'Supernova', desc: 'Vibrant pulsing aura of unforgettable love' },
    diamond: { label: 'Diamond Promise', desc: 'Crystalline cross-sparkle of forever' },
};

// ── 1. ALL GALAXIES OF THE DEEP UNIVERSE (INTERGALACTIC WEB) ───────────────
const DEEP_SPACE_GALAXIES = [
    {
        id: 'milkyway',
        name: 'Milky Way Galaxy (Our Home) 🌀',
        galaxyType: 'spiral',
        x: 0,
        y: 0,
        z: 0,
        radius: 40,
        coreColor: '#fef08a',
        armsColor: '#ec4899',
        distance: '0 ly (Inside It)',
        starsCount: '400 Billion Stars',
        title: 'The Cradle of Our Love',
        desc: 'A grand barred spiral galaxy spanning 100,000 light-years. Inside one tiny solar system along the Orion arm, your hearts found each other.',
        quote: 'Out of 400 billion stars in this galaxy, my eyes search only for you.'
    },
    {
        id: 'andromeda',
        name: 'Andromeda Galaxy (M31) 🌀',
        galaxyType: 'spiral',
        x: 340,
        y: 90,
        z: -270,
        radius: 48,
        coreColor: '#93c5fd',
        armsColor: '#3b82f6',
        distance: '2.5 Million Light-Years',
        starsCount: '1 Trillion Stars',
        title: 'Destined to Merge into One',
        desc: 'The largest neighbor galaxy racing toward us at 110 km/s. In 4 billion years, Andromeda and the Milky Way will merge and embrace into one single eternal super-galaxy (Milkomeda). Just like two destined souls.',
        quote: 'Two cosmic giants destined to merge into one forever.'
    },
    {
        id: 'whirlpool',
        name: 'Whirlpool Galaxy (M51) 🌀',
        galaxyType: 'spiral',
        x: -360,
        y: 200,
        z: 230,
        radius: 34,
        coreColor: '#fbcfe8',
        armsColor: '#a855f7',
        distance: '23 Million Light-Years',
        starsCount: '100 Billion Stars',
        title: 'The Cosmic Dance of Devotion',
        desc: 'A breathtaking grand-design spiral galaxy locked in a perpetual gravitational ballet with its companion galaxy NGC 5195.',
        quote: 'Caught in your gravity, forever dancing across eternity.'
    },
    {
        id: 'sombrero',
        name: 'Sombrero Galaxy (M104) 🛸',
        galaxyType: 'sombrero',
        x: -300,
        y: -250,
        z: -200,
        radius: 36,
        coreColor: '#ffffff',
        armsColor: '#f59e0b',
        distance: '28 Million Light-Years',
        starsCount: '800 Billion Stars',
        title: 'The Crown of Starlight',
        desc: 'Famous for its brilliant white bulbous nucleus and thick, dark rim of interstellar dust resembling a majestic royal hat.',
        quote: 'You wear the starlight like a crown.'
    },
    {
        id: 'triangulum',
        name: 'Triangulum Galaxy (M33) 🌀',
        galaxyType: 'spiral',
        x: 230,
        y: -190,
        z: 300,
        radius: 28,
        coreColor: '#67e8f9',
        armsColor: '#06b6d4',
        distance: '3.0 Million Light-Years',
        starsCount: '40 Billion Stars',
        title: 'The Turquoise Celestial Jewel',
        desc: 'The third major jewel of our Local Group, glowing with vast nebulae that birth thousands of newborn baby stars.',
        quote: 'Every day with you is a newborn star.'
    },
    {
        id: 'pinwheel',
        name: 'Pinwheel Galaxy (M101) 🌀',
        galaxyType: 'spiral',
        x: 190,
        y: 330,
        z: -150,
        radius: 40,
        coreColor: '#f43f5e',
        armsColor: '#fda4af',
        distance: '21 Million Light-Years',
        starsCount: '1 Trillion Stars',
        title: 'The Eternal Starlight Whirlwind',
        desc: 'An immense face-on spiral galaxy spanning 170,000 light-years with sweeping arms of open star clusters and glowing ruby nebulae.',
        quote: 'Lost in the beautiful whirlwind of your smile.'
    },
    {
        id: 'cigar',
        name: 'Cigar Galaxy (M82) 💥',
        galaxyType: 'starburst',
        x: -210,
        y: 290,
        z: -300,
        radius: 26,
        coreColor: '#ffffff',
        armsColor: '#ef4444',
        distance: '12 Million Light-Years',
        starsCount: '30 Billion Stars',
        title: 'The Fiery Starburst',
        desc: 'Ignited by ferocious gravitational tides, shooting explosive red hydrogen gas plumes thousands of light-years into deep space.',
        quote: 'A love fierce enough to set the cosmos ablaze.'
    },
    {
        id: 'laniakea',
        name: 'Laniakea Supercluster Core 🌌',
        galaxyType: 'web',
        x: 10,
        y: -410,
        z: 340,
        radius: 54,
        coreColor: '#c084fc',
        armsColor: '#818cf8',
        distance: '250 Million Light-Years',
        starsCount: '100,000 Galaxies',
        title: 'The Immeasurable Heaven',
        desc: 'Hawaiian for "Immeasurable Heaven". The supreme cosmic web containing our galaxy and 100,000 other galaxies flowing like rivers of light.',
        quote: 'Across all 100,000 galaxies in the heavens, I choose you in every lifetime.'
    }
];

// ── 2. SOLAR SYSTEM WORLDS & SINGULARITY ────────────────────────────────────
const SOLAR_SYSTEM_BODIES = [
    {
        id: 'sun',
        name: 'The Sun (Sol) ☀️',
        type: 'sun',
        x: 0,
        y: 0,
        z: 0,
        radius: 26,
        color: '#f59e0b',
        title: 'Source of All Warmth',
        desc: '150 million km away, Sol fuels every morning and radiates energy just like the love between you two.',
        quote: 'You are the sun that melts my coldest days.'
    },
    {
        id: 'earth',
        name: 'Earth (Our Home) 🌍',
        type: 'earth',
        x: 90,
        y: -24,
        z: 42,
        radius: 13,
        color: '#38bdf8',
        title: 'Where You & Partner Live',
        desc: 'Out of 8 billion humans scattered across 510 million km² of this pale blue dot, fate brought you two together.',
        quote: 'My favorite spot in the entire universe is anywhere next to you.'
    },
    {
        id: 'moon',
        name: 'The Moon (Luna) 🌙',
        type: 'moon',
        x: 110,
        y: -34,
        z: 48,
        radius: 6,
        color: '#f1f5f9',
        title: 'Keeper of Midnight Secrets',
        desc: 'Reflecting starlight on late-night calls, whispering quiet dreams when the rest of the world is asleep.',
        quote: 'I love you to the moon and back a million times.'
    },
    {
        id: 'mars',
        name: 'Mars (The Red Planet) 🔴',
        type: 'mars',
        x: 145,
        y: 38,
        z: -55,
        radius: 9,
        color: '#ef4444',
        title: 'Unstoppable Passion',
        desc: 'Ancient rust dunes and volcanic peaks, representing fierce devotion that withstands any distance.',
        quote: 'Our love could ignite life on a barren world.'
    },
    {
        id: 'jupiter',
        name: 'Jupiter (The Giant) 🪐',
        type: 'jupiter',
        x: -160,
        y: 80,
        z: 105,
        radius: 20,
        color: '#fbbf24',
        title: 'The Great Celestial Shield',
        desc: 'The giant guardian of inner planets, deflecting hazards just as your bond protects one another.',
        quote: 'Fierce storms outside, infinite peace within.'
    },
    {
        id: 'saturn',
        name: 'Saturn & Rings 🪐',
        type: 'saturn',
        x: -215,
        y: -80,
        z: -120,
        radius: 16,
        color: '#fef08a',
        title: 'Rings of Eternal Commitment',
        desc: 'Adorned with shimmering rings of ice crystals, symbolizing rings of everlasting promise.',
        quote: 'Like Saturn, our promise is encircled in stardust.'
    },
    {
        id: 'blackhole',
        name: 'Gargantua Singularity 🕳️',
        type: 'blackhole',
        x: 10,
        y: -220,
        z: 160,
        radius: 18,
        color: '#000000',
        title: 'Infinite Gravitational Pull',
        desc: 'A supermassive cosmic portal where time dilates. An attraction so deep not even light can escape.',
        quote: 'Time may stretch across galaxies, but my heart stays with you.'
    }
];

// ── 3. MAJOR CONSTELLATIONS ────────────────────────────────────────────────
const FAMOUS_CONSTELLATIONS = [
    {
        name: 'Orion (The Hunter)',
        stars: [
            { id: 'orion_betelgeuse', name: 'Betelgeuse', x: -140, y: 150, z: -180, color: '#f97316' },
            { id: 'orion_bellatrix', name: 'Bellatrix', x: -190, y: 140, z: -170, color: '#38bdf8' },
            { id: 'orion_alnitak', name: 'Alnitak', x: -168, y: 175, z: -175, color: '#67e8f9' },
            { id: 'orion_alnilam', name: 'Alnilam', x: -160, y: 179, z: -176, color: '#67e8f9' },
            { id: 'orion_mintaka', name: 'Mintaka', x: -152, y: 183, z: -177, color: '#67e8f9' },
            { id: 'orion_saiph', name: 'Saiph', x: -142, y: 215, z: -182, color: '#38bdf8' },
            { id: 'orion_rigel', name: 'Rigel', x: -188, y: 210, z: -172, color: '#93c5fd' },
        ],
        connections: [
            ['orion_betelgeuse', 'orion_bellatrix'],
            ['orion_betelgeuse', 'orion_alnitak'],
            ['orion_bellatrix', 'orion_mintaka'],
            ['orion_alnitak', 'orion_alnilam'],
            ['orion_alnilam', 'orion_mintaka'],
            ['orion_alnitak', 'orion_saiph'],
            ['orion_mintaka', 'orion_rigel'],
            ['orion_saiph', 'orion_rigel'],
        ]
    },
    {
        name: 'Ursa Major (The Big Dipper / Saptarishi)',
        stars: [
            { id: 'um_alkaid', name: 'Alkaid', x: 160, y: -160, z: -160, color: '#a78bfa' },
            { id: 'um_mizar', name: 'Mizar', x: 140, y: -175, z: -155, color: '#e0e7ff' },
            { id: 'um_alioth', name: 'Alioth', x: 120, y: -182, z: -152, color: '#e0e7ff' },
            { id: 'um_megrez', name: 'Megrez', x: 95, y: -185, z: -150, color: '#e0e7ff' },
            { id: 'um_phecda', name: 'Phecda', x: 85, y: -205, z: -148, color: '#e0e7ff' },
            { id: 'um_merak', name: 'Merak', x: 60, y: -200, z: -145, color: '#e0e7ff' },
            { id: 'um_dubhe', name: 'Dubhe', x: 70, y: -180, z: -146, color: '#fbbf24' },
        ],
        connections: [
            ['um_alkaid', 'um_mizar'],
            ['um_mizar', 'um_alioth'],
            ['um_alioth', 'um_megrez'],
            ['um_megrez', 'um_phecda'],
            ['um_phecda', 'um_merak'],
            ['um_merak', 'um_dubhe'],
            ['um_dubhe', 'um_megrez'],
        ]
    }
];

export default function OurUniverse() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    const [stars, setStars] = useState([]);
    const [wishes, setWishes] = useState([]);
    const [selectedStar, setSelectedStar] = useState(null);
    const [selectedGalaxy, setSelectedGalaxy] = useState(null);
    const [selectedPlanet, setSelectedPlanet] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isWishModalOpen, setIsWishModalOpen] = useState(false);
    const [isWishListOpen, setIsWishListOpen] = useState(false);

    // Form inputs for new star
    const [starName, setStarName] = useState('');
    const [memoryText, setMemoryText] = useState('');
    const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
    const [starColor, setStarColor] = useState('gold');
    const [starType, setStarType] = useState('single');
    const [photoUrl, setPhotoUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Wish form
    const [wishText, setWishText] = useState('');
    const [wishSubmitting, setWishSubmitting] = useState(false);

    // Controls
    const [showGalaxies, setShowGalaxies] = useState(true);
    const [showSolarSystem, setShowSolarSystem] = useState(true);
    const [showConstellations, setShowConstellations] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isTourRunning, setIsTourRunning] = useState(false);
    const [activeMeteorNotice, setActiveMeteorNotice] = useState(false);

    // Audio synthesizer ref
    const audioCtxRef = useRef(null);
    const audioNodesRef = useRef([]);

    // 3D Celestial Camera State
    const cameraRef = useRef({
        rotX: 0.12,
        rotY: -0.22,
        targetRotX: 0.12,
        targetRotY: -0.22,
        zoom: 0.9,
        targetZoom: 0.9,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
    });

    // Background ambient stars & intergalactic web
    const ambientStarsRef = useRef([]);
    const cosmicFilamentsRef = useRef([]);
    const meteorsRef = useRef([]);

    // Fetch memory stars from backend
    const fetchStars = useCallback(async () => {
        try {
            const res = await api.get('/universe/stars');
            setStars(res.data || []);
        } catch (e) {
            console.error("Failed to load stars", e);
        }
    }, []);

    // Fetch secret wishes
    const fetchWishes = useCallback(async () => {
        try {
            const res = await api.get('/universe/wishes');
            setWishes(res.data || []);
        } catch (e) {
            console.error("Failed to load wishes", e);
        }
    }, []);

    useEffect(() => {
        fetchStars();
        fetchWishes();
    }, [fetchStars, fetchWishes]);

    // Initialize 600 Background Stars and Intergalactic Cosmic Web Filaments
    useEffect(() => {
        const arr = [];
        for (let i = 0; i < 600; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = 300 + Math.random() * 80;

            arr.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi),
                baseSize: Math.random() * 1.5 + 0.4,
                twinkleSpeed: Math.random() * 0.04 + 0.01,
                phase: Math.random() * Math.PI * 2,
            });
        }
        ambientStarsRef.current = arr;

        // Intergalactic Web Filaments (Dust Strands connecting galaxy clusters)
        const filaments = [];
        for (let k = 0; k < DEEP_SPACE_GALAXIES.length; k++) {
            const g1 = DEEP_SPACE_GALAXIES[k];
            const g2 = DEEP_SPACE_GALAXIES[(k + 1) % DEEP_SPACE_GALAXIES.length];
            for (let step = 0; step < 18; step++) {
                const t = step / 18;
                filaments.push({
                    x: g1.x + (g2.x - g1.x) * t + (Math.random() - 0.5) * 30,
                    y: g1.y + (g2.y - g1.y) * t + (Math.random() - 0.5) * 30,
                    z: g1.z + (g2.z - g1.z) * t + (Math.random() - 0.5) * 30,
                    color: t < 0.5 ? g1.armsColor : g2.armsColor,
                    size: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.35 + 0.1,
                });
            }
        }
        cosmicFilamentsRef.current = filaments;
    }, []);

    // Ambient Space Drone Sound Synthesizer (Web Audio API)
    useEffect(() => {
        if (!audioEnabled) {
            if (audioCtxRef.current) {
                audioNodesRef.current.forEach(n => {
                    try { n.stop && n.stop(); n.disconnect(); } catch (_) {}
                });
                audioNodesRef.current = [];
                audioCtxRef.current.close().catch(() => {});
                audioCtxRef.current = null;
            }
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            audioCtxRef.current = ctx;

            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
            masterGain.connect(ctx.destination);

            const freqs = [174.61, 261.63, 349.23, 432.00, 523.25];
            const nodes = [];

            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

                osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.frequency.setValueAtTime(0.09 + idx * 0.03, ctx.currentTime);
                lfoGain.gain.setValueAtTime(0.02, ctx.currentTime);
                lfo.connect(gain.gain);
                lfo.start();

                gain.gain.setValueAtTime(0.06 / freqs.length, ctx.currentTime);

                if (panner) {
                    panner.pan.setValueAtTime((idx / (freqs.length - 1)) * 1.6 - 0.8, ctx.currentTime);
                    osc.connect(gain);
                    gain.connect(panner);
                    panner.connect(masterGain);
                    nodes.push(panner, lfo, lfoGain);
                } else {
                    osc.connect(gain);
                    gain.connect(masterGain);
                    nodes.push(lfo, lfoGain);
                }

                osc.start();
                nodes.push(osc, gain);
            });

            audioNodesRef.current = nodes;
        } catch (e) {
            console.error("Audio synth error:", e);
        }

        return () => {
            if (audioCtxRef.current) {
                audioNodesRef.current.forEach(n => {
                    try { n.stop && n.stop(); n.disconnect(); } catch (_) {}
                });
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, [audioEnabled]);

    // Spawning Periodic Shooting Stars
    useEffect(() => {
        const interval = setInterval(() => {
            if (canvasRef.current) {
                const w = canvasRef.current.width;
                const h = canvasRef.current.height;
                meteorsRef.current.push({
                    x: Math.random() * (w * 0.7),
                    y: Math.random() * (h * 0.3),
                    vx: 7 + Math.random() * 6,
                    vy: 4 + Math.random() * 4,
                    length: 120 + Math.random() * 80,
                    alpha: 1.0,
                    color: Math.random() > 0.5 ? '#fbcfe8' : '#67e8f9',
                });

                setActiveMeteorNotice(true);
                setTimeout(() => setActiveMeteorNotice(false), 5000);
            }
        }, 16000);

        return () => clearInterval(interval);
    }, []);

    const triggerMeteor = () => {
        if (!canvasRef.current) return;
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        meteorsRef.current.push({
            x: Math.random() * (w * 0.5),
            y: Math.random() * (h * 0.3),
            vx: 8,
            vy: 5,
            length: 140,
            alpha: 1.0,
            color: '#f43f5e',
        });
        setActiveMeteorNotice(true);
        setTimeout(() => setActiveMeteorNotice(false), 5000);
    };

    // Smooth Warp / Fly Camera to Celestial Target
    const flyToTarget = (x, y, z) => {
        setIsTourRunning(false);
        const dist = Math.hypot(x, z);
        const targetRY = -Math.atan2(x, z);
        const targetRX = Math.atan2(y, dist);

        cameraRef.current.targetRotY = targetRY;
        cameraRef.current.targetRotX = targetRX;
        cameraRef.current.targetZoom = 1.35;
    };

    // ── MAIN 3D UNIVERSE CANVAS RENDER LOOP ─────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        let tourAngle = 0;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            const cx = width / 2;
            const cy = height / 2;
            const fov = 360 * cameraRef.current.zoom;

            if (isTourRunning) {
                tourAngle += 0.003;
                cameraRef.current.targetRotY = tourAngle;
                cameraRef.current.targetRotX = Math.sin(tourAngle * 0.6) * 0.22;
            }

            cameraRef.current.rotX += (cameraRef.current.targetRotX - cameraRef.current.rotX) * 0.08;
            cameraRef.current.rotY += (cameraRef.current.targetRotY - cameraRef.current.rotY) * 0.08;
            cameraRef.current.zoom += (cameraRef.current.targetZoom - cameraRef.current.zoom) * 0.1;

            const rx = cameraRef.current.rotX;
            const ry = cameraRef.current.rotY;
            const cosX = Math.cos(rx);
            const sinX = Math.sin(rx);
            const cosY = Math.cos(ry);
            const sinY = Math.sin(ry);

            // 1. Deep Space Intergalactic Canvas Background
            const bgGradient = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.9);
            bgGradient.addColorStop(0, '#0c0919');
            bgGradient.addColorStop(0.4, '#05040d');
            bgGradient.addColorStop(1, '#010103');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            const timeNow = Date.now() * 0.001;

            // 2. Render Cosmic Web Filaments (Interconnecting Galaxies Across Billions of Light-Years)
            if (showGalaxies) {
                cosmicFilamentsRef.current.forEach((p) => {
                    const x1 = p.x * cosY - p.z * sinY;
                    const z1 = p.x * sinY + p.z * cosY;
                    const y1 = p.y * cosX - z1 * sinX;
                    const z2 = p.y * sinX + z1 * cosX;

                    const depth = z2 + 380;
                    if (depth > 10) {
                        const scale = fov / depth;
                        const px = cx + x1 * scale;
                        const py = cy + y1 * scale;

                        if (px >= -20 && px <= width + 20 && py >= -20 && py <= height + 20) {
                            ctx.fillStyle = p.color;
                            ctx.globalAlpha = p.alpha;
                            ctx.beginPath();
                            ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1.0;
                        }
                    }
                });
            }

            // 3. Render 600 Background Distant Stars
            ambientStarsRef.current.forEach((s) => {
                const x1 = s.x * cosY - s.z * sinY;
                const z1 = s.x * sinY + s.z * cosY;
                const y1 = s.y * cosX - z1 * sinX;
                const z2 = s.y * sinX + z1 * cosX;

                const depth = z2 + 400;
                if (depth > 10) {
                    const scale = fov / depth;
                    const px = cx + x1 * scale;
                    const py = cy + y1 * scale;

                    if (px >= 0 && px <= width && py >= 0 && py <= height) {
                        const twinkle = (Math.sin(timeNow * 2 + s.phase) + 1) * 0.5;
                        const alpha = 0.2 + twinkle * 0.7;
                        const size = Math.max(0.6, s.baseSize * (scale * 0.8));

                        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.beginPath();
                        ctx.arc(px, py, size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });

            // 4. Render Famous Constellations
            if (showConstellations) {
                FAMOUS_CONSTELLATIONS.forEach((constell) => {
                    const projMap = {};
                    constell.stars.forEach((cs) => {
                        const x1 = cs.x * cosY - cs.z * sinY;
                        const z1 = cs.x * sinY + cs.z * cosY;
                        const y1 = cs.y * cosX - z1 * sinX;
                        const z2 = cs.y * sinX + z1 * cosX;
                        const depth = z2 + 360;
                        if (depth > 10) {
                            const scale = fov / depth;
                            projMap[cs.id] = {
                                px: cx + x1 * scale,
                                py: cy + y1 * scale,
                                color: cs.color,
                            };
                        }
                    });

                    ctx.save();
                    ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)';
                    ctx.lineWidth = 1.0;
                    ctx.setLineDash([3, 4]);

                    constell.connections.forEach(([idA, idB]) => {
                        const pA = projMap[idA];
                        const pB = projMap[idB];
                        if (pA && pB) {
                            ctx.beginPath();
                            ctx.moveTo(pA.px, pA.py);
                            ctx.lineTo(pB.px, pB.py);
                            ctx.stroke();
                        }
                    });

                    Object.values(projMap).forEach((p) => {
                        ctx.fillStyle = p.color;
                        ctx.beginPath();
                        ctx.arc(p.px, p.py, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                    ctx.restore();
                });
            }

            // 5. Project Deep Space Galaxies
            const renderedGalaxies = [];
            if (showGalaxies) {
                DEEP_SPACE_GALAXIES.forEach((g) => {
                    const x1 = g.x * cosY - g.z * sinY;
                    const z1 = g.x * sinY + g.z * cosY;
                    const y1 = g.y * cosX - z1 * sinX;
                    const z2 = g.y * sinX + z1 * cosX;

                    const depth = z2 + 320;
                    if (depth > 15) {
                        const scale = fov / depth;
                        const px = cx + x1 * scale;
                        const py = cy + y1 * scale;
                        renderedGalaxies.push({
                            ...g,
                            px,
                            py,
                            depth,
                            scale,
                            isGalaxy: true,
                        });
                    }
                });
            }

            // 6. Project Solar System Worlds
            const renderedPlanets = [];
            if (showSolarSystem) {
                SOLAR_SYSTEM_BODIES.forEach((b) => {
                    const x1 = b.x * cosY - b.z * sinY;
                    const z1 = b.x * sinY + b.z * cosY;
                    const y1 = b.y * cosX - z1 * sinX;
                    const z2 = b.y * sinX + z1 * cosX;

                    const depth = z2 + 250;
                    if (depth > 15) {
                        const scale = fov / depth;
                        const px = cx + x1 * scale;
                        const py = cy + y1 * scale;
                        renderedPlanets.push({
                            ...b,
                            px,
                            py,
                            depth,
                            scale,
                            isPlanet: true,
                        });
                    }
                });
            }

            // 7. Project Memory Stars
            const projectedStars = [];
            stars.forEach((star) => {
                const sx = star.coord_x;
                const sy = star.coord_y;
                const sz = star.coord_z;

                const x1 = sx * cosY - sz * sinY;
                const z1 = sx * sinY + sz * cosY;
                const y1 = sy * cosX - z1 * sinX;
                const z2 = sy * sinX + z1 * cosX;

                const depth = z2 + 220;
                if (depth > 20) {
                    const scale = fov / depth;
                    const px = cx + x1 * scale;
                    const py = cy + y1 * scale;
                    projectedStars.push({
                        ...star,
                        px,
                        py,
                        depth,
                        scale,
                        isStar: true,
                    });
                }
            });

            // Combine and sort back-to-front
            const allEntities = [...renderedGalaxies, ...renderedPlanets, ...projectedStars];
            allEntities.sort((a, b) => b.depth - a.depth);

            // Draw Constellation Lines between couple stars
            if (showConstellations && projectedStars.length >= 2) {
                ctx.save();
                ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
                ctx.lineWidth = 1.3;
                ctx.setLineDash([4, 6]);

                for (let i = 0; i < projectedStars.length - 1; i++) {
                    const p1 = projectedStars[i];
                    const p2 = projectedStars[i + 1];
                    ctx.beginPath();
                    ctx.moveTo(p1.px, p1.py);
                    ctx.lineTo(p2.px, p2.py);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Render Entities
            allEntities.forEach((ent) => {
                if (ent.isGalaxy) {
                    // ── RENDER DEEP SPACE GALAXY ──
                    const r = Math.max(14, ent.radius * (ent.scale * 0.9));

                    ctx.save();
                    ctx.translate(ent.px, ent.py);
                    const galRot = timeNow * 0.2 + ent.id.charCodeAt(0);
                    ctx.rotate(galRot);

                    if (ent.galaxyType === 'sombrero') {
                        // Sombrero Galaxy (Lenticular core with dark dust rim)
                        ctx.scale(1, 0.35);
                        const sombGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.5);
                        sombGrad.addColorStop(0, '#ffffff');
                        sombGrad.addColorStop(0.3, ent.coreColor);
                        sombGrad.addColorStop(0.8, ent.armsColor);
                        sombGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = sombGrad;
                        ctx.beginPath();
                        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
                        ctx.fill();

                        // Dark Equatorial Dust Band
                        ctx.fillStyle = 'rgba(10, 8, 18, 0.9)';
                        ctx.fillRect(-r * 1.6, -r * 0.12, r * 3.2, r * 0.24);
                    } else if (ent.galaxyType === 'starburst') {
                        // Starburst (Cigar Galaxy with explosive red jets)
                        ctx.scale(1, 0.4);
                        const cigarGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.6);
                        cigarGrad.addColorStop(0, '#ffffff');
                        cigarGrad.addColorStop(0.5, '#fca5a5');
                        cigarGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = cigarGrad;
                        ctx.beginPath();
                        ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
                        ctx.fill();

                        // Red explosive gas flares
                        ctx.strokeStyle = '#ef4444';
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.moveTo(0, -r * 1.2);
                        ctx.lineTo(0, r * 1.2);
                        ctx.stroke();
                    } else {
                        // Spiral Galaxy (Rotating Logarithmic Spiral Arms)
                        ctx.scale(1, 0.5);

                        // Volumetric Galactic Glow
                        const galGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.7);
                        galGrad.addColorStop(0, ent.coreColor);
                        galGrad.addColorStop(0.35, ent.armsColor);
                        galGrad.addColorStop(0.8, 'rgba(147, 51, 234, 0.25)');
                        galGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = galGrad;
                        ctx.beginPath();
                        ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
                        ctx.fill();

                        // Spiral Arms Particles
                        ctx.fillStyle = ent.armsColor;
                        for (let arm = 0; arm < 2; arm++) {
                            const offset = arm * Math.PI;
                            for (let pt = 0; pt < 24; pt++) {
                                const theta = (pt / 24) * Math.PI * 2 + offset;
                                const dist = (pt / 24) * r * 1.35;
                                const armX = Math.cos(theta) * dist;
                                const armY = Math.sin(theta) * dist;
                                ctx.beginPath();
                                ctx.arc(armX, armY, Math.max(1, (1 - pt / 24) * 2.5), 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }

                        // Brilliant Galactic Core
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.restore();

                    // Galaxy Title Tag
                    ctx.font = '700 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    const textWidth = ctx.measureText(ent.name).width;

                    ctx.fillStyle = 'rgba(8, 7, 18, 0.85)';
                    ctx.beginPath();
                    ctx.roundRect(ent.px - textWidth / 2 - 8, ent.py + r + 8, textWidth + 16, 20, 6);
                    ctx.fill();

                    ctx.fillStyle = '#f8fafc';
                    ctx.fillText(ent.name, ent.px, ent.py + r + 22);

                } else if (ent.isPlanet) {
                    // ── RENDER PLANET ──
                    const r = Math.max(6, ent.radius * (ent.scale * 0.9));

                    if (ent.type === 'sun') {
                        const pulse = Math.sin(timeNow * 2.5) * 4;
                        const sunGlow = ctx.createRadialGradient(ent.px, ent.py, r * 0.4, ent.px, ent.py, (r + pulse) * 2.8);
                        sunGlow.addColorStop(0, '#ffffff');
                        sunGlow.addColorStop(0.2, '#fef08a');
                        sunGlow.addColorStop(0.55, '#f59e0b');
                        sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

                        ctx.fillStyle = sunGlow;
                        ctx.beginPath();
                        ctx.arc(ent.px, ent.py, (r + pulse) * 2.8, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(ent.px, ent.py, r * 0.75, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (ent.type === 'blackhole') {
                        const bhGlow = ctx.createRadialGradient(ent.px, ent.py, r * 0.8, ent.px, ent.py, r * 2.5);
                        bhGlow.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
                        bhGlow.addColorStop(0.5, 'rgba(251, 146, 60, 0.75)');
                        bhGlow.addColorStop(1, 'rgba(0,0,0,0)');

                        ctx.save();
                        ctx.translate(ent.px, ent.py);
                        ctx.scale(1, 0.4);
                        ctx.fillStyle = bhGlow;
                        ctx.beginPath();
                        ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();

                        ctx.fillStyle = '#000000';
                        ctx.beginPath();
                        ctx.arc(ent.px, ent.py, r, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#f43f5e';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    } else if (ent.type === 'earth') {
                        const earthGrad = ctx.createRadialGradient(ent.px - r * 0.3, ent.py - r * 0.3, r * 0.1, ent.px, ent.py, r);
                        earthGrad.addColorStop(0, '#93c5fd');
                        earthGrad.addColorStop(0.5, '#0284c7');
                        earthGrad.addColorStop(1, '#082f49');

                        ctx.fillStyle = earthGrad;
                        ctx.beginPath();
                        ctx.arc(ent.px, ent.py, r, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                        ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.arc(ent.px, ent.py, r * 0.65, 0.2, 1.8);
                        ctx.stroke();
                    } else if (ent.type === 'saturn') {
                        const saturnGrad = ctx.createRadialGradient(ent.px - r * 0.3, ent.py - r * 0.3, r * 0.1, ent.px, ent.py, r);
                        saturnGrad.addColorStop(0, '#fef08a');
                        saturnGrad.addColorStop(0.7, '#ca8a04');
                        saturnGrad.addColorStop(1, '#713f12');

                        ctx.fillStyle = saturnGrad;
                        ctx.beginPath();
                        ctx.arc(ent.px, ent.py, r, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.save();
                        ctx.translate(ent.px, ent.py);
                        ctx.rotate(0.45);
                        ctx.scale(1, 0.35);
                        ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
                        ctx.lineWidth = r * 0.65;
                        ctx.beginPath();
                        ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    } else {
                        const pGrad = ctx.createRadialGradient(ent.px - r * 0.3, ent.py - r * 0.3, r * 0.1, ent.px, ent.py, r);
                        pGrad.addColorStop(0, '#ffffff');
                        pGrad.addColorStop(0.4, ent.color);
                        pGrad.addColorStop(1, '#000000');

                        ctx.fillStyle = pGrad;
                        ctx.beginPath();
                        ctx.arc(ent.px, ent.py, r, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.font = '600 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    const textWidth = ctx.measureText(ent.name).width;

                    ctx.fillStyle = 'rgba(9, 8, 20, 0.85)';
                    ctx.beginPath();
                    ctx.roundRect(ent.px - textWidth / 2 - 6, ent.py + r + 6, textWidth + 12, 18, 5);
                    ctx.fill();

                    ctx.fillStyle = '#f1f5f9';
                    ctx.fillText(ent.name, ent.px, ent.py + r + 19);

                } else if (ent.isStar) {
                    // ── RENDER MEMORY STAR ──
                    const star = ent;
                    const colorDef = STAR_COLORS[star.color] || STAR_COLORS.gold;
                    const baseRadius = Math.max(5, 9 * (star.scale * 0.95));
                    const pulse = Math.sin(timeNow * 3 + star.id.charCodeAt(0)) * 2;
                    const radius = baseRadius + pulse;

                    const glowGrad = ctx.createRadialGradient(star.px, star.py, 1, star.px, star.py, radius * 3.2);
                    glowGrad.addColorStop(0, colorDef.hex);
                    glowGrad.addColorStop(0.35, colorDef.glow);
                    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(star.px, star.py, radius * 3.2, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(star.px, star.py, radius * 0.65, 0, Math.PI * 2);
                    ctx.fill();

                    if (star.star_type === 'binary') {
                        const orbAngle = timeNow * 2;
                        const orbX = star.px + Math.cos(orbAngle) * (radius * 1.8);
                        const orbY = star.py + Math.sin(orbAngle) * (radius * 1.8);
                        ctx.fillStyle = '#f43f5e';
                        ctx.beginPath();
                        ctx.arc(orbX, orbY, radius * 0.45, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (star.star_type === 'diamond') {
                        ctx.strokeStyle = colorDef.hex;
                        ctx.lineWidth = 1.6;
                        ctx.beginPath();
                        ctx.moveTo(star.px - radius * 2.8, star.py);
                        ctx.lineTo(star.px + radius * 2.8, star.py);
                        ctx.moveTo(star.px, star.py - radius * 2.8);
                        ctx.lineTo(star.px, star.py + radius * 2.8);
                        ctx.stroke();
                    } else if (star.star_type === 'supernova') {
                        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(star.px, star.py, radius * 2.2, 0, Math.PI * 2);
                        ctx.stroke();
                    }

                    ctx.font = '600 12px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    const textWidth = ctx.measureText(star.star_name).width;

                    ctx.fillStyle = 'rgba(15, 12, 27, 0.75)';
                    ctx.beginPath();
                    ctx.roundRect(star.px - textWidth / 2 - 8, star.py + radius + 6, textWidth + 16, 20, 6);
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(star.star_name, star.px, star.py + radius + 20);
                }
            });

            // 8. Render Meteors
            for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
                const m = meteorsRef.current[i];
                m.x += m.vx;
                m.y += m.vy;
                m.alpha -= 0.015;

                if (m.alpha <= 0) {
                    meteorsRef.current.splice(i, 1);
                    continue;
                }

                const grad = ctx.createLinearGradient(
                    m.x, m.y,
                    m.x - m.vx * (m.length / 10),
                    m.y - m.vy * (m.length / 10)
                );
                grad.addColorStop(0, `rgba(255, 255, 255, ${m.alpha})`);
                grad.addColorStop(0.3, m.color);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(m.x, m.y);
                ctx.lineTo(m.x - m.vx * (m.length / 10), m.y - m.vy * (m.length / 10));
                ctx.stroke();

                ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha})`;
                ctx.beginPath();
                ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            animId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
        };
    }, [stars, showGalaxies, showSolarSystem, showConstellations, isTourRunning]);

    // Canvas Pointer Controls
    const handlePointerDown = (e) => {
        cameraRef.current.isDragging = true;
        cameraRef.current.lastMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        cameraRef.current.lastMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
        setIsTourRunning(false);
    };

    const handlePointerMove = (e) => {
        if (!cameraRef.current.isDragging) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        const deltaX = clientX - cameraRef.current.lastMouseX;
        const deltaY = clientY - cameraRef.current.lastMouseY;

        cameraRef.current.targetRotY += deltaX * 0.005;
        cameraRef.current.targetRotX += deltaY * 0.005;

        cameraRef.current.lastMouseX = clientX;
        cameraRef.current.lastMouseY = clientY;
    };

    const handlePointerUp = () => {
        cameraRef.current.isDragging = false;
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newZoom = Math.min(Math.max(cameraRef.current.targetZoom + delta, 0.35), 2.8);
        cameraRef.current.targetZoom = newZoom;
    };

    // Canvas Click Detection
    const handleCanvasClick = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const cx = canvasRef.current.width / 2;
        const cy = canvasRef.current.height / 2;
        const fov = 360 * cameraRef.current.zoom;

        const rx = cameraRef.current.rotX;
        const ry = cameraRef.current.rotY;
        const cosX = Math.cos(rx);
        const sinX = Math.sin(rx);
        const cosY = Math.cos(ry);
        const sinY = Math.sin(ry);

        // 1. Check Deep Space Galaxies Click
        if (showGalaxies) {
            for (const g of DEEP_SPACE_GALAXIES) {
                const x1 = g.x * cosY - g.z * sinY;
                const z1 = g.x * sinY + g.z * cosY;
                const y1 = g.y * cosX - z1 * sinX;
                const z2 = g.y * sinX + z1 * cosX;
                const depth = z2 + 320;
                if (depth > 15) {
                    const scale = fov / depth;
                    const px = cx + x1 * scale;
                    const py = cy + y1 * scale;
                    const hitRadius = Math.max(28, g.radius * scale * 1.5);
                    if (Math.hypot(clickX - px, clickY - py) <= hitRadius) {
                        setSelectedGalaxy(g);
                        return;
                    }
                }
            }
        }

        // 2. Check Solar System Planets Click
        if (showSolarSystem) {
            for (const p of SOLAR_SYSTEM_BODIES) {
                const x1 = p.x * cosY - p.z * sinY;
                const z1 = p.x * sinY + p.z * cosY;
                const y1 = p.y * cosX - z1 * sinX;
                const z2 = p.y * sinX + z1 * cosX;
                const depth = z2 + 250;
                if (depth > 15) {
                    const scale = fov / depth;
                    const px = cx + x1 * scale;
                    const py = cy + y1 * scale;
                    const hitRadius = Math.max(24, p.radius * scale * 1.4);
                    if (Math.hypot(clickX - px, clickY - py) <= hitRadius) {
                        setSelectedPlanet(p);
                        return;
                    }
                }
            }
        }

        // 3. Check Memory Stars Click
        for (const star of stars) {
            const sx = star.coord_x;
            const sy = star.coord_y;
            const sz = star.coord_z;

            const x1 = sx * cosY - sz * sinY;
            const z1 = sx * sinY + sz * cosY;
            const y1 = sy * cosX - z1 * sinX;
            const z2 = sy * sinX + z1 * cosX;

            const depth = z2 + 220;
            if (depth > 20) {
                const scale = fov / depth;
                const px = cx + x1 * scale;
                const py = cy + y1 * scale;

                const hitRadius = Math.max(22, 16 * scale);
                if (Math.hypot(clickX - px, clickY - py) <= hitRadius) {
                    setSelectedStar(star);
                    return;
                }
            }
        }
    };

    // Star Creation Handler
    const handleAddStar = async (e) => {
        e.preventDefault();
        if (!starName.trim() || !memoryText.trim()) {
            toast.error("Please fill in the star name and memory!");
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/universe/stars', {
                star_name: starName.trim(),
                memory_text: memoryText.trim(),
                date_str: dateStr,
                color: starColor,
                star_type: starType,
                photo_url: photoUrl.trim() || null,
            });

            setStars(prev => [res.data, ...prev]);
            setIsAddModalOpen(false);
            setStarName('');
            setMemoryText('');
            setPhotoUrl('');
            toast.success("✨ Your memory has been etched into the cosmos forever!");

            confetti({
                particleCount: 75,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#fbbf24', '#f43f5e', '#a855f7']
            });
        } catch (err) {
            console.error("Failed to add star", err);
            toast.error(err.response?.data?.detail || "Could not name star in the universe.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteStar = async (starId) => {
        if (!window.confirm("Are you sure you want to release this star back into the cosmic void?")) return;
        try {
            await api.delete(`/universe/stars/${starId}`);
            setStars(prev => prev.filter(s => s.id !== starId));
            setSelectedStar(null);
            toast.success("Star released.");
        } catch (err) {
            toast.error("Failed to delete star.");
        }
    };

    const handleMakeWish = async (e) => {
        e.preventDefault();
        if (!wishText.trim()) return;

        setWishSubmitting(true);
        try {
            const res = await api.post('/universe/wishes', {
                wish_text: wishText.trim(),
            });
            setWishes(prev => [res.data, ...prev]);
            setIsWishModalOpen(false);
            setWishText('');
            toast.success("🌟 Secret wish cast into the stars!");
            confetti({ particleCount: 50, spread: 60, colors: ['#67e8f9', '#f43f5e'] });
        } catch (err) {
            toast.error("Could not cast wish");
        } finally {
            setWishSubmitting(false);
        }
    };

    const handleRevealWish = async (wishId) => {
        try {
            await api.post(`/universe/wishes/${wishId}/reveal`);
            setWishes(prev => prev.map(w => w.id === wishId ? { ...w, is_revealed: true } : w));
            toast.success("💖 Wish revealed to your partner!");
        } catch (err) {
            toast.error("Failed to reveal wish");
        }
    };

    return (
        <div className="relative w-full h-[100dvh] overflow-hidden bg-black select-none text-white font-sans">
            {/* Top Navigation Bar */}
            <div className="absolute top-3 sm:top-4 pt-safe left-3 sm:left-4 right-3 sm:right-4 z-20 flex items-center justify-between pointer-events-none">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-sm font-medium hover:bg-white/10 transition-all text-white/90 hover:text-white shadow-lg"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                {/* Center Title Badge */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-black/60 backdrop-blur-md border border-pink-500/30 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                        <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                        <h1 className="text-sm font-bold tracking-wider uppercase bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent">
                            Intergalactic Cosmos
                        </h1>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                            {DEEP_SPACE_GALAXIES.length} Galaxies • {stars.length} Stars
                        </span>
                    </div>
                </div>

                {/* Quick Toggle Controls */}
                <div className="pointer-events-auto flex items-center gap-2">
                    <button
                        onClick={() => setAudioEnabled(prev => !prev)}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                            audioEnabled
                                ? 'bg-pink-600/80 border-pink-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                                : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                        title={audioEnabled ? "Mute Cosmic Drone" : "Play Ambient Space Music"}
                    >
                        {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    {/* Galaxies Toggle */}
                    <button
                        onClick={() => setShowGalaxies(prev => !prev)}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                            showGalaxies
                                ? 'bg-purple-600/80 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                                : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                        title="Toggle Deep Space Galaxies"
                    >
                        <Orbit className="w-4 h-4" />
                    </button>

                    {/* Solar System Toggle */}
                    <button
                        onClick={() => setShowSolarSystem(prev => !prev)}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                            showSolarSystem
                                ? 'bg-amber-600/80 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                                : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                        title="Toggle Solar System Worlds"
                    >
                        <Globe className="w-4 h-4" />
                    </button>

                    {/* Constellations Toggle */}
                    <button
                        onClick={() => setShowConstellations(prev => !prev)}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                            showConstellations
                                ? 'bg-indigo-600/80 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                                : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                        title="Toggle Constellation Lines"
                    >
                        <Compass className="w-4 h-4" />
                    </button>

                    {/* Galaxy Tour Mode */}
                    <button
                        onClick={() => setIsTourRunning(prev => !prev)}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                            isTourRunning
                                ? 'bg-pink-600/80 border-pink-400 text-white animate-spin'
                                : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                        title="Cinematic Galaxy Tour"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Quick Galaxy Teleport Strip (Top Left underneath Nav) */}
            <div className="absolute top-16 left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-md pointer-events-auto">
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider mr-1">Galaxies:</span>
                <button
                    onClick={() => flyToTarget(340, 90, -270)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1"
                >
                    🌀 Andromeda
                </button>
                <button
                    onClick={() => flyToTarget(-360, 200, 230)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all flex items-center gap-1"
                >
                    🌀 Whirlpool
                </button>
                <button
                    onClick={() => flyToTarget(-300, -250, -200)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1"
                >
                    🛸 Sombrero
                </button>
                <button
                    onClick={() => flyToTarget(190, 330, -150)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1"
                >
                    🌀 Pinwheel
                </button>
                <button
                    onClick={() => flyToTarget(90, -24, 42)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition-all flex items-center gap-1"
                >
                    🌍 Earth
                </button>
                <button
                    onClick={() => flyToTarget(10, -410, 340)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1"
                >
                    🌌 Laniakea
                </button>
            </div>

            {/* Shooting Star Banner */}
            {activeMeteorNotice && (
                <div
                    onClick={() => setIsWishModalOpen(true)}
                    className="absolute top-20 left-1/2 -translate-x-1/2 z-20 cursor-pointer animate-bounce flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white rounded-full shadow-[0_0_25px_rgba(244,63,94,0.8)] border border-pink-300"
                >
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span className="text-xs sm:text-sm font-semibold">🌠 A shooting star! Click here to make a secret wish!</span>
                </div>
            )}

            {/* 3D Celestial Sky Canvas */}
            <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onWheel={handleWheel}
                onClick={handleCanvasClick}
                className="w-full h-full cursor-grab active:cursor-grabbing"
            />

            {/* Bottom Floating Island */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
                <button
                    onClick={() => setIsWishListOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 rounded-full text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all font-medium text-sm"
                >
                    <Heart className="w-4 h-4 text-cyan-400" />
                    <span>Wish Jar ({wishes.length})</span>
                </button>

                <button
                    onClick={triggerMeteor}
                    className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 hover:border-white/40 rounded-full text-white/80 hover:text-white transition-all shadow-lg"
                    title="Summon Shooting Star"
                >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                </button>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white rounded-full shadow-[0_0_25px_rgba(244,63,94,0.6)] font-bold text-sm tracking-wide transition-all transform hover:scale-105"
                >
                    <Plus className="w-4 h-4" />
                    <span>Name a Star</span>
                </button>
            </div>

            {/* Helper Hint */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center text-xs text-white/40 pointer-events-none whitespace-nowrap">
                Drag to orbit universe • Scroll to zoom • Click any galaxy, planet, or star
            </div>

            {/* ── MODAL: GALAXY DETAILS & COSMIC LORE ── */}
            {selectedGalaxy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-slate-900 to-black border border-purple-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden">
                        <div
                            className="absolute -top-20 -left-20 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none"
                            style={{ backgroundColor: selectedGalaxy.armsColor }}
                        />

                        <button
                            onClick={() => setSelectedGalaxy(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3.5 mb-4">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 text-2xl"
                                style={{ backgroundColor: `${selectedGalaxy.armsColor}22`, borderColor: selectedGalaxy.armsColor }}
                            >
                                🌀
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-white">{selectedGalaxy.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-purple-300 font-mono mt-0.5">
                                    <span>{selectedGalaxy.distance}</span>
                                    <span>•</span>
                                    <span>{selectedGalaxy.starsCount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/90 text-sm leading-relaxed mb-4">
                            {selectedGalaxy.desc}
                        </div>

                        {selectedGalaxy.quote && (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/25 text-xs italic text-pink-200 text-center font-serif mb-5">
                                "{selectedGalaxy.quote}"
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <button
                                onClick={() => {
                                    flyToTarget(selectedGalaxy.x, selectedGalaxy.y, selectedGalaxy.z);
                                    setSelectedGalaxy(null);
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                            >
                                <Orbit className="w-4 h-4" />
                                <span>Warp to Galaxy</span>
                            </button>
                            <button
                                onClick={() => setSelectedGalaxy(null)}
                                className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: PLANET / SOLAR SYSTEM BODY ── */}
            {selectedPlanet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-slate-900 to-black border border-white/20 rounded-3xl p-6 shadow-2xl overflow-hidden">
                        <div
                            className="absolute -top-20 -left-20 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none"
                            style={{ backgroundColor: selectedPlanet.color }}
                        />

                        <button
                            onClick={() => setSelectedPlanet(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3.5 mb-4">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 text-2xl"
                                style={{ backgroundColor: `${selectedPlanet.color}22`, borderColor: selectedPlanet.color }}
                            >
                                {selectedPlanet.type === 'sun' ? '☀️' : selectedPlanet.type === 'earth' ? '🌍' : selectedPlanet.type === 'moon' ? '🌙' : selectedPlanet.type === 'blackhole' ? '🕳️' : '🪐'}
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-white">{selectedPlanet.name}</h3>
                                <p className="text-xs text-pink-300 font-medium">{selectedPlanet.title}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/90 text-sm leading-relaxed mb-4">
                            {selectedPlanet.desc}
                        </div>

                        {selectedPlanet.quote && (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 text-xs italic text-pink-200 text-center font-serif mb-5">
                                "{selectedPlanet.quote}"
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <button
                                onClick={() => {
                                    flyToTarget(selectedPlanet.x, selectedPlanet.y, selectedPlanet.z);
                                    setSelectedPlanet(null);
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-pink-600 hover:bg-pink-500 text-white transition-colors"
                            >
                                <Orbit className="w-4 h-4" />
                                <span>Orbit & Focus World</span>
                            </button>
                            <button
                                onClick={() => setSelectedPlanet(null)}
                                className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: STAR DETAILS & POLAROID MEMORY ── */}
            {selectedStar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-slate-900 to-black border border-white/15 rounded-3xl p-6 shadow-2xl overflow-hidden">
                        <div
                            className="absolute -top-20 -left-20 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none"
                            style={{ backgroundColor: STAR_COLORS[selectedStar.color]?.hex || '#fbbf24' }}
                        />

                        <button
                            onClick={() => setSelectedStar(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/20"
                                style={{
                                    backgroundColor: `${STAR_COLORS[selectedStar.color]?.hex || '#fbbf24'}22`,
                                    borderColor: STAR_COLORS[selectedStar.color]?.hex || '#fbbf24'
                                }}
                            >
                                <Star
                                    className="w-6 h-6 animate-pulse"
                                    style={{ color: STAR_COLORS[selectedStar.color]?.hex || '#fbbf24' }}
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">{selectedStar.star_name}</h3>
                                <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {selectedStar.date_str || "Timeless"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        {selectedStar.creator_name || "Partner"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-4 font-mono">
                            ✦ {STAR_TYPES[selectedStar.star_type]?.label || "Standard Star"}
                        </div>

                        {selectedStar.photo_url && (
                            <div className="mb-4 bg-white p-2.5 rounded-xl shadow-xl transform -rotate-1 border border-gray-200">
                                <img
                                    src={selectedStar.photo_url}
                                    alt={selectedStar.star_name}
                                    className="w-full h-44 object-cover rounded-lg"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <p className="text-[11px] text-gray-500 text-center font-serif mt-1 italic">
                                    Captured in our universe
                                </p>
                            </div>
                        )}

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/90 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                            "{selectedStar.memory_text}"
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <button
                                onClick={() => handleDeleteStar(selectedStar.id)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Release Star</span>
                            </button>
                            <button
                                onClick={() => setSelectedStar(null)}
                                className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: PIN / NAME A NEW STAR ── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 to-black border border-pink-500/30 rounded-3xl p-6 shadow-2xl">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Etch a Memory in the Sky</h3>
                                <p className="text-xs text-white/50">Turn a special moment into an eternal glowing star</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddStar} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-white/70 mb-1">Star Name</label>
                                <input
                                    type="text"
                                    value={starName}
                                    onChange={(e) => setStarName(e.target.value)}
                                    placeholder="e.g., Midnight Rooftop Conversation"
                                    maxLength={45}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-white/70 mb-1">The Memory / Note</label>
                                <textarea
                                    value={memoryText}
                                    onChange={(e) => setMemoryText(e.target.value)}
                                    placeholder="Describe this cherished moment with your partner..."
                                    rows={3}
                                    maxLength={500}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-white/70 mb-1">Date of Memory</label>
                                    <input
                                        type="date"
                                        value={dateStr}
                                        onChange={(e) => setDateStr(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-white/70 mb-1">Star Constellation Type</label>
                                    <select
                                        value={starType}
                                        onChange={(e) => setStarType(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500"
                                    >
                                        <option value="single">Standard Star</option>
                                        <option value="binary">Twin Souls (Binary)</option>
                                        <option value="supernova">Supernova Pulse</option>
                                        <option value="diamond">Diamond Promise</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-white/70 mb-1.5">Celestial Color</label>
                                <div className="flex items-center gap-2.5">
                                    {Object.entries(STAR_COLORS).map(([key, item]) => (
                                        <button
                                            type="button"
                                            key={key}
                                            onClick={() => setStarColor(key)}
                                            className={`w-7 h-7 rounded-full transition-transform ${
                                                starColor === key ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                                            }`}
                                            style={{ backgroundColor: item.hex }}
                                            title={item.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-white/70 mb-1 flex items-center gap-1.5">
                                    <Camera className="w-3.5 h-3.5 text-pink-400" />
                                    <span>Memory Photo URL (Optional)</span>
                                </label>
                                <input
                                    type="url"
                                    value={photoUrl}
                                    onChange={(e) => setPhotoUrl(e.target.value)}
                                    placeholder="https://... (Image link of your memory)"
                                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50"
                            >
                                {submitting ? "Naming Star..." : "✨ Name this Star Forever"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: CAST SECRET WISH ── */}
            {isWishModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-sm bg-gradient-to-b from-gray-900 to-black border border-cyan-500/40 rounded-3xl p-6 shadow-2xl">
                        <button
                            onClick={() => setIsWishModalOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-4">
                            <span className="text-4xl">🌠</span>
                            <h3 className="text-lg font-bold text-white mt-2">Make a Secret Wish</h3>
                            <p className="text-xs text-white/50 mt-1">
                                Whispered to the shooting star. It will stay sealed in your Wish Jar until you reveal it!
                            </p>
                        </div>

                        <form onSubmit={handleMakeWish} className="space-y-4">
                            <textarea
                                value={wishText}
                                onChange={(e) => setWishText(e.target.value)}
                                placeholder="I wish we could..."
                                rows={3}
                                maxLength={300}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                            />

                            <button
                                type="submit"
                                disabled={wishSubmitting}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-50"
                            >
                                {wishSubmitting ? "Casting Wish..." : "🌟 Cast Secret Wish"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: WISH JAR ── */}
            {isWishListOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-slate-900 to-black border border-cyan-500/30 rounded-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col">
                        <button
                            onClick={() => setIsWishListOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                                <Heart className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Cosmic Wish Jar</h3>
                                <p className="text-xs text-white/50">Wishes caught from falling stars</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {wishes.length === 0 ? (
                                <div className="text-center py-10 text-white/40 text-xs">
                                    No wishes caught yet! Watch for shooting stars streaking across the sky.
                                </div>
                            ) : (
                                wishes.map((wish) => (
                                    <div
                                        key={wish.id}
                                        className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2"
                                    >
                                        <div className="flex items-center justify-between text-[11px] text-white/50">
                                            <span>By {wish.creator_name}</span>
                                            <span className={`px-2 py-0.5 rounded-full ${
                                                wish.is_revealed
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            }`}>
                                                {wish.is_revealed ? "Revealed" : "Secret Wish"}
                                            </span>
                                        </div>

                                        <p className="text-sm text-white/90 italic">
                                            "{wish.wish_text}"
                                        </p>

                                        {!wish.is_revealed && (
                                            <button
                                                onClick={() => handleRevealWish(wish.id)}
                                                className="self-end flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Reveal to Partner</span>
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
