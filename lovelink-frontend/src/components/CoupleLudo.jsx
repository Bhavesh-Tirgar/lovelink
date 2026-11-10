import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Dices, RotateCcw, Crown, Volume2, VolumeX, ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';

// Web Audio synthesizer for Authentic Ludo Sound Effects
const playLudoSound = (type, soundEnabled = true) => {
    if (!soundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        if (type === 'dice') {
            // Dice roll rattling sound
            for (let i = 0; i < 6; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(180 + Math.random() * 260, now + i * 0.04);
                gain.gain.setValueAtTime(0.25, now + i * 0.04);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + 0.035);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.04);
                osc.stop(now + i * 0.04 + 0.035);
            }
        } else if (type === 'step') {
            // Goti step click
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'open') {
            // Goti opening on 6
            [400, 600, 800].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                gain.gain.setValueAtTime(0.25, now + idx * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.1);
            });
        } else if (type === 'cut') {
            // Opponent goti cut sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.3);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'home') {
            // Reached home fanfare
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0.25, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.2);
            });
        } else if (type === 'win') {
            // Full game victory
            [440, 554, 659, 880, 1108].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.35, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.4);
            });
        }
    } catch {}
};

// ── 52 Standard Continuous Clockwise Ludo Track Coordinates [row, col] on a 15x15 Grid ──
const TRACK_COORDS = [
    // Red arm going right (indices 0 to 4)
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    // Green arm going up (indices 5 to 10)
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    // Top turn (index 11)
    [0, 7],
    // Green arm going down (indices 12 to 17)
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    // Yellow arm going right (indices 18 to 23)
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    // Right turn (index 24)
    [7, 14],
    // Yellow arm going left (indices 25 to 30)
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    // Blue arm going down (indices 31 to 36)
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    // Bottom turn (index 37)
    [14, 7],
    // Blue arm going up (indices 38 to 43)
    [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    // Red arm going left (indices 44 to 49)
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    // Left turn (indices 50 to 51)
    [7, 0],
    [6, 0]
];

// 8 Classical Star Safe Squares on the 52-cell track
const SAFE_STAR_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Player 1 (Red / Rose) Home Stretch leading into center triangle
const RED_HOME_STRETCH = [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]
];

// Player 2 (Yellow / Amber) Home Stretch leading into center triangle
const YELLOW_HOME_STRETCH = [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9]
];

// 4 Base slot positions [row, col] inside the large circular base wells
const RED_BASE_SLOTS = [
    [1.8, 1.8], [1.8, 4.2], [4.2, 1.8], [4.2, 4.2]
];
const YELLOW_BASE_SLOTS = [
    [10.8, 10.8], [10.8, 13.2], [13.2, 10.8], [13.2, 13.2]
];

// Realistic 3D Ludo Die Component with Authentic Dots
function RealisticDice({ value = 6, rolling = false, onClick, disabled = false, isTurn = false, color = 'red' }) {
    const renderDots = (num) => {
        const dotColor = num === 1 ? 'bg-red-500' : 'bg-gray-800';
        switch (num) {
            case 1:
                return (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className={`w-3.5 h-3.5 rounded-full ${dotColor} shadow-inner`} />
                    </div>
                );
            case 2:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1">
                        <div className="flex justify-start"><span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} /></div>
                        <div className="flex justify-end"><span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} /></div>
                    </div>
                );
            case 3:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1">
                        <div className="flex justify-start"><span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} /></div>
                        <div className="flex justify-center"><span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} /></div>
                        <div className="flex justify-end"><span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} /></div>
                    </div>
                );
            case 4:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1">
                        <div className="flex justify-between">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                        <div className="flex justify-between">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1">
                        <div className="flex justify-between">
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                        <div className="flex justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-inner" />
                        </div>
                        <div className="flex justify-between">
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1">
                        <div className="flex justify-between">
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                        <div className="flex justify-between">
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                        <div className="flex justify-between">
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2 h-2 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative w-12 h-12 rounded-xl transition-all select-none flex items-center justify-center ${
                rolling ? 'animate-spin scale-110' : ''
            } ${
                isTurn && !disabled
                    ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-bounce cursor-pointer'
                    : 'cursor-default opacity-85'
            }`}
            style={{
                background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
                boxShadow: isTurn && !disabled
                    ? '4px 4px 10px rgba(0,0,0,0.3), -2px -2px 6px rgba(255,255,255,0.8)'
                    : '2px 2px 5px rgba(0,0,0,0.25)',
                border: '1px solid #d4d4d8'
            }}
        >
            <div className="w-10 h-10 rounded-lg p-0.5">
                {renderDots(value || 6)}
            </div>
        </button>
    );
}

// 3D Realistic Ludo Pawn (Goti) SVG Component
function LudoPawn({ color = 'red', isClickable = false, isOpponent = false, count = 1 }) {
    const isRed = color === 'pink' || color === 'red';
    const mainGrad = isRed ? ['#ff4d6d', '#c9184a', '#800f2f'] : ['#facc15', '#eab308', '#ca8a04'];
    const ringColor = isRed ? '#ffd166' : '#ffffff';

    return (
        <div className={`relative w-full h-full flex items-center justify-center ${isClickable ? 'cursor-pointer' : ''}`}>
            {/* Pulsing ring when token is actionable */}
            {isClickable && (
                <div className="absolute inset-[-4px] rounded-full border-2 border-yellow-300 animate-ping opacity-75" />
            )}

            {/* Realistic 3D Pawn SVG */}
            <svg
                viewBox="0 0 32 36"
                className={`w-[85%] h-[85%] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transition-transform duration-200 ${
                    isClickable ? 'scale-110 -translate-y-1' : ''
                }`}
            >
                <defs>
                    <radialGradient id={`head-grad-${color}`} cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                        <stop offset="40%" stopColor={mainGrad[0]} />
                        <stop offset="100%" stopColor={mainGrad[2]} />
                    </radialGradient>
                    <linearGradient id={`body-grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={mainGrad[0]} />
                        <stop offset="60%" stopColor={mainGrad[1]} />
                        <stop offset="100%" stopColor={mainGrad[2]} />
                    </linearGradient>
                </defs>

                {/* Base Rim */}
                <ellipse cx="16" cy="31" rx="13" ry="4" fill="#1c1917" opacity="0.3" />
                <path d="M5 28 C 5 26, 27 26, 27 28 L 29 32 C 29 34, 3 34, 3 32 Z" fill={`url(#body-grad-${color})`} />
                <ellipse cx="16" cy="28" rx="11" ry="3" fill={ringColor} opacity="0.9" />

                {/* Pawn Body / Stem */}
                <path d="M10 21 C 10 25, 6 28, 6 28 L 26 28 C 26 28, 22 25, 22 21 C 22 17, 18 16, 16 16 C 14 16, 10 17, 10 21 Z" fill={`url(#body-grad-${color})`} />

                {/* Collar Ring */}
                <ellipse cx="16" cy="15" rx="5" ry="1.5" fill={ringColor} />

                {/* Spherical Head */}
                <circle cx="16" cy="9" r="7" fill={`url(#head-grad-${color})`} />
            </svg>

            {/* Multiple tokens stacked badge */}
            {count > 1 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/80 text-white text-[9px] font-black flex items-center justify-center border border-white/60 shadow">
                    {count}
                </span>
            )}
        </div>
    );
}

export default function CoupleLudo({
    userId,
    coupleId,
    partnerName = "Partner",
    sendWs,
    ludoState,
    isLiveConnected
}) {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [rolling, setRolling] = useState(false);
    const [diceDisplay, setDiceDisplay] = useState(ludoState?.dice || 6);

    // Color Assignment: Red/Pink for Player 1, Yellow/Blue for Player 2
    const isPink = ludoState?.player_pink ? String(ludoState.player_pink) === String(userId) : true;
    const myColor = isPink ? 'pink' : 'blue';
    const partnerColor = isPink ? 'blue' : 'pink';

    const turn = ludoState?.turn || 'pink';
    const isMyTurn = turn === myColor;

    // Tokens arrays (standard 4 tokens per player)
    const tokens = useMemo(() => {
        const rawTokens = ludoState?.tokens || {};
        const pTokens = Array.isArray(rawTokens.pink) && rawTokens.pink.length === 4
            ? rawTokens.pink
            : (rawTokens.pink ? [...rawTokens.pink, -1, -1] : [-1, -1, -1, -1]);
        const bTokens = Array.isArray(rawTokens.blue) && rawTokens.blue.length === 4
            ? rawTokens.blue
            : (rawTokens.blue ? [...rawTokens.blue, -1, -1] : [-1, -1, -1, -1]);
        return { pink: pTokens.slice(0, 4), blue: bTokens.slice(0, 4) };
    }, [ludoState?.tokens]);

    const myTokens = useMemo(() => tokens[myColor] || [-1, -1, -1, -1], [tokens, myColor]);
    const partnerTokens = useMemo(() => tokens[partnerColor] || [-1, -1, -1, -1], [tokens, partnerColor]);

    const currentDice = ludoState?.dice;
    const winner = ludoState?.winner;

    // Standard Ludo move validation:
    // - -1: In Base, requires a 6 to open onto start square (step 0)
    // - 56: Home, finished
    // - Total track steps: 0 to 50 on outer track, 51 to 55 on home stretch, 56 is HOME
    const canTokenMove = useCallback((step, diceVal) => {
        if (!diceVal) return false;
        if (step === -1) return diceVal === 6;
        if (step === 56) return false;
        return step + diceVal <= 56;
    }, []);

    // Check if player has at least one valid move with current dice
    const hasAnyValidMove = useMemo(() => {
        if (!currentDice) return false;
        return myTokens.some(step => canTokenMove(step, currentDice));
    }, [currentDice, myTokens, canTokenMove]);

    // Auto pass turn if rolled dice has no valid moves
    useEffect(() => {
        if (isMyTurn && currentDice && !rolling && !hasAnyValidMove && !winner) {
            const timer = setTimeout(() => {
                sendWs({
                    game: 'ludo',
                    action: 'pass_turn'
                });
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isMyTurn, currentDice, rolling, hasAnyValidMove, winner, sendWs]);

    // Roll Dice with Realistic 3D Shuffle
    const handleRollDice = () => {
        if (!isMyTurn || rolling || winner || currentDice) return;

        setRolling(true);
        playLudoSound('dice', soundEnabled);

        let count = 0;
        const interval = setInterval(() => {
            setDiceDisplay(Math.floor(Math.random() * 6) + 1);
            count++;
            if (count > 8) {
                clearInterval(interval);
                const finalDice = Math.floor(Math.random() * 6) + 1;
                setDiceDisplay(finalDice);
                setRolling(false);

                sendWs({
                    game: 'ludo',
                    action: 'roll_dice',
                    dice: finalDice
                });
            }
        }, 50);
    };

    // Calculate absolute track index on the 52-cell circle
    const getTrackIndex = useCallback((step, color) => {
        if (step < 0 || step > 50) return null;
        if (color === 'pink') return step % 52;
        return (step + 26) % 52;
    }, []);

    // Move Token
    const handleMoveToken = (tokenIdx) => {
        if (!isMyTurn || !currentDice || rolling || winner) return;

        const currentStep = myTokens[tokenIdx];
        if (!canTokenMove(currentStep, currentDice)) return;

        let nextStep;
        if (currentStep === -1) {
            nextStep = 0; // Open from base onto start cell
            playLudoSound('open', soundEnabled);
        } else {
            nextStep = currentStep + currentDice;
            playLudoSound(nextStep === 56 ? 'home' : 'step', soundEnabled);
        }

        // Check if opponent token is cut
        let opponentCutIdx = null;
        const myTrackIdx = getTrackIndex(nextStep, myColor);

        // Can only cut on outer track squares that are NOT safe star squares
        if (myTrackIdx !== null && !SAFE_STAR_INDICES.includes(myTrackIdx)) {
            partnerTokens.forEach((pStep, pIdx) => {
                const partnerTrackIdx = getTrackIndex(pStep, partnerColor);
                if (partnerTrackIdx !== null && partnerTrackIdx === myTrackIdx && opponentCutIdx === null) {
                    opponentCutIdx = pIdx;
                    playLudoSound('cut', soundEnabled);
                }
            });
        }

        // Check Win Condition: All 4 tokens reached home (step 56)
        const updatedTokens = [...myTokens];
        updatedTokens[tokenIdx] = nextStep;
        const isGameWon = updatedTokens.every(s => s === 56);

        if (isGameWon) {
            playLudoSound('win', soundEnabled);
            confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.5 },
                colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899']
            });
        }

        // Bonus roll if rolled a 6, captured opponent, or reached home
        const grantsBonusRoll = currentDice === 6 || opponentCutIdx !== null || nextStep === 56;
        const nextTurn = isGameWon ? null : (grantsBonusRoll ? myColor : partnerColor);

        sendWs({
            game: 'ludo',
            action: 'move_token',
            color: myColor,
            token_idx: tokenIdx,
            new_pos: nextStep,
            opponent_cut_idx: opponentCutIdx,
            next_turn: nextTurn,
            winner: isGameWon ? myColor : null
        });
    };

    // Reset game / Rematch
    const handleReset = () => {
        sendWs({
            game: 'ludo',
            action: 'reset'
        });
    };

    // Convert player step to board [row, col]
    const getBoardPosition = useCallback((step, color, tokenIdx) => {
        if (step === -1) {
            return color === 'pink' ? RED_BASE_SLOTS[tokenIdx] : YELLOW_BASE_SLOTS[tokenIdx];
        }
        if (step >= 0 && step <= 50) {
            const trackIdx = getTrackIndex(step, color);
            return TRACK_COORDS[trackIdx];
        }
        if (step >= 51 && step <= 55) {
            const stretchIdx = step - 51;
            return color === 'pink' ? RED_HOME_STRETCH[stretchIdx] : YELLOW_HOME_STRETCH[stretchIdx];
        }
        // Step 56: Home center
        return color === 'pink' ? [7, 6.2] : [7, 7.8];
    }, [getTrackIndex]);

    // Compute token stacking to avoid overlap when 2+ tokens share a square
    const allTokensOnBoard = useMemo(() => {
        const list = [];
        myTokens.forEach((s, idx) => {
            const [r, c] = getBoardPosition(s, myColor, idx);
            list.push({ isMe: true, color: myColor, tokenIdx: idx, step: s, row: r, col: c });
        });
        partnerTokens.forEach((s, idx) => {
            const [r, c] = getBoardPosition(s, partnerColor, idx);
            list.push({ isMe: false, color: partnerColor, tokenIdx: idx, step: s, row: r, col: c });
        });
        return list;
    }, [myTokens, partnerTokens, myColor, partnerColor, getBoardPosition]);

    // Group by coordinate key to calculate stacking offsets
    const tokenOffsets = useMemo(() => {
        const groups = {};
        allTokensOnBoard.forEach(item => {
            if (item.step === -1) return; // Base slots don't stack
            const key = `${Math.round(item.row * 10)}_${Math.round(item.col * 10)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    }, [allTokensOnBoard]);

    // Scores
    const myScore = ludoState?.scores?.[userId] || 0;
    const partnerId = Object.keys(ludoState?.scores || {}).find(k => k !== userId);
    const partnerScore = (partnerId && ludoState?.scores?.[partnerId]) || 0;

    const myHomeCount = myTokens.filter(s => s === 56).length;
    const partnerHomeCount = partnerTokens.filter(s => s === 56).length;

    return (
        <div className="flex flex-col items-center max-w-xl mx-auto w-full px-2 sm:px-4 py-2 font-sans select-none animate-in fade-in duration-500">
            {/* Top Bar Header */}
            <div className="w-full flex items-center justify-between gap-3 mb-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-gradient-to-br from-red-500/20 via-yellow-500/20 to-green-500/20 border border-amber-500/30 text-amber-300">
                        <Dices size={20} />
                    </span>
                    <div>
                        <h2 className="text-base font-extrabold text-white flex items-center gap-1.5 tracking-wide">
                            Ludo King 1v1
                        </h2>
                        <p className="text-[11px] text-gray-400">
                            Score — You: <strong className="text-rose-400">{myScore}</strong> • {partnerName}: <strong className="text-amber-400">{partnerScore}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSoundEnabled(s => !s)}
                        className={`p-2 rounded-xl border transition-all ${soundEnabled ? 'bg-white/10 text-amber-300 border-amber-500/30' : 'bg-white/5 text-gray-500 border-white/10'}`}
                        title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
                    >
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow"
                        title="New Round / Swap Colors"
                    >
                        <RotateCcw size={14} />
                        <span>Rematch</span>
                    </button>
                </div>
            </div>

            {/* ── PLAYER STATUS & DICE CONTROLS ─────────────────────── */}
            <div className="w-full mb-2 grid grid-cols-2 gap-2">
                {/* You (Player 1) */}
                <div
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isMyTurn
                            ? 'bg-gradient-to-r from-rose-950/70 to-black/60 border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                            : 'bg-black/40 border-white/10 opacity-75'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow ${
                            myColor === 'pink' ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-amber-400 to-yellow-600'
                        }`}>
                            {myColor === 'pink' ? '🔴' : '🟡'}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1">
                                <span>You</span>
                                {isMyTurn && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                            </div>
                            <div className="text-[10px] text-gray-400">
                                {myHomeCount}/4 In Home
                            </div>
                        </div>
                    </div>

                    <RealisticDice
                        value={isMyTurn ? (currentDice || diceDisplay) : diceDisplay}
                        rolling={rolling}
                        onClick={handleRollDice}
                        disabled={!isMyTurn || rolling || !!currentDice || !!winner}
                        isTurn={isMyTurn && !currentDice && !winner}
                        color={myColor}
                    />
                </div>

                {/* Partner (Player 2) */}
                <div
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                        !isMyTurn
                            ? 'bg-gradient-to-r from-amber-950/70 to-black/60 border-amber-500 ring-2 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-black/40 border-white/10 opacity-75'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow ${
                            partnerColor === 'pink' ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-amber-400 to-yellow-600'
                        }`}>
                            {partnerColor === 'pink' ? '🔴' : '🟡'}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1">
                                <span className="truncate max-w-[80px]">{partnerName}</span>
                                {!isMyTurn && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                            </div>
                            <div className="text-[10px] text-gray-400">
                                {partnerHomeCount}/4 In Home
                            </div>
                        </div>
                    </div>

                    <RealisticDice
                        value={!isMyTurn ? (currentDice || diceDisplay) : diceDisplay}
                        rolling={false}
                        disabled={true}
                        isTurn={!isMyTurn && !currentDice && !winner}
                        color={partnerColor}
                    />
                </div>
            </div>

            {/* Turn Status Guide Banner */}
            <div className="w-full mb-2 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between text-xs">
                {winner ? (
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 mx-auto">
                        🏆 {winner === myColor ? 'Congratulations! You won the Ludo match!' : `${partnerName} won the match!`}
                    </span>
                ) : isMyTurn ? (
                    <span className="text-amber-300 font-bold flex items-center gap-1 mx-auto animate-pulse">
                        {currentDice ? `🎲 Rolled ${currentDice}! Tap a highlighted token to move.` : '✨ Your Turn! Tap your 3D Dice to roll.'}
                    </span>
                ) : (
                    <span className="text-gray-400 flex items-center gap-1.5 mx-auto">
                        ⏳ Waiting for {partnerName} to roll...
                    </span>
                )}
            </div>

            {/* ── AUTHENTIC 15x15 LUDO BOARD ───────────────────────────── */}
            <div className="relative p-2.5 rounded-3xl bg-[#1e1429] border-4 border-[#3a284c] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <div
                    className="grid grid-cols-15 grid-rows-15 w-[min(92vw,430px)] h-[min(92vw,430px)] rounded-2xl overflow-hidden bg-white border-2 border-gray-400 relative shadow-2xl"
                    style={{ touchAction: 'manipulation' }}
                >
                    {/* 1. Large Corner Quadrants (Bases) */}
                    {/* Top-Left: RED BASE (6x6) */}
                    <div
                        className="absolute top-0 left-0 w-[40%] h-[40%] bg-gradient-to-br from-red-500 to-rose-600 border-r-2 border-b-2 border-gray-400 flex items-center justify-center p-3"
                    >
                        <div className="w-full h-full bg-white rounded-2xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2 border border-red-300">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={`red-slot-${i}`} className="rounded-full bg-red-100 border-2 border-red-500 shadow-inner flex items-center justify-center" />
                            ))}
                        </div>
                    </div>

                    {/* Top-Right: GREEN BASE (6x6) */}
                    <div
                        className="absolute top-0 right-0 w-[40%] h-[40%] bg-gradient-to-bl from-emerald-500 to-green-600 border-l-2 border-b-2 border-gray-400 flex items-center justify-center p-3"
                    >
                        <div className="w-full h-full bg-white rounded-2xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2 border border-green-300">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={`green-slot-${i}`} className="rounded-full bg-green-100 border-2 border-green-500 shadow-inner flex items-center justify-center" />
                            ))}
                        </div>
                    </div>

                    {/* Bottom-Left: BLUE BASE (6x6) */}
                    <div
                        className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-gradient-to-tr from-blue-600 to-sky-500 border-r-2 border-t-2 border-gray-400 flex items-center justify-center p-3"
                    >
                        <div className="w-full h-full bg-white rounded-2xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2 border border-blue-300">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={`blue-slot-${i}`} className="rounded-full bg-blue-100 border-2 border-blue-500 shadow-inner flex items-center justify-center" />
                            ))}
                        </div>
                    </div>

                    {/* Bottom-Right: YELLOW BASE (6x6) */}
                    <div
                        className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-gradient-to-tl from-amber-500 to-yellow-400 border-l-2 border-t-2 border-gray-400 flex items-center justify-center p-3"
                    >
                        <div className="w-full h-full bg-white rounded-2xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2 border border-yellow-300">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={`yellow-slot-${i}`} className="rounded-full bg-yellow-100 border-2 border-amber-500 shadow-inner flex items-center justify-center" />
                            ))}
                        </div>
                    </div>

                    {/* 2. Central Home 4 Triangles (rows 6 to 8, cols 6 to 8 = 3x3 cells in exact center) */}
                    <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] overflow-hidden border-2 border-gray-500 shadow-inner bg-slate-100">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Left Triangle: Red */}
                            <polygon points="0,0 50,50 0,100" fill="#e11d48" />
                            {/* Top Triangle: Green */}
                            <polygon points="0,0 100,0 50,50" fill="#059669" />
                            {/* Right Triangle: Yellow */}
                            <polygon points="100,0 100,100 50,50" fill="#f59e0b" />
                            {/* Bottom Triangle: Blue */}
                            <polygon points="0,100 50,50 100,100" fill="#2563eb" />
                            {/* Golden Medallion in Center */}
                            <circle cx="50" cy="50" r="14" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Crown size={16} className="text-amber-900 drop-shadow animate-pulse" />
                        </div>
                    </div>

                    {/* 3. Render 15x15 Track Cells */}
                    {Array.from({ length: 15 }).map((_, r) =>
                        Array.from({ length: 15 }).map((_, c) => {
                            // Skip quadrant base interiors & center 3x3 to avoid covering them
                            const isBaseArea = (r < 6 && c < 6) || (r < 6 && c >= 9) || (r >= 9 && c < 6) || (r >= 9 && c >= 9);
                            const isCenterArea = r >= 6 && r <= 8 && c >= 6 && c <= 8;
                            if (isBaseArea || isCenterArea) return <div key={`${r}-${c}`} className="pointer-events-none" />;

                            // Red Arm specifics
                            const isRedStart = r === 6 && c === 1;
                            const isRedHomeStretch = r === 7 && c >= 1 && c <= 5;
                            const isRedSafeStar = r === 8 && c === 2;

                            // Green Arm specifics
                            const isGreenStart = r === 1 && c === 8;
                            const isGreenHomeStretch = c === 7 && r >= 1 && r <= 5;
                            const isGreenSafeStar = r === 2 && c === 6;

                            // Yellow Arm specifics
                            const isYellowStart = r === 8 && c === 13;
                            const isYellowHomeStretch = r === 7 && c >= 9 && c <= 13;
                            const isYellowSafeStar = r === 6 && c === 12;

                            // Blue Arm specifics
                            const isBlueStart = r === 13 && c === 6;
                            const isBlueHomeStretch = c === 7 && r >= 9 && r <= 13;
                            const isBlueSafeStar = r === 12 && c === 8;

                            let cellBg = 'bg-white';
                            let cellBorder = 'border border-gray-300';
                            let icon = null;

                            // Colors for starting squares & home stretch
                            if (isRedStart) {
                                cellBg = 'bg-rose-500 text-white';
                                icon = <span className="text-[11px] font-black drop-shadow">★</span>;
                            } else if (isRedHomeStretch) {
                                cellBg = 'bg-rose-500 text-white';
                                if (c === 1) icon = <ArrowRight size={10} className="text-white drop-shadow" />;
                            } else if (isGreenStart) {
                                cellBg = 'bg-emerald-500 text-white';
                                icon = <span className="text-[11px] font-black drop-shadow">★</span>;
                            } else if (isGreenHomeStretch) {
                                cellBg = 'bg-emerald-500 text-white';
                                if (r === 1) icon = <ArrowDown size={10} className="text-white drop-shadow" />;
                            } else if (isYellowStart) {
                                cellBg = 'bg-amber-400 text-amber-900';
                                icon = <span className="text-[11px] font-black drop-shadow">★</span>;
                            } else if (isYellowHomeStretch) {
                                cellBg = 'bg-amber-400 text-amber-900';
                                if (c === 13) icon = <ArrowLeft size={10} className="text-amber-900 drop-shadow" />;
                            } else if (isBlueStart) {
                                cellBg = 'bg-blue-500 text-white';
                                icon = <span className="text-[11px] font-black drop-shadow">★</span>;
                            } else if (isBlueHomeStretch) {
                                cellBg = 'bg-blue-500 text-white';
                                if (r === 13) icon = <ArrowUp size={10} className="text-white drop-shadow" />;
                            } else if (isRedSafeStar || isGreenSafeStar || isYellowSafeStar || isBlueSafeStar) {
                                icon = <span className="text-amber-500 text-[12px] font-black drop-shadow-sm">★</span>;
                            }

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={`relative flex items-center justify-center ${cellBg} ${cellBorder}`}
                                >
                                    {icon}
                                </div>
                            );
                        })
                    )}

                    {/* 4. OVERLAY TOKENS (PAWNS / GOTTIYAN) */}
                    {allTokensOnBoard.map((item) => {
                        const { isMe, color, tokenIdx, step, row, col } = item;
                        const canMove = isMe && isMyTurn && canTokenMove(step, currentDice);

                        // Calculate dynamic offset if multiple tokens share this square
                        let offsetX = 0;
                        let offsetY = 0;
                        let tokenScale = 1;

                        if (step !== -1) {
                            const key = `${Math.round(row * 10)}_${Math.round(col * 10)}`;
                            const cluster = tokenOffsets[key] || [];
                            if (cluster.length > 1) {
                                const indexInCluster = cluster.findIndex(
                                    t => t.color === color && t.tokenIdx === tokenIdx
                                );
                                tokenScale = 0.72;
                                if (indexInCluster === 0) { offsetX = -18; offsetY = -18; }
                                else if (indexInCluster === 1) { offsetX = 18; offsetY = -18; }
                                else if (indexInCluster === 2) { offsetX = -18; offsetY = 18; }
                                else { offsetX = 18; offsetY = 18; }
                            }
                        }

                        return (
                            <div
                                key={`${color}-token-${tokenIdx}`}
                                onClick={() => isMe && handleMoveToken(tokenIdx)}
                                className={`absolute z-30 transition-all duration-300 flex items-center justify-center ${
                                    canMove ? 'z-50 cursor-pointer animate-bounce' : ''
                                }`}
                                style={{
                                    width: 'calc(100% / 15)',
                                    height: 'calc(100% / 15)',
                                    top: `calc(${row} * 100% / 15)`,
                                    left: `calc(${col} * 100% / 15)`,
                                    transform: `translate(${offsetX}%, ${offsetY}%) scale(${tokenScale})`
                                }}
                            >
                                <LudoPawn
                                    color={color}
                                    isClickable={canMove}
                                    isOpponent={!isMe}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Rules / Legend */}
            <div className="w-full mt-2.5 p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] text-gray-300">
                <span className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold">★</span> Safe Star (No Cut)
                </span>
                <span className="flex items-center gap-1">
                    <span className="text-rose-400 font-bold">🎲 6</span> Opens Pawn & Extra Turn
                </span>
                <span className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">⚡ Cut</span> Gives Bonus Roll
                </span>
            </div>
        </div>
    );
}
