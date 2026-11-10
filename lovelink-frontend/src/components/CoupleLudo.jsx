import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';

// Web Audio synthesizer for Authentic Ludo Sound Effects
const playLudoSound = (type, soundEnabled = true) => {
    if (!soundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        if (type === 'dice') {
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

// ── 52 Standard Continuous Clockwise Ludo Track Coordinates [col, row] in 0-14 grid ──
// Each unit = 40px in 600x600 SVG viewBox
const TRACK_GRID = [
    // Red arm going right (indices 0 to 4)
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    // Green arm going up (indices 5 to 10)
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
    // Top turn (index 11)
    [7, 0],
    // Green arm going down (indices 12 to 17)
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    // Yellow arm going right (indices 18 to 23)
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
    // Right turn (index 24)
    [14, 7],
    // Yellow arm going left (indices 25 to 30)
    [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
    // Blue arm going down (indices 31 to 36)
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
    // Bottom turn (index 37)
    [7, 14],
    // Blue arm going up (indices 38 to 43)
    [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
    // Red arm going left (indices 44 to 49)
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    // Left turn (indices 50 to 51)
    [0, 7],
    [0, 6]
];

// 8 Classical Star Safe Squares on the 52-cell track
const SAFE_STAR_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Red Home Stretch [col, row]
const RED_HOME_STRETCH = [
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7]
];

// Yellow Home Stretch [col, row]
const YELLOW_HOME_STRETCH = [
    [13, 7], [12, 7], [11, 7], [10, 7], [9, 7]
];

// Base Token Center Coordinates [cx, cy] in 600x600 viewBox
const RED_BASE_CIRCLES = [
    [80, 80], [160, 80], [80, 160], [160, 160]
];
const YELLOW_BASE_CIRCLES = [
    [440, 440], [520, 440], [440, 520], [520, 520]
];

// Realistic 3D Ludo Die Component with Real Dots (Pips)
function RealisticDice({ value = 6, rolling = false, onClick, disabled = false, isTurn = false, color = 'red' }) {
    const renderDots = (num) => {
        const dotColor = num === 1 ? 'bg-red-600' : 'bg-gray-900';
        switch (num) {
            case 1:
                return (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className={`w-4 h-4 rounded-full ${dotColor} shadow-inner`} />
                    </div>
                );
            case 2:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1.5">
                        <div className="flex justify-start"><span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} /></div>
                        <div className="flex justify-end"><span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} /></div>
                    </div>
                );
            case 3:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1.5">
                        <div className="flex justify-start"><span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} /></div>
                        <div className="flex justify-center"><span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} /></div>
                        <div className="flex justify-end"><span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} /></div>
                    </div>
                );
            case 4:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1.5">
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
                    <div className="w-full h-full flex flex-col justify-between p-1.5">
                        <div className="flex justify-between">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                        <div className="flex justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-inner" />
                        </div>
                        <div className="flex justify-between">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="w-full h-full flex flex-col justify-between p-1.5">
                        <div className="flex justify-between">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-inner`} />
                        </div>
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
            default:
                return null;
        }
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative w-14 h-14 rounded-2xl transition-all select-none flex items-center justify-center ${
                rolling ? 'animate-spin scale-110' : ''
            } ${
                isTurn && !disabled
                    ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-bounce cursor-pointer'
                    : 'cursor-default opacity-85'
            }`}
            style={{
                background: 'linear-gradient(145deg, #ffffff, #e2e8f0)',
                boxShadow: isTurn && !disabled
                    ? '4px 6px 15px rgba(0,0,0,0.4), -2px -2px 6px rgba(255,255,255,0.9)'
                    : '2px 3px 6px rgba(0,0,0,0.3)',
                border: '1.5px solid #cbd5e1'
            }}
        >
            <div className="w-12 h-12 rounded-xl p-0.5">
                {renderDots(value || 6)}
            </div>
        </button>
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

    // Color assignment: Pink/Red for Player 1, Blue/Yellow for Player 2
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

    // Valid move logic:
    // - -1: in base, needs 6
    // - 56: home
    // - 0 to 50: outer track
    // - 51 to 55: home stretch
    // - 56: Home!
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
                particleCount: 220,
                spread: 120,
                origin: { y: 0.5 },
                colors: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db']
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

    // Convert player step to SVG viewBox pixel coordinates [cx, cy]
    const getSvgCoordinates = useCallback((step, color, tokenIdx) => {
        if (step === -1) {
            return color === 'pink' ? RED_BASE_CIRCLES[tokenIdx] : YELLOW_BASE_CIRCLES[tokenIdx];
        }
        if (step >= 0 && step <= 50) {
            const trackIdx = getTrackIndex(step, color);
            const [c, r] = TRACK_GRID[trackIdx];
            return [c * 40 + 20, r * 40 + 20];
        }
        if (step >= 51 && step <= 55) {
            const stretchIdx = step - 51;
            const [c, r] = color === 'pink' ? RED_HOME_STRETCH[stretchIdx] : YELLOW_HOME_STRETCH[stretchIdx];
            return [c * 40 + 20, r * 40 + 20];
        }
        // Step 56: Home center
        return color === 'pink' ? [270, 300] : [330, 300];
    }, [getTrackIndex]);

    // Compute token stacking to avoid overlap when 2+ tokens share a square
    const allTokensOnBoard = useMemo(() => {
        const list = [];
        myTokens.forEach((s, idx) => {
            const [cx, cy] = getSvgCoordinates(s, myColor, idx);
            list.push({ isMe: true, color: myColor, tokenIdx: idx, step: s, cx, cy });
        });
        partnerTokens.forEach((s, idx) => {
            const [cx, cy] = getSvgCoordinates(s, partnerColor, idx);
            list.push({ isMe: false, color: partnerColor, tokenIdx: idx, step: s, cx, cy });
        });
        return list;
    }, [myTokens, partnerTokens, myColor, partnerColor, getSvgCoordinates]);

    // Group by coordinate key to calculate stacking offsets
    const tokenOffsets = useMemo(() => {
        const groups = {};
        allTokensOnBoard.forEach(item => {
            if (item.step === -1) return; // Base slots don't stack
            const key = `${Math.round(item.cx)}_${Math.round(item.cy)}`;
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
            {/* Header */}
            <div className="w-full flex items-center justify-between gap-3 mb-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 border border-amber-400/40 text-white flex items-center justify-center font-black text-sm shadow">
                        🎲
                    </span>
                    <div>
                        <h2 className="text-base font-black text-white flex items-center gap-1.5 tracking-wide">
                            Ludo King 1v1
                        </h2>
                        <p className="text-[11px] text-gray-400">
                            You: <strong className="text-red-400">{myScore}</strong> • {partnerName}: <strong className="text-amber-400">{partnerScore}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSoundEnabled(s => !s)}
                        className={`p-2 rounded-xl border transition-all ${soundEnabled ? 'bg-white/10 text-amber-300 border-amber-500/30' : 'bg-white/5 text-gray-500 border-white/10'}`}
                        title={soundEnabled ? 'Mute' : 'Unmute'}
                    >
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow"
                        title="New Match"
                    >
                        <RotateCcw size={14} />
                        <span>Rematch</span>
                    </button>
                </div>
            </div>

            {/* ── PLAYER CONTROL PANELS (YOU & PARTNER) ────────────────── */}
            <div className="w-full mb-2 grid grid-cols-2 gap-2">
                {/* You (Red) */}
                <div
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isMyTurn
                            ? 'bg-gradient-to-r from-red-950/80 to-black/70 border-red-500 ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                            : 'bg-black/40 border-white/10 opacity-75'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-xs font-black shadow border border-white/40">
                            🔴
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
                        color="red"
                    />
                </div>

                {/* Partner (Yellow) */}
                <div
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                        !isMyTurn
                            ? 'bg-gradient-to-r from-amber-950/80 to-black/70 border-amber-500 ring-2 ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                            : 'bg-black/40 border-white/10 opacity-75'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white text-xs font-black shadow border border-white/40">
                            🟡
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
                        color="yellow"
                    />
                </div>
            </div>

            {/* Turn Announcement Banner */}
            <div className="w-full mb-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-xs">
                {winner ? (
                    <span className="text-emerald-400 font-black flex items-center gap-1.5 animate-bounce">
                        🏆 {winner === myColor ? 'Victory! You won the Ludo match!' : `${partnerName} won the match!`}
                    </span>
                ) : isMyTurn ? (
                    <span className="text-amber-300 font-extrabold flex items-center gap-1 animate-pulse">
                        {currentDice ? `🎲 Rolled ${currentDice}! Tap a highlighted pawn to move.` : '✨ Your Turn! Tap your 3D Dice to roll.'}
                    </span>
                ) : (
                    <span className="text-gray-400 flex items-center gap-1">
                        ⏳ Waiting for {partnerName} to roll...
                    </span>
                )}
            </div>

            {/* ── 100% PURE VECTOR SVG AUTHENTIC LUDO BOARD (600x600) ──── */}
            <div className="relative p-2 rounded-3xl bg-[#2a1b38] border-4 border-[#4c3263] shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-w-full">
                <svg
                    viewBox="0 0 600 600"
                    className="w-[min(92vw,430px)] h-[min(92vw,430px)] rounded-2xl shadow-2xl overflow-hidden"
                    style={{ touchAction: 'manipulation' }}
                >
                    <defs>
                        {/* Standard Track Cell Template (40x40) */}
                        <rect id="cell" width="40" height="40" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />

                        {/* Star Symbol */}
                        <g id="star">
                            <path
                                d="M 20,8 L 23.5,15.5 L 31.5,16.5 L 25.5,22 L 27,30 L 20,26 L 13,30 L 14.5,22 L 8.5,16.5 L 16.5,15.5 Z"
                                fill="#eab308"
                                stroke="#a16207"
                                strokeWidth="0.8"
                            />
                        </g>

                        {/* Head Gradients for 3D Pawns */}
                        <radialGradient id="pawn-grad-pink" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                            <stop offset="35%" stopColor="#ff4d6d" />
                            <stop offset="100%" stopColor="#800f2f" />
                        </radialGradient>
                        <radialGradient id="pawn-grad-blue" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                            <stop offset="35%" stopColor="#fde047" />
                            <stop offset="100%" stopColor="#ca8a04" />
                        </radialGradient>
                    </defs>

                    {/* Board Outer Boundary */}
                    <rect x="0" y="0" width="600" height="600" fill="#ffffff" stroke="#0f172a" strokeWidth="4" />

                    {/* ==================== 1. FOUR CORNER YARDS / BASES (6x6 each) ==================== */}
                    {/* Top-Left: RED BASE */}
                    <rect x="0" y="0" width="240" height="240" fill="#e74c3c" stroke="#0f172a" strokeWidth="2.5" />
                    <rect x="40" y="40" width="160" height="160" rx="20" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="80" cy="80" r="22" fill="#ffcdd2" stroke="#e74c3c" strokeWidth="3" />
                    <circle cx="160" cy="80" r="22" fill="#ffcdd2" stroke="#e74c3c" strokeWidth="3" />
                    <circle cx="80" cy="160" r="22" fill="#ffcdd2" stroke="#e74c3c" strokeWidth="3" />
                    <circle cx="160" cy="160" r="22" fill="#ffcdd2" stroke="#e74c3c" strokeWidth="3" />

                    {/* Top-Right: GREEN BASE */}
                    <rect x="360" y="0" width="240" height="240" fill="#2ecc71" stroke="#0f172a" strokeWidth="2.5" />
                    <rect x="400" y="40" width="160" height="160" rx="20" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="440" cy="80" r="22" fill="#c8e6c9" stroke="#2ecc71" strokeWidth="3" />
                    <circle cx="520" cy="80" r="22" fill="#c8e6c9" stroke="#2ecc71" strokeWidth="3" />
                    <circle cx="440" cy="160" r="22" fill="#c8e6c9" stroke="#2ecc71" strokeWidth="3" />
                    <circle cx="520" cy="160" r="22" fill="#c8e6c9" stroke="#2ecc71" strokeWidth="3" />

                    {/* Bottom-Right: YELLOW BASE */}
                    <rect x="360" y="360" width="240" height="240" fill="#f1c40f" stroke="#0f172a" strokeWidth="2.5" />
                    <rect x="400" y="400" width="160" height="160" rx="20" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="440" cy="440" r="22" fill="#fff9c4" stroke="#f1c40f" strokeWidth="3" />
                    <circle cx="520" cy="440" r="22" fill="#fff9c4" stroke="#f1c40f" strokeWidth="3" />
                    <circle cx="440" cy="520" r="22" fill="#fff9c4" stroke="#f1c40f" strokeWidth="3" />
                    <circle cx="520" cy="520" r="22" fill="#fff9c4" stroke="#f1c40f" strokeWidth="3" />

                    {/* Bottom-Left: BLUE BASE */}
                    <rect x="0" y="360" width="240" height="240" fill="#3498db" stroke="#0f172a" strokeWidth="2.5" />
                    <rect x="40" y="400" width="160" height="160" rx="20" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="80" cy="440" r="22" fill="#bbdefb" stroke="#3498db" strokeWidth="3" />
                    <circle cx="160" cy="440" r="22" fill="#bbdefb" stroke="#3498db" strokeWidth="3" />
                    <circle cx="80" cy="520" r="22" fill="#bbdefb" stroke="#3498db" strokeWidth="3" />
                    <circle cx="160" cy="520" r="22" fill="#bbdefb" stroke="#3498db" strokeWidth="3" />

                    {/* ==================== 2. TRACK GRIDS ==================== */}
                    {/* Left Arm (Cols 0-5, Rows 6-8: X 0-240, Y 240-360) */}
                    <g transform="translate(0, 240)">
                        {/* Row 6 */}
                        <use href="#cell" x="0" y="0" />
                        <use href="#cell" x="40" y="0" fill="#e74c3c" />{/* Red Start */}
                        <use href="#cell" x="80" y="0" /><use href="#cell" x="120" y="0" /><use href="#cell" x="160" y="0" /><use href="#cell" x="200" y="0" />

                        {/* Row 7 (Red Home Stretch) */}
                        <use href="#cell" x="0" y="40" />
                        <use href="#cell" x="40" y="40" fill="#e74c3c" /><use href="#cell" x="80" y="40" fill="#e74c3c" /><use href="#cell" x="120" y="40" fill="#e74c3c" /><use href="#cell" x="160" y="40" fill="#e74c3c" /><use href="#cell" x="200" y="40" fill="#e74c3c" />

                        {/* Row 8 */}
                        <use href="#cell" x="0" y="80" /><use href="#cell" x="40" y="80" /><use href="#cell" x="80" y="80" /><use href="#cell" x="120" y="80" /><use href="#cell" x="160" y="80" /><use href="#cell" x="200" y="80" />
                    </g>

                    {/* Top Arm (Cols 6-8, Rows 0-5: X 240-360, Y 0-240) */}
                    <g transform="translate(240, 0)">
                        <use href="#cell" x="0" y="0" /><use href="#cell" x="40" y="0" /><use href="#cell" x="80" y="0" />
                        <use href="#cell" x="0" y="40" /><use href="#cell" x="40" y="40" fill="#2ecc71" /><use href="#cell" x="80" y="40" fill="#2ecc71" />{/* Green Start */}
                        <use href="#cell" x="0" y="80" /><use href="#cell" x="40" y="80" fill="#2ecc71" /><use href="#cell" x="80" y="80" />
                        <use href="#cell" x="0" y="120" /><use href="#cell" x="40" y="120" fill="#2ecc71" /><use href="#cell" x="80" y="120" />
                        <use href="#cell" x="0" y="160" /><use href="#cell" x="40" y="160" fill="#2ecc71" /><use href="#cell" x="80" y="160" />
                        <use href="#cell" x="0" y="200" /><use href="#cell" x="40" y="200" fill="#2ecc71" /><use href="#cell" x="80" y="200" />
                    </g>

                    {/* Right Arm (Cols 9-14, Rows 6-8: X 360-600, Y 240-360) */}
                    <g transform="translate(360, 240)">
                        {/* Row 6 */}
                        <use href="#cell" x="0" y="0" /><use href="#cell" x="40" y="0" /><use href="#cell" x="80" y="0" /><use href="#cell" x="120" y="0" /><use href="#cell" x="160" y="0" /><use href="#cell" x="200" y="0" />

                        {/* Row 7 (Yellow Home Stretch) */}
                        <use href="#cell" x="0" y="40" fill="#f1c40f" /><use href="#cell" x="40" y="40" fill="#f1c40f" /><use href="#cell" x="80" y="40" fill="#f1c40f" /><use href="#cell" x="120" y="40" fill="#f1c40f" /><use href="#cell" x="160" y="40" fill="#f1c40f" />
                        <use href="#cell" x="200" y="40" />

                        {/* Row 8 */}
                        <use href="#cell" x="0" y="80" /><use href="#cell" x="40" y="80" /><use href="#cell" x="80" y="80" /><use href="#cell" x="120" y="80" />
                        <use href="#cell" x="160" y="80" fill="#f1c40f" />{/* Yellow Start */}
                        <use href="#cell" x="200" y="80" />
                    </g>

                    {/* Bottom Arm (Cols 6-8, Rows 9-14: X 240-360, Y 360-600) */}
                    <g transform="translate(240, 360)">
                        <use href="#cell" x="0" y="0" /><use href="#cell" x="40" y="0" fill="#3498db" /><use href="#cell" x="80" y="0" />
                        <use href="#cell" x="0" y="40" /><use href="#cell" x="40" y="40" fill="#3498db" /><use href="#cell" x="80" y="40" />
                        <use href="#cell" x="0" y="80" /><use href="#cell" x="40" y="80" fill="#3498db" /><use href="#cell" x="80" y="80" />
                        <use href="#cell" x="0" y="120" /><use href="#cell" x="40" y="120" fill="#3498db" /><use href="#cell" x="80" y="120" />
                        <use href="#cell" x="0" y="160" fill="#3498db" />{/* Blue Start */}
                        <use href="#cell" x="40" y="160" fill="#3498db" /><use href="#cell" x="80" y="160" />
                        <use href="#cell" x="0" y="200" /><use href="#cell" x="40" y="200" /><use href="#cell" x="80" y="200" />
                    </g>

                    {/* ==================== 3. CENTER HOME TRIANGLES (3x3: 240 to 360) ==================== */}
                    <g transform="translate(240, 240)">
                        <rect x="0" y="0" width="120" height="120" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                        {/* Red Triangle (Left) */}
                        <polygon points="0,0 60,60 0,120" fill="#e74c3c" stroke="#0f172a" strokeWidth="1.5" />
                        {/* Green Triangle (Top) */}
                        <polygon points="0,0 120,0 60,60" fill="#2ecc71" stroke="#0f172a" strokeWidth="1.5" />
                        {/* Yellow Triangle (Right) */}
                        <polygon points="120,0 120,120 60,60" fill="#f1c40f" stroke="#0f172a" strokeWidth="1.5" />
                        {/* Blue Triangle (Bottom) */}
                        <polygon points="0,120 60,60 120,120" fill="#3498db" stroke="#0f172a" strokeWidth="1.5" />

                        {/* Golden Center Medallion */}
                        <circle cx="60" cy="60" r="16" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
                        <text x="60" y="65" textAnchor="middle" fontSize="14" fill="#78350f" fontWeight="bold">👑</text>
                    </g>

                    {/* ==================== 4. 8 SAFE STARS ==================== */}
                    {/* Red Start Star */}
                    <use href="#star" x="40" y="240" />
                    {/* Left Arm Safe Star */}
                    <use href="#star" x="80" y="320" />

                    {/* Green Start Star */}
                    <use href="#star" x="320" y="40" />
                    {/* Top Arm Safe Star */}
                    <use href="#star" x="240" y="80" />

                    {/* Yellow Start Star */}
                    <use href="#star" x="520" y="320" />
                    {/* Right Arm Safe Star */}
                    <use href="#star" x="480" y="240" />

                    {/* Blue Start Star */}
                    <use href="#star" x="240" y="520" />
                    {/* Bottom Arm Safe Star */}
                    <use href="#star" x="320" y="480" />

                    {/* Directional Arrows for Home Stretch */}
                    <text x="45" y="295" fontSize="14" fill="#ffffff" fontWeight="bold">➜</text>
                    <text x="545" y="295" fontSize="14" fill="#78350f" fontWeight="bold">⬅</text>
                    <text x="295" y="45" fontSize="14" fill="#ffffff" fontWeight="bold">⬇</text>
                    <text x="295" y="565" fontSize="14" fill="#ffffff" fontWeight="bold">⬆</text>

                    {/* ==================== 5. 3D GLOSSY PAWNS (GOTTIYAN) ==================== */}
                    {allTokensOnBoard.map((item) => {
                        const { isMe, color, tokenIdx, step, cx, cy } = item;
                        const canMove = isMe && isMyTurn && canTokenMove(step, currentDice);

                        // Multi-token stacking offsets
                        let ox = 0;
                        let oy = 0;
                        let scale = 1;

                        if (step !== -1) {
                            const key = `${Math.round(cx)}_${Math.round(cy)}`;
                            const cluster = tokenOffsets[key] || [];
                            if (cluster.length > 1) {
                                const idxInCluster = cluster.findIndex(
                                    t => t.color === color && t.tokenIdx === tokenIdx
                                );
                                scale = 0.75;
                                if (idxInCluster === 0) { ox = -8; oy = -8; }
                                else if (idxInCluster === 1) { ox = 8; oy = -8; }
                                else if (idxInCluster === 2) { ox = -8; oy = 8; }
                                else { ox = 8; oy = 8; }
                            }
                        }

                        const finalX = cx + ox;
                        const finalY = cy + oy;
                        const isRedPawn = color === 'pink';

                        return (
                            <g
                                key={`${color}-token-${tokenIdx}`}
                                transform={`translate(${finalX}, ${finalY}) scale(${scale})`}
                                onClick={() => isMe && handleMoveToken(tokenIdx)}
                                className={canMove ? 'cursor-pointer' : ''}
                            >
                                {/* Highlight Pulsing Ring on Playable Pawn */}
                                {canMove && (
                                    <>
                                        <circle cx="0" cy="0" r="22" fill="none" stroke="#facc15" strokeWidth="3" opacity="0.8" />
                                        <circle cx="0" cy="0" r="26" fill="none" stroke="#facc15" strokeWidth="2" opacity="0.5" className="animate-ping" />
                                    </>
                                )}

                                {/* Pawn Shadow */}
                                <ellipse cx="0" cy="14" rx="14" ry="5" fill="#000000" opacity="0.35" />

                                {/* Pawn Flared Base */}
                                <ellipse
                                    cx="0"
                                    cy="11"
                                    rx="13"
                                    ry="4"
                                    fill={isRedPawn ? '#c9184a' : '#d97706'}
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                />

                                {/* Pawn Stem */}
                                <path
                                    d="M -9,10 C -9,4 -4,0 -4,-3 L 4,-3 C 4,0 9,4 9,10 Z"
                                    fill={isRedPawn ? '#ff4d6d' : '#facc15'}
                                    stroke="#ffffff"
                                    strokeWidth="1"
                                />

                                {/* Metallic Collar */}
                                <ellipse cx="0" cy="-4" rx="5" ry="1.5" fill="#ffd700" stroke="#b45309" strokeWidth="0.5" />

                                {/* Glossy Head */}
                                <circle
                                    cx="0"
                                    cy="-11"
                                    r="8"
                                    fill={`url(#pawn-grad-${color})`}
                                    stroke="#ffffff"
                                    strokeWidth="1.2"
                                />
                                <circle cx="-2.5" cy="-13.5" r="2.5" fill="#ffffff" opacity="0.75" />
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Bottom Rules Legend */}
            <div className="w-full mt-2 p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] text-gray-300">
                <span className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold">★</span> Safe Star
                </span>
                <span className="flex items-center gap-1">
                    <span className="text-red-400 font-bold">🎲 6</span> Opens Pawn & Extra Roll
                </span>
                <span className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">⚡ Cut</span> Gives Bonus Turn
                </span>
            </div>
        </div>
    );
}
