import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Gamepad2, Flame, Heart, Sparkles, RotateCcw, 
    CheckCircle2, Shuffle, Trophy, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../api';

// Web Audio API Synthesizers for zero-dependency satisfying sound effects
const playSound = (type) => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'click') {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'win') {
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'flip') {
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    } catch {
        // audio context blocked or unsupported
    }
};

export default function Games() {
    const [activeTab, setActiveTab] = useState('rps'); // rps, tod, ttt, wyr
    const [isLiveConnected, setIsLiveConnected] = useState(false);

    const user = JSON.parse(window.localStorage.getItem('user') || '{}');
    const token = window.localStorage.getItem('token');
    const coupleId = user?.couple_id;
    const userId = user?.id;
    const wsRef = useRef(null);
    const onMessageRef = useRef(null);

    // ── 1. MULTIPLAYER WEBSOCKET SETUP ──────────────────────────────────────────
    useEffect(() => {
        if (!coupleId || !token) return;

        const wsBase = process.env.REACT_APP_WS_URL || 
            (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
            (process.env.REACT_APP_API_URL ? new URL(process.env.REACT_APP_API_URL).host : 'localhost:8000');

        const ws = new WebSocket(`${wsBase}/games/ws/${coupleId}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsLiveConnected(true);
        };

        ws.onclose = () => {
            setIsLiveConnected(false);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (onMessageRef.current) {
                    onMessageRef.current(data);
                }
            } catch (e) {
                console.error("WS Parse error", e);
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [coupleId, token]);

    const sendWs = (payload) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        }
    };

    // ───────────────────────────────────────────────────────────────────────────
    // GAME 1: ROCK PAPER SCISSORS STATE & LOGIC
    // ───────────────────────────────────────────────────────────────────────────
    const [rpsMyChoice, setRpsMyChoice] = useState(null);
    const [rpsPartnerLocked, setRpsPartnerLocked] = useState(false);
    const [rpsResult, setRpsResult] = useState(null); // { moves: {}, winner: '', scores: {} }
    const [rpsScores, setRpsScores] = useState({ you: 0, partner: 0, ties: 0 });
    const [rpsCountdown, setRpsCountdown] = useState(null);

    const rpsMoves = [
        { id: 'rock', label: 'Rock', emoji: '🪨', color: 'from-amber-600 to-orange-700' },
        { id: 'paper', label: 'Paper', emoji: '📄', color: 'from-blue-600 to-cyan-700' },
        { id: 'scissors', label: 'Scissors', emoji: '✂️', color: 'from-pink-600 to-rose-700' },
    ];

    const handleRpsSelect = (moveId) => {
        if (rpsMyChoice && !rpsResult) return;
        playSound('click');
        setRpsMyChoice(moveId);
        setRpsResult(null);

        // Send move to partner over WS
        sendWs({
            game: 'rps',
            action: 'move',
            move: moveId
        });

        // Solo fallback if partner is not in room
        if (!isLiveConnected) {
            toast.success("Move locked in! Waiting for partner or playing solo simulation...");
            setTimeout(() => {
                const partnerMove = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
                evaluateRpsSolo(moveId, partnerMove);
            }, 1000);
        }
    };

    const evaluateRpsSolo = (m1, m2) => {
        let winner = 'draw';
        if (m1 === m2) winner = 'draw';
        else if (
            (m1 === 'rock' && m2 === 'scissors') ||
            (m1 === 'paper' && m2 === 'rock') ||
            (m1 === 'scissors' && m2 === 'paper')
        ) {
            winner = 'you';
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
            playSound('win');
        } else {
            winner = 'partner';
        }

        setRpsResult({
            myMove: m1,
            partnerMove: m2,
            winner
        });

        setRpsScores(prev => ({
            ...prev,
            you: winner === 'you' ? prev.you + 1 : prev.you,
            partner: winner === 'partner' ? prev.partner + 1 : prev.partner,
            ties: winner === 'draw' ? prev.ties + 1 : prev.ties
        }));
    };

    const handleRpsReset = () => {
        playSound('click');
        setRpsMyChoice(null);
        setRpsPartnerLocked(false);
        setRpsResult(null);
        sendWs({ game: 'rps', action: 'reset' });
    };

    // ───────────────────────────────────────────────────────────────────────────
    // GAME 2: TRUTH OR DARE STATE & LOGIC
    // ───────────────────────────────────────────────────────────────────────────
    const [todCategory, setTodCategory] = useState('romantic');
    const [todType, setTodType] = useState('truth');
    const [todPrompt, setTodPrompt] = useState({
        type: 'truth',
        category: 'romantic',
        prompt: 'What was the exact moment you realized you had feelings for me?'
    });
    const [todIsFlipping, setTodIsFlipping] = useState(false);
    const [todCompletedCount, setTodCompletedCount] = useState(0);

    const fetchTodPrompt = async (selectedType = todType, selectedCat = todCategory) => {
        try {
            setTodIsFlipping(true);
            playSound('flip');
            const res = await api.get(`/games/truth-or-dare?type=${selectedType}&category=${selectedCat}`);
            setTimeout(() => {
                setTodPrompt(res.data);
                setTodIsFlipping(false);

                // Sync with partner
                sendWs({
                    game: 'truth_or_dare',
                    action: 'sync',
                    payload: res.data
                });
            }, 300);
        } catch (e) {
            setTodIsFlipping(false);
            toast.error("Could not load prompt");
        }
    };

    const handleTodComplete = () => {
        playSound('win');
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
        setTodCompletedCount(c => c + 1);
        toast.success("Awesome! Challenge completed 💕");
    };

    // ───────────────────────────────────────────────────────────────────────────
    // GAME 3: TIC TAC TOE (HEARTS & KISSES)
    // ───────────────────────────────────────────────────────────────────────────
    const [tttBoard, setTttBoard] = useState(Array(9).fill(null));
    const [tttTurn, setTttTurn] = useState('❤️'); // '❤️' or '💋'
    const [tttWinner, setTttWinner] = useState(null); // '❤️', '💋', or 'draw'
    const [tttScores, setTttScores] = useState({ hearts: 0, kisses: 0, draws: 0 });

    const checkTttWinner = (board) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6]             // diags
        ];
        for (let [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line: [a, b, c] };
            }
        }
        if (board.every(cell => cell !== null)) {
            return { winner: 'draw', line: null };
        }
        return null;
    };

    const handleTttClick = (index) => {
        if (tttBoard[index] || tttWinner) return;

        playSound('click');
        const newBoard = [...tttBoard];
        newBoard[index] = tttTurn;
        setTttBoard(newBoard);

        const winResult = checkTttWinner(newBoard);
        if (winResult) {
            setTttWinner(winResult);
            if (winResult.winner !== 'draw') {
                playSound('win');
                confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
                setTttScores(s => ({
                    ...s,
                    hearts: winResult.winner === '❤️' ? s.hearts + 1 : s.hearts,
                    kisses: winResult.winner === '💋' ? s.kisses + 1 : s.kisses
                }));
            } else {
                setTttScores(s => ({ ...s, draws: s.draws + 1 }));
            }
        } else {
            setTttTurn(tttTurn === '❤️' ? '💋' : '❤️');
        }

        // Send move to partner
        sendWs({
            game: 'ttt',
            action: 'move',
            index: index,
            symbol: tttTurn
        });
    };

    const handleTttReset = () => {
        playSound('click');
        setTttBoard(Array(9).fill(null));
        setTttWinner(null);
        setTttTurn('❤️');
        sendWs({ game: 'ttt', action: 'reset' });
    };

    // ───────────────────────────────────────────────────────────────────────────
    // GAME 4: WOULD YOU RATHER
    // ───────────────────────────────────────────────────────────────────────────
    const [wyrData, setWyrData] = useState({
        id: 1,
        optionA: "Wake up to breakfast in bed made by me every Sunday",
        optionB: "Get a 20-minute relaxing massage from me every night"
    });
    const [myWyrChoice, setMyWyrChoice] = useState(null); // 'A' or 'B'
    const [partnerWyrChoice, setPartnerWyrChoice] = useState(null);

    const fetchWyr = async () => {
        try {
            playSound('flip');
            setMyWyrChoice(null);
            setPartnerWyrChoice(null);
            const res = await api.get('/games/would-you-rather');
            setWyrData(res.data);
            sendWs({
                game: 'would_you_rather',
                action: 'sync',
                payload: res.data
            });
        } catch {
            toast.error("Failed to fetch scenario");
        }
    };

    const handleWyrPick = (choice) => {
        playSound('click');
        setMyWyrChoice(choice);
        sendWs({
            game: 'would_you_rather',
            action: 'sync_choice',
            payload: { choice, wyrId: wyrData.id }
        });

        // Solo fallback
        if (!isLiveConnected) {
            setTimeout(() => {
                const randomChoice = Math.random() > 0.5 ? 'A' : 'B';
                setPartnerWyrChoice(randomChoice);
                if (randomChoice === choice) {
                    playSound('win');
                    confetti({ particleCount: 50, spread: 50 });
                }
            }, 600);
        }
    };

    // ───────────────────────────────────────────────────────────────────────────
    // INCOMING WEBSOCKET DISPATCHER
    // ───────────────────────────────────────────────────────────────────────────
    const handleIncomingWsMessage = useCallback((data) => {
        switch (data.type) {
            case 'rps_locked':
                setRpsPartnerLocked(true);
                toast('Partner made their move! ⚡', { icon: '🤫' });
                break;

            case 'rps_reveal':
                setRpsPartnerLocked(false);
                // Start a brief 3-2-1 reveal animation
                setRpsCountdown(3);
                setTimeout(() => setRpsCountdown(2), 500);
                setTimeout(() => setRpsCountdown(1), 1000);
                setTimeout(() => {
                    setRpsCountdown(null);
                    const myMove = data.moves[userId];
                    const otherUserId = Object.keys(data.moves).find(id => id !== userId);
                    const partnerMove = data.moves[otherUserId];

                    const didIWin = data.winner === userId;
                    const isDraw = data.winner === 'draw';

                    setRpsResult({
                        myMove,
                        partnerMove,
                        winner: isDraw ? 'draw' : (didIWin ? 'you' : 'partner')
                    });

                    if (didIWin) {
                        playSound('win');
                        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
                    }

                    // Update scores
                    setRpsScores(prev => ({
                        ...prev,
                        you: didIWin ? prev.you + 1 : prev.you,
                        partner: (!didIWin && !isDraw) ? prev.partner + 1 : prev.partner,
                        ties: isDraw ? prev.ties + 1 : prev.ties
                    }));
                }, 1500);
                break;

            case 'rps_reset':
                setRpsMyChoice(null);
                setRpsPartnerLocked(false);
                setRpsResult(null);
                break;

            case 'ttt_update':
                setTttBoard(prev => {
                    const next = [...prev];
                    next[data.index] = data.symbol;
                    const res = checkTttWinner(next);
                    if (res) {
                        setTttWinner(res);
                        if (res.winner !== 'draw') {
                            playSound('win');
                            confetti({ particleCount: 80, spread: 70 });
                        }
                    } else {
                        setTttTurn(data.symbol === '❤️' ? '💋' : '❤️');
                    }
                    return next;
                });
                break;

            case 'ttt_reset':
                setTttBoard(Array(9).fill(null));
                setTttWinner(null);
                setTttTurn('❤️');
                break;

            case 'truth_or_dare_sync':
                setTodPrompt(data.payload);
                setTodType(data.payload.type);
                setTodCategory(data.payload.category);
                playSound('flip');
                toast("Partner drew a card! 💌", { icon: '✨' });
                break;

            case 'would_you_rather_sync':
                setWyrData(data.payload);
                setMyWyrChoice(null);
                setPartnerWyrChoice(null);
                playSound('flip');
                break;

            default:
                break;
        }
    }, [userId]);
    onMessageRef.current = handleIncomingWsMessage;

    return (
        <div className="min-h-screen pb-32 pt-8 px-4 sm:px-6 max-w-4xl mx-auto animate-fade-in text-white">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-2xl shadow-lg shadow-pink-500/30">
                            <Gamepad2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                                LovePlay Arena
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-400">
                                Fun, romantic & real-time couple games
                            </p>
                        </div>
                    </div>
                </div>

                {/* Connection Status Pill */}
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium backdrop-blur-xl transition-all ${
                    isLiveConnected 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                        : 'bg-white/5 border-white/10 text-gray-400'
                }`}>
                    <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    {isLiveConnected ? 'Partner Live Synced' : 'Solo / Offline Ready'}
                </div>
            </div>

            {/* Game Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl mb-8">
                {[
                    { id: 'rps', label: 'RPS Arena', icon: Zap, color: 'text-amber-400' },
                    { id: 'tod', label: 'Truth or Dare', icon: Flame, color: 'text-pink-400' },
                    { id: 'ttt', label: 'Hearts & Kisses', icon: Heart, color: 'text-rose-400' },
                    { id: 'wyr', label: 'Would You Rather', icon: Sparkles, color: 'text-purple-400' }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                playSound('click');
                                setActiveTab(tab.id);
                            }}
                            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 ${
                                isActive 
                                    ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white shadow-lg shadow-purple-500/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 1. ROCK PAPER SCISSORS ARENA */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'rps' && (
                <div className="space-y-6">
                    {/* Score Bar */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-black/30 border border-white/10 rounded-2xl text-center">
                        <div>
                            <p className="text-xs text-gray-400 font-medium">YOU</p>
                            <p className="text-2xl font-bold text-pink-400">{rpsScores.you}</p>
                        </div>
                        <div className="border-x border-white/10">
                            <p className="text-xs text-gray-400 font-medium">TIES</p>
                            <p className="text-2xl font-bold text-gray-300">{rpsScores.ties}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">PARTNER</p>
                            <p className="text-2xl font-bold text-purple-400">{rpsScores.partner}</p>
                        </div>
                    </div>

                    {/* Arena Stage */}
                    <div className="p-8 sm:p-12 bg-gradient-to-b from-purple-900/20 to-black/40 border border-purple-500/20 rounded-3xl backdrop-blur-xl text-center relative overflow-hidden shadow-2xl">
                        {/* Background glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

                        {rpsCountdown !== null ? (
                            <div className="py-12 animate-bounce">
                                <div className="text-7xl font-black bg-gradient-to-r from-pink-400 to-amber-300 bg-clip-text text-transparent">
                                    {rpsCountdown}
                                </div>
                                <p className="text-sm text-gray-400 mt-3 font-semibold tracking-widest uppercase">
                                    Revealing Moves...
                                </p>
                            </div>
                        ) : rpsResult ? (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-center gap-8 sm:gap-16">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 mb-2 font-medium">You picked</p>
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/5 border border-white/20 flex items-center justify-center text-5xl shadow-xl">
                                            {rpsMoves.find(m => m.id === rpsResult.myMove)?.emoji || '❓'}
                                        </div>
                                    </div>

                                    <div className="text-2xl font-black text-gray-500">VS</div>

                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 mb-2 font-medium">Partner picked</p>
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/5 border border-white/20 flex items-center justify-center text-5xl shadow-xl">
                                            {rpsMoves.find(m => m.id === rpsResult.partnerMove)?.emoji || '❓'}
                                        </div>
                                    </div>
                                </div>

                                {/* Banner */}
                                <div className="pt-4">
                                    {rpsResult.winner === 'you' && (
                                        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-lg">
                                            <Trophy className="w-5 h-5 text-emerald-400" /> You Won this round! 🎉
                                        </div>
                                    )}
                                    {rpsResult.winner === 'partner' && (
                                        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-lg">
                                            Partner Won this round! 💕
                                        </div>
                                    )}
                                    {rpsResult.winner === 'draw' && (
                                        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-lg">
                                            It's a Tie! Great minds think alike 🤝
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <button
                                        onClick={handleRpsReset}
                                        className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-pink-500/30 transition-all hover:scale-105"
                                    >
                                        <RotateCcw className="w-4 h-4" /> Next Round
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white">Choose Your Weapon</h3>
                                    <p className="text-xs text-gray-400">
                                        {rpsMyChoice 
                                            ? (rpsPartnerLocked ? "Both locked! Click Rematch or waiting..." : "Locked in! Waiting for partner to choose...")
                                            : (rpsPartnerLocked ? "Partner has locked their move! Pick yours now! ⚡" : "Make your secret pick...")
                                        }
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                                    {rpsMoves.map(m => {
                                        const isSelected = rpsMyChoice === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                disabled={!!rpsMyChoice}
                                                onClick={() => handleRpsSelect(m.id)}
                                                className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-300 ${
                                                    isSelected
                                                        ? 'bg-gradient-to-b ' + m.color + ' border-white/40 scale-105 shadow-xl shadow-pink-500/30'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105'
                                                } ${rpsMyChoice && !isSelected ? 'opacity-40' : ''}`}
                                            >
                                                <span className="text-4xl sm:text-5xl mb-2 filter drop-shadow-md">{m.emoji}</span>
                                                <span className="text-xs font-semibold text-gray-200">{m.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {rpsMyChoice && (
                                    <div className="pt-2">
                                        <button
                                            onClick={handleRpsReset}
                                            className="text-xs text-gray-400 hover:text-white underline underline-offset-4"
                                        >
                                            Reset / Change Move
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 2. TRUTH OR DARE */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'tod' && (
                <div className="space-y-6">
                    {/* Category Selector */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {[
                            { id: 'romantic', label: '💖 Romantic' },
                            { id: 'deep', label: '💭 Deep & Soulful' },
                            { id: 'spicy', label: '🌶️ Spicy & Flirty' },
                            { id: 'funny', label: '😂 Funny & Wild' }
                        ].map(c => (
                            <button
                                key={c.id}
                                onClick={() => {
                                    playSound('click');
                                    setTodCategory(c.id);
                                    fetchTodPrompt(todType, c.id);
                                }}
                                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                                    todCategory === c.id
                                        ? 'bg-white/20 border-pink-400/60 text-white shadow-lg shadow-pink-500/20'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>

                    {/* Mode Toggle: Truth vs Dare */}
                    <div className="flex justify-center">
                        <div className="inline-flex p-1 bg-black/40 border border-white/10 rounded-2xl">
                            <button
                                onClick={() => {
                                    playSound('click');
                                    setTodType('truth');
                                    fetchTodPrompt('truth', todCategory);
                                }}
                                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                                    todType === 'truth'
                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                💬 TRUTH
                            </button>
                            <button
                                onClick={() => {
                                    playSound('click');
                                    setTodType('dare');
                                    fetchTodPrompt('dare', todCategory);
                                }}
                                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                                    todType === 'dare'
                                        ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                🔥 DARE
                            </button>
                        </div>
                    </div>

                    {/* 3D Prompt Card */}
                    <div className="perspective-1000 max-w-lg mx-auto">
                        <div className={`p-8 sm:p-12 rounded-3xl border transition-all duration-500 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl ${
                            todType === 'truth'
                                ? 'bg-gradient-to-b from-blue-900/30 via-indigo-900/20 to-black/50 border-blue-500/30'
                                : 'bg-gradient-to-b from-rose-900/30 via-pink-900/20 to-black/50 border-pink-500/30'
                        } ${todIsFlipping ? 'scale-95 opacity-50 rotate-y-90' : 'scale-100 opacity-100'}`}>
                            
                            {/* Card badge */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-6 bg-white/10 border border-white/15">
                                {todType === 'truth' ? '💬 Truth Prompt' : '🔥 Dare Challenge'} • {todCategory}
                            </div>

                            {/* Prompt text */}
                            <p className="text-lg sm:text-2xl font-serif leading-relaxed text-gray-100 mb-8 min-h-[5rem] flex items-center justify-center">
                                "{todPrompt.prompt}"
                            </p>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <button
                                    onClick={() => fetchTodPrompt(todType, todCategory)}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all hover:scale-105"
                                >
                                    <Shuffle className="w-4 h-4" /> Next Prompt
                                </button>
                                <button
                                    onClick={handleTodComplete}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold shadow-lg shadow-teal-500/20 transition-all hover:scale-105"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Completed!
                                </button>
                            </div>

                            {todCompletedCount > 0 && (
                                <p className="text-[11px] text-gray-400 mt-4">
                                    ❤️ {todCompletedCount} challenges completed together this session!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 3. LOVE TIC TAC TOE */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'ttt' && (
                <div className="space-y-6 max-w-md mx-auto">
                    {/* Score Bar */}
                    <div className="grid grid-cols-3 gap-3 p-3 bg-black/30 border border-white/10 rounded-2xl text-center">
                        <div>
                            <p className="text-xs text-gray-400 font-medium">❤️ Hearts</p>
                            <p className="text-xl font-bold text-rose-400">{tttScores.hearts}</p>
                        </div>
                        <div className="border-x border-white/10">
                            <p className="text-xs text-gray-400 font-medium">Draws</p>
                            <p className="text-xl font-bold text-gray-400">{tttScores.draws}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">💋 Kisses</p>
                            <p className="text-xl font-bold text-pink-400">{tttScores.kisses}</p>
                        </div>
                    </div>

                    {/* Turn Indicator */}
                    <div className="text-center">
                        {tttWinner ? (
                            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold text-sm">
                                {tttWinner.winner === 'draw' 
                                    ? "It's a Draw! Both won in love! 💕" 
                                    : `${tttWinner.winner} Wins the match! 🏆`}
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 text-sm text-gray-300 font-medium">
                                Turn: <span className="text-2xl">{tttTurn}</span>
                            </div>
                        )}
                    </div>

                    {/* 3x3 Grid */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-black/40 border border-purple-500/20 rounded-3xl backdrop-blur-xl shadow-2xl">
                        {tttBoard.map((val, idx) => {
                            const isWinCell = tttWinner?.line?.includes(idx);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleTttClick(idx)}
                                    className={`aspect-square rounded-2xl border flex items-center justify-center text-4xl sm:text-5xl transition-all duration-300 ${
                                        isWinCell 
                                            ? 'bg-gradient-to-tr from-pink-500/40 to-purple-600/40 border-pink-400 scale-105 shadow-lg shadow-pink-500/30' 
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {val && <span className="animate-pop">{val}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Reset Button */}
                    <div className="text-center">
                        <button
                            onClick={handleTttReset}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all hover:scale-105"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Restart Board
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 4. WOULD YOU RATHER */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'wyr' && (
                <div className="space-y-6 max-w-xl mx-auto">
                    <div className="text-center space-y-1">
                        <h3 className="text-xl font-bold text-white">Couples Would You Rather</h3>
                        <p className="text-xs text-gray-400">Vote secretly and see if your choices align!</p>
                    </div>

                    <div className="space-y-4">
                        {/* Option A */}
                        <button
                            onClick={() => handleWyrPick('A')}
                            className={`w-full p-6 sm:p-8 rounded-3xl border text-left transition-all duration-300 relative overflow-hidden group ${
                                myWyrChoice === 'A'
                                    ? 'bg-gradient-to-r from-pink-600/40 to-purple-600/40 border-pink-400 shadow-xl shadow-pink-500/20 scale-[1.02]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="inline-block px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold mb-3 border border-pink-500/30">
                                        OPTION A
                                    </span>
                                    <p className="text-base sm:text-lg font-medium text-gray-100 group-hover:text-white">
                                        {wyrData.optionA}
                                    </p>
                                </div>
                                {myWyrChoice === 'A' && (
                                    <CheckCircle2 className="w-6 h-6 text-pink-400 shrink-0 animate-pop" />
                                )}
                            </div>
                        </button>

                        <div className="text-center font-bold text-xs tracking-widest text-gray-500">OR</div>

                        {/* Option B */}
                        <button
                            onClick={() => handleWyrPick('B')}
                            className={`w-full p-6 sm:p-8 rounded-3xl border text-left transition-all duration-300 relative overflow-hidden group ${
                                myWyrChoice === 'B'
                                    ? 'bg-gradient-to-r from-indigo-600/40 to-purple-600/40 border-indigo-400 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-3 border border-indigo-500/30">
                                        OPTION B
                                    </span>
                                    <p className="text-base sm:text-lg font-medium text-gray-100 group-hover:text-white">
                                        {wyrData.optionB}
                                    </p>
                                </div>
                                {myWyrChoice === 'B' && (
                                    <CheckCircle2 className="w-6 h-6 text-indigo-400 shrink-0 animate-pop" />
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Result Match Banner */}
                    {myWyrChoice && partnerWyrChoice && (
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center animate-fade-in">
                            {myWyrChoice === partnerWyrChoice ? (
                                <p className="text-sm font-bold text-emerald-400">
                                    🎉 Perfect Match! You both picked Option {myWyrChoice}!
                                </p>
                            ) : (
                                <p className="text-sm font-bold text-purple-300">
                                    ⚡ Opposites Attract! You picked {myWyrChoice}, partner picked {partnerWyrChoice}!
                                </p>
                            )}
                        </div>
                    )}

                    {/* Next Question */}
                    <div className="text-center pt-2">
                        <button
                            onClick={fetchWyr}
                            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 transition-all hover:scale-105"
                        >
                            <Shuffle className="w-4 h-4" /> Next Scenario
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}