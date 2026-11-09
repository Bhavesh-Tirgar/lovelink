import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Dices, RotateCcw, Crown, Heart, Sparkles, Volume2, VolumeX } from 'lucide-react';

// Web Audio synthesizer for Ludo sound effects
const playLudoSound = (type, soundEnabled = true) => {
    if (!soundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        if (type === 'dice') {
            for (let i = 0; i < 4; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200 + Math.random() * 250, now + i * 0.05);
                gain.gain.setValueAtTime(0.2, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.04);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.04);
            }
        } else if (type === 'step') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } else if (type === 'cut') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'home') {
            [523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0.2, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.2);
            });
        } else if (type === 'win') {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                gain.gain.setValueAtTime(0.3, now + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.4);
            });
        }
    } catch {}
};

// 52 Common Outer Track coordinates [row, col] on a 15x15 grid
const TRACK_COORDS = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7],
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14],
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7],
    [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0]
];

// Star Safe Squares (by absolute track index)
const SAFE_STAR_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Home column coordinates leading into center
const PINK_HOME_STRETCH = [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]
];
const BLUE_HOME_STRETCH = [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9]
];

// Base token slot coordinates
const PINK_BASE_COORDS = [[2, 2], [3, 3]];
const BLUE_BASE_COORDS = [[12, 12], [11, 11]];

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

    // Color assignment
    const isPink = ludoState?.player_pink ? String(ludoState.player_pink) === String(userId) : true;
    const myColor = isPink ? 'pink' : 'blue';
    const partnerColor = isPink ? 'blue' : 'pink';

    const turn = ludoState?.turn || 'pink';
    const isMyTurn = turn === myColor;
    const tokens = ludoState?.tokens || { pink: [-1, -1], blue: [-1, -1] };
    const myTokens = useMemo(() => tokens[myColor] || [-1, -1], [tokens, myColor]);
    const partnerTokens = tokens[partnerColor] || [-1, -1];

    const currentDice = ludoState?.dice;
    const winner = ludoState?.winner;

    // Check if tokens can move with current dice
    const canTokenMove = useCallback((step, diceVal) => {
        if (!diceVal) return false;
        if (step === -1) return diceVal === 6;
        if (step === 57) return false;
        return step + diceVal <= 57;
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Roll Dice
    const handleRollDice = () => {
        if (!isMyTurn || rolling || winner || currentDice) return;

        setRolling(true);
        playLudoSound('dice', soundEnabled);

        // Visual rolling shuffle animation
        let count = 0;
        const interval = setInterval(() => {
            setDiceDisplay(Math.floor(Math.random() * 6) + 1);
            count++;
            if (count > 7) {
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
        }, 60);
    };

    // Calculate Absolute Track Index from Player Relative Step
    const getTrackIndex = (step, color) => {
        if (step < 0 || step > 50) return null;
        if (color === 'pink') return step % 52;
        return (step + 26) % 52;
    };

    // Move Token
    const handleMoveToken = (tokenIdx) => {
        if (!isMyTurn || !currentDice || rolling || winner) return;

        const currentStep = myTokens[tokenIdx];
        if (!canTokenMove(currentStep, currentDice)) return;

        let nextStep = currentStep === -1 ? 0 : currentStep + currentDice;
        playLudoSound(nextStep === 57 ? 'home' : 'step', soundEnabled);

        // Check if opponent cut
        let opponentCutIdx = null;
        const myTrackIdx = getTrackIndex(nextStep, myColor);

        if (myTrackIdx !== null && !SAFE_STAR_INDICES.includes(myTrackIdx)) {
            partnerTokens.forEach((pStep, pIdx) => {
                const partnerTrackIdx = getTrackIndex(pStep, partnerColor);
                if (partnerTrackIdx !== null && partnerTrackIdx === myTrackIdx) {
                    opponentCutIdx = pIdx;
                    playLudoSound('cut', soundEnabled);
                }
            });
        }

        // Check Win condition (both tokens at step 57)
        const updatedTokens = [...myTokens];
        updatedTokens[tokenIdx] = nextStep;
        const isGameWon = updatedTokens.every(s => s === 57);

        if (isGameWon) {
            playLudoSound('win', soundEnabled);
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.5 },
                colors: ['#ec4899', '#38bdf8', '#facc15', '#a855f7']
            });
        }

        // Bonus roll if rolled 6, cut opponent, or reached home
        const grantsBonusRoll = currentDice === 6 || opponentCutIdx !== null || nextStep === 57;
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

    // Convert step to board row/col
    const getBoardPosition = (step, color, tokenIdx) => {
        if (step === -1) {
            return color === 'pink' ? PINK_BASE_COORDS[tokenIdx] : BLUE_BASE_COORDS[tokenIdx];
        }
        if (step >= 0 && step <= 50) {
            const trackIdx = getTrackIndex(step, color);
            return TRACK_COORDS[trackIdx];
        }
        if (step >= 51 && step <= 55) {
            const stretchIdx = step - 51;
            return color === 'pink' ? PINK_HOME_STRETCH[stretchIdx] : BLUE_HOME_STRETCH[stretchIdx];
        }
        // Step 56/57: Inside Home Center
        return color === 'pink' ? [7, 6] : [7, 8];
    };

    // Scores
    const myScore = ludoState?.scores?.[userId] || 0;
    const partnerId = Object.keys(ludoState?.scores || {}).find(k => k !== userId);
    const partnerScore = (partnerId && ludoState?.scores?.[partnerId]) || 0;

    return (
        <div className="flex flex-col items-center max-w-xl mx-auto w-full px-2 sm:px-4 py-2 font-sans select-none animate-in fade-in duration-500">
            {/* Header */}
            <div className="w-full flex items-center justify-between gap-3 mb-3 px-1">
                <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-gradient-to-br from-pink-500/20 to-cyan-500/20 border border-pink-500/30 text-pink-300">
                        <Dices size={18} />
                    </span>
                    <div>
                        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                            Couple Ludo 1v1
                        </h2>
                        <p className="text-[11px] text-gray-400">
                            You: <strong className="text-pink-300">{myScore}</strong> • {partnerName}: <strong className="text-cyan-300">{partnerScore}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setSoundEnabled(s => !s)}
                        className={`p-2 rounded-xl border transition-all ${soundEnabled ? 'bg-white/10 text-pink-300 border-pink-500/30' : 'bg-white/5 text-gray-500 border-white/10'}`}
                    >
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button
                        onClick={handleReset}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        title="Rematch & Swap Colors"
                    >
                        <RotateCcw size={15} />
                    </button>
                </div>
            </div>

            {/* Turn & Status Indicator Banner */}
            <div className="w-full mb-3 p-2.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${turn === 'pink' ? 'bg-pink-400 shadow-[0_0_8px_#f472b6]' : 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]'} animate-pulse`} />
                    <span className="text-xs font-semibold text-white">
                        {winner ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                                🏆 {winner === myColor ? 'You won the match!' : `${partnerName} won!`}
                            </span>
                        ) : isMyTurn ? (
                            <span className="text-pink-200">
                                {currentDice ? 'Tap a highlighted token to move!' : 'Your turn! Roll the dice 🎲'}
                            </span>
                        ) : (
                            <span className="text-gray-400">
                                Waiting for {partnerName}'s turn...
                            </span>
                        )}
                    </span>
                </div>

                {/* 3D Interactive Dice */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRollDice}
                        disabled={!isMyTurn || rolling || !!currentDice || !!winner}
                        className={`w-11 h-11 rounded-2xl font-black text-xl flex items-center justify-center transition-all shadow-lg active:scale-90 border ${
                            isMyTurn && !currentDice && !winner
                                ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white border-pink-400 animate-bounce cursor-pointer'
                                : 'bg-white/10 text-gray-300 border-white/15 opacity-80 cursor-default'
                        }`}
                    >
                        {rolling ? '🎲' : (currentDice || diceDisplay || 6)}
                    </button>
                </div>
            </div>

            {/* ── 15x15 LUDO BOARD CONTAINER ─────────────────────────── */}
            <div className="relative p-2 rounded-3xl bg-black/60 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <div className="grid grid-cols-15 grid-rows-15 w-[min(92vw,420px)] h-[min(92vw,420px)] rounded-2xl overflow-hidden bg-[#0d091a] border border-white/20 relative" style={{ touchAction: 'manipulation' }}>
                    {/* Render 15x15 Grid Cells */}
                    {Array.from({ length: 15 }).map((_, r) =>
                        Array.from({ length: 15 }).map((_, c) => {
                            // Check zones
                            const isPinkBase = r < 6 && c < 6;
                            const isBlueBase = r >= 9 && c >= 9;
                            const isGreenBase = r < 6 && c >= 9;
                            const isYellowBase = r >= 9 && c < 6;
                            const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

                            const isPinkHomeCol = r === 7 && c >= 1 && c <= 5;
                            const isBlueHomeCol = r === 7 && c >= 9 && c <= 13;

                            const isPinkStart = r === 6 && c === 1;
                            const isBlueStart = r === 8 && c === 13;

                            let bgClass = 'bg-[#150f24] border border-white/5';
                            if (isPinkBase) bgClass = 'bg-gradient-to-br from-pink-950/60 to-pink-900/40 border border-pink-500/20';
                            else if (isBlueBase) bgClass = 'bg-gradient-to-br from-cyan-950/60 to-cyan-900/40 border border-cyan-500/20';
                            else if (isGreenBase || isYellowBase) bgClass = 'bg-white/[0.02] border border-white/5';
                            else if (isCenter) bgClass = 'bg-gradient-to-tr from-purple-900/70 to-pink-900/70';
                            else if (isPinkHomeCol || isPinkStart) bgClass = 'bg-pink-600/30 border border-pink-500/30';
                            else if (isBlueHomeCol || isBlueStart) bgClass = 'bg-cyan-600/30 border border-cyan-500/30';

                            // Check Star Safe Squares
                            const trackIdx = TRACK_COORDS.findIndex(([tr, tc]) => tr === r && tc === c);
                            const isSafeStar = trackIdx !== -1 && SAFE_STAR_INDICES.includes(trackIdx);

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={`relative flex items-center justify-center ${bgClass}`}
                                >
                                    {isSafeStar && (
                                        <span className="text-[10px] text-amber-400/80 drop-shadow select-none">★</span>
                                    )}
                                    {isCenter && r === 7 && c === 7 && (
                                        <Crown size={18} className="text-amber-300 drop-shadow animate-pulse" />
                                    )}
                                </div>
                            );
                        })
                    )}

                    {/* Tokens Rendering (Overlay positioned) */}
                    {/* Pink Tokens */}
                    {myTokens.map((step, idx) => {
                        const [row, col] = getBoardPosition(step, myColor, idx);
                        const canMove = isMyTurn && canTokenMove(step, currentDice);

                        return (
                            <button
                                key={`my-token-${idx}`}
                                onClick={() => handleMoveToken(idx)}
                                disabled={!canMove}
                                className={`absolute z-30 transition-all duration-300 flex items-center justify-center rounded-full shadow-lg ${
                                    myColor === 'pink'
                                        ? 'bg-gradient-to-tr from-pink-500 to-rose-400 text-white ring-2 ring-white/80'
                                        : 'bg-gradient-to-tr from-cyan-400 to-blue-500 text-white ring-2 ring-white/80'
                                } ${canMove ? 'ring-4 ring-pink-400 animate-bounce cursor-pointer scale-110 z-40' : 'cursor-default'}`}
                                style={{
                                    width: 'calc(100% / 15)',
                                    height: 'calc(100% / 15)',
                                    top: `calc(${row} * 100% / 15)`,
                                    left: `calc(${col} * 100% / 15)`
                                }}
                            >
                                <Heart size={10} className="fill-white" />
                            </button>
                        );
                    })}

                    {/* Partner Tokens */}
                    {partnerTokens.map((step, idx) => {
                        const [row, col] = getBoardPosition(step, partnerColor, idx);
                        return (
                            <div
                                key={`partner-token-${idx}`}
                                className={`absolute z-20 transition-all duration-300 flex items-center justify-center rounded-full shadow-md ${
                                    partnerColor === 'pink'
                                        ? 'bg-gradient-to-tr from-pink-500 to-rose-400 text-white ring-2 ring-white/60'
                                        : 'bg-gradient-to-tr from-cyan-400 to-blue-500 text-white ring-2 ring-white/60'
                                }`}
                                style={{
                                    width: 'calc(100% / 15)',
                                    height: 'calc(100% / 15)',
                                    top: `calc(${row} * 100% / 15)`,
                                    left: `calc(${col} * 100% / 15)`
                                }}
                            >
                                <Sparkles size={9} className="text-white" />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Token Progress Info */}
            <div className="w-full mt-3 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    <span className="text-gray-300">
                        Your Home Progress: <strong className="text-pink-300">{myTokens.filter(s => s === 57).length}/2 Finished</strong>
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-gray-300">
                        {partnerName}: <strong className="text-cyan-300">{partnerTokens.filter(s => s === 57).length}/2 Finished</strong>
                    </span>
                </div>
            </div>
        </div>
    );
}
