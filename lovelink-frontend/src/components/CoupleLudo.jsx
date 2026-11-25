import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { getSharedAudioContext } from '../utils/soundFx';

// Web Audio synthesizer using shared singleton context
const playLudoSound = (type, soundEnabled = true) => {
    if (!soundEnabled) return;
    try {
        const ctx = getSharedAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'dice') {
            for (let i = 0; i < 7; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(170 + Math.random() * 280, now + i * 0.04);
                gain.gain.setValueAtTime(0.28, now + i * 0.04);
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
            osc.frequency.setValueAtTime(540, now);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.065);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.065);
        } else if (type === 'open') {
            [440, 660, 880].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                gain.gain.setValueAtTime(0.28, now + idx * 0.06);
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
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
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

// Pre-configured Romantic Couple Stakes
const COUPLE_STAKES = [
    "💆 Loser gives a 15-minute massage",
    "🍕 Loser orders dinner tonight",
    "💌 Loser writes a handwritten love note",
    "🎬 Loser lets partner pick the movie",
    "☕ Loser makes breakfast in bed tomorrow",
    "💋 Winner gets 50 kisses on demand"
];

// Realistic 3D Tumbling Ludo Die Component with Real Dots (Pips) & Physics
function Realistic3DDice({ value = 6, rolling = false, onClick, disabled = false, isTurn = false, color = 'red' }) {
    const renderDots = (num) => {
        const dotColor = num === 1 ? 'bg-rose-600' : 'bg-slate-900';
        switch (num) {
            case 1:
                return (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="w-4 h-4 rounded-full bg-rose-600 shadow-inner" />
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
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-inner" />
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
        <motion.button
            whileTap={{ scale: disabled ? 1 : 0.88 }}
            whileHover={{ scale: disabled ? 1 : 1.06 }}
            animate={rolling ? {
                rotate: [0, 90, 180, 270, 360],
                scale: [1, 1.18, 0.95, 1.15, 1],
            } : {
                rotate: 0,
                scale: 1,
            }}
            transition={rolling ? { repeat: Infinity, duration: 0.25, ease: "linear" } : { duration: 0.2 }}
            onClick={onClick}
            disabled={disabled}
            className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl select-none flex items-center justify-center transition-all ${
                isTurn && !disabled
                    ? color === 'red'
                        ? 'ring-4 ring-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.85)] cursor-pointer'
                        : 'ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.85)] cursor-pointer'
                    : 'cursor-default opacity-85'
            }`}
            style={{
                background: 'linear-gradient(145deg, #ffffff, #e2e8f0)',
                boxShadow: isTurn && !disabled
                    ? '4px 6px 16px rgba(0,0,0,0.45), -2px -2px 6px rgba(255,255,255,0.95)'
                    : '2px 3px 6px rgba(0,0,0,0.3)',
                border: '1.5px solid #cbd5e1'
            }}
        >
            <div className="w-12 h-12 rounded-xl p-0.5">
                {renderDots(value || 6)}
            </div>
        </motion.button>
    );
}

// 15-Second Circular Turn Countdown Timer Ring
function TurnTimerRing({ timeLeft = 15, maxTime = 15, isActive = false, color = 'red' }) {
    if (!isActive) return null;
    const progress = Math.max(0, Math.min(1, timeLeft / maxTime));
    const strokeColor = timeLeft <= 4 ? '#ef4444' : color === 'red' ? '#f43f5e' : '#fbbf24';

    return (
        <div className="absolute -top-1 -right-1 w-9 h-9 pointer-events-none flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
                <circle
                    cx="18"
                    cy="18"
                    r="15"
                    stroke="#ffffff20"
                    strokeWidth="3"
                    fill="none"
                />
                <circle
                    cx="18"
                    cy="18"
                    r="15"
                    stroke={strokeColor}
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 15}
                    strokeDashoffset={2 * Math.PI * 15 * (1 - progress)}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-300"
                />
            </svg>
            <span className="absolute text-[9px] font-black font-mono text-white">
                {timeLeft}
            </span>
        </div>
    );
}

export default function CoupleLudo({
    userId,
    coupleId,
    partnerName = "Partner",
    sendWs,
    ludoState,
    isLiveConnected,
    gameMode = 'online',
    partnerOnline = false
}) {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [rolling, setRolling] = useState(false);
    const [diceDisplay, setDiceDisplay] = useState(6);
    const [myLastDice, setMyLastDice] = useState(6);
    const [partnerLastDice, setPartnerLastDice] = useState(6);
    const [extraTurnBanner, setExtraTurnBanner] = useState('');
    const [selectedStake, setSelectedStake] = useState(COUPLE_STAKES[0]);
    const [turnTimeLeft, setTurnTimeLeft] = useState(15);
    const [isHopping, setIsHopping] = useState(false);

    // Local resilient game state
    const [gameState, setGameState] = useState({
        dice: ludoState?.dice || null,
        turn: ludoState?.turn || 'pink',
        tokens: {
            pink: ludoState?.tokens?.pink || [-1, -1, -1, -1],
            blue: ludoState?.tokens?.blue || [-1, -1, -1, -1]
        },
        winner: ludoState?.winner || null,
        scores: ludoState?.scores || {}
    });

    // Synchronize external server updates from WebSocket when received
    useEffect(() => {
        if (ludoState) {
            setGameState(prev => ({
                ...prev,
                dice: ludoState.dice !== undefined ? ludoState.dice : prev.dice,
                turn: ludoState.turn || prev.turn,
                tokens: ludoState.tokens ? {
                    pink: Array.isArray(ludoState.tokens.pink) ? ludoState.tokens.pink : prev.tokens.pink,
                    blue: Array.isArray(ludoState.tokens.blue) ? ludoState.tokens.blue : prev.tokens.blue
                } : prev.tokens,
                winner: ludoState.winner !== undefined ? ludoState.winner : prev.winner,
                scores: ludoState.scores || prev.scores
            }));
        }
    }, [ludoState]);

    // Color assignment: Red ('pink') for Player 1, Yellow ('blue') for Player 2
    const isPink = ludoState?.player_pink ? String(ludoState.player_pink) === String(userId) : true;
    const myColor = isPink ? 'pink' : 'blue';
    const partnerColor = isPink ? 'blue' : 'pink';

    const currentDice = gameState.dice;
    const turn = gameState.turn;
    const winner = gameState.winner;
    const isMyTurn = turn === myColor && !winner;
    const isPartnerActive = (turn === partnerColor && !winner) && (gameMode === 'couch' || gameMode === 'bot');

    const myTokens = useMemo(() => gameState.tokens[myColor] || [-1, -1, -1, -1], [gameState.tokens, myColor]);
    const partnerTokens = useMemo(() => gameState.tokens[partnerColor] || [-1, -1, -1, -1], [gameState.tokens, partnerColor]);

    // Helper: Map player step (0 to 50) to the 52-cell track
    const getTrackIndex = useCallback((step, color) => {
        if (step < 0 || step > 50) return null;
        const offset = color === 'pink' ? 0 : 26; // Red starts at index 0; Yellow starts at index 26
        return (step + offset) % 52;
    }, []);

    // Check if a token can make a legal move
    const canTokenMove = useCallback((step, diceVal) => {
        if (!diceVal) return false;
        if (step === -1) return diceVal === 6; // Needs 6 to open
        if (step >= 0 && step + diceVal <= 56) return true; // Step 56 is home
        return false;
    }, []);

    // ── STEP-BY-STEP PAWN HOPPING ANIMATION (Real Ludo King Feel!) ─────────────
    const handleExecuteMove = useCallback(async (tokenIdx, movingColor) => {
        const diceVal = gameState.dice;
        if (!diceVal || rolling || isHopping || winner) return;

        const isMe = movingColor === myColor;
        const movingTokens = isMe ? myTokens : partnerTokens;
        const currentStep = movingTokens[tokenIdx];
        if (!canTokenMove(currentStep, diceVal)) return;

        const targetStep = currentStep === -1 ? 0 : currentStep + diceVal;
        const opponentColor = movingColor === 'pink' ? 'blue' : 'pink';
        const opponentTokens = isMe ? partnerTokens : myTokens;

        setIsHopping(true);

        if (currentStep === -1) {
            // Opening token from Base Yard
            playLudoSound('open', soundEnabled);
            setGameState(prev => {
                const nextTokens = [...prev.tokens[movingColor]];
                nextTokens[tokenIdx] = 0;
                return {
                    ...prev,
                    tokens: { ...prev.tokens, [movingColor]: nextTokens }
                };
            });
            await new Promise(r => setTimeout(r, 260));
        } else {
            // Hop along track square-by-square
            for (let step = currentStep + 1; step <= targetStep; step++) {
                playLudoSound('step', soundEnabled);
                setGameState(prev => {
                    const nextTokens = [...prev.tokens[movingColor]];
                    nextTokens[tokenIdx] = step;
                    return {
                        ...prev,
                        tokens: { ...prev.tokens, [movingColor]: nextTokens }
                    };
                });
                await new Promise(r => setTimeout(r, 140)); // 140ms per hop
            }
        }

        setIsHopping(false);

        // Check for Opponent Cut / Capture on Non-Safe Squares
        let opponentCutIdx = null;
        const trackIdx = getTrackIndex(targetStep, movingColor);
        if (trackIdx !== null && !SAFE_STAR_INDICES.includes(trackIdx)) {
            opponentTokens.forEach((pStep, pIdx) => {
                const oppTrackIdx = getTrackIndex(pStep, opponentColor);
                if (oppTrackIdx !== null && oppTrackIdx === trackIdx && opponentCutIdx === null) {
                    opponentCutIdx = pIdx;
                    playLudoSound('cut', soundEnabled);
                }
            });
        }

        const updatedMovingTokens = [...movingTokens];
        updatedMovingTokens[tokenIdx] = targetStep;

        const updatedOpponentTokens = [...opponentTokens];
        if (opponentCutIdx !== null) {
            updatedOpponentTokens[opponentCutIdx] = -1; // Send back to base yard
        }

        const isGameWon = updatedMovingTokens.every(s => s === 56);

        if (isGameWon) {
            playLudoSound('win', soundEnabled);
            confetti({
                particleCount: 220,
                spread: 120,
                origin: { y: 0.5 },
                colors: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db']
            });
        } else if (targetStep === 56) {
            playLudoSound('home', soundEnabled);
        }

        // Ludo rule: Rolling a 6, cutting an opponent, or entering home grants +1 extra turn!
        const grantsBonusRoll = diceVal === 6 || opponentCutIdx !== null || targetStep === 56;
        const nextTurn = isGameWon ? null : (grantsBonusRoll ? movingColor : opponentColor);

        if (grantsBonusRoll && !isGameWon) {
            const reason = diceVal === 6 ? 'Rolled a 6! 🎲' : (opponentCutIdx !== null ? 'Cut opponent! ⚡' : 'Reached Home! 🏠');
            setExtraTurnBanner(`+1 Extra Turn (${reason})`);
            setTimeout(() => setExtraTurnBanner(''), 2500);
        }

        // Apply state updates
        setGameState(prev => {
            const newTokens = {
                ...prev.tokens,
                [movingColor]: updatedMovingTokens,
                [opponentColor]: updatedOpponentTokens
            };
            const newScores = { ...prev.scores };
            if (isGameWon && userId) {
                newScores[userId] = (newScores[userId] || 0) + (movingColor === myColor ? 1 : 0);
            }
            return {
                ...prev,
                tokens: newTokens,
                turn: nextTurn,
                dice: null,
                winner: isGameWon ? movingColor : null,
                scores: newScores
            };
        });

        // Broadcast to WebSocket partner
        sendWs({
            game: 'ludo',
            action: 'move_token',
            color: movingColor,
            token_idx: tokenIdx,
            new_pos: targetStep,
            opponent_cut_idx: opponentCutIdx,
            next_turn: nextTurn,
            winner: isGameWon ? movingColor : null
        });
    }, [gameState.dice, rolling, isHopping, winner, myColor, myTokens, partnerTokens, canTokenMove, soundEnabled, getTrackIndex, sendWs, userId]);

    // Handle user rolling their dice
    const handleRollDiceFor = useCallback((rollingColor) => {
        if (rolling || isHopping || winner || gameState.dice) return;

        setRolling(true);
        playLudoSound('dice', soundEnabled);
        setTurnTimeLeft(15);

        let count = 0;
        const interval = setInterval(() => {
            setDiceDisplay(Math.floor(Math.random() * 6) + 1);
            count++;
            if (count > 7) {
                clearInterval(interval);
                const finalDice = Math.floor(Math.random() * 6) + 1;
                setDiceDisplay(finalDice);
                setRolling(false);

                if (rollingColor === myColor) setMyLastDice(finalDice);
                else setPartnerLastDice(finalDice);

                setGameState(prev => ({
                    ...prev,
                    dice: finalDice
                }));

                sendWs({
                    game: 'ludo',
                    action: 'roll_dice',
                    dice: finalDice
                });

                // Auto-move if exactly 1 move possible
                const movingTokens = rollingColor === myColor ? myTokens : partnerTokens;
                const validMoves = [];
                movingTokens.forEach((s, idx) => {
                    if (canTokenMove(s, finalDice)) validMoves.push(idx);
                });

                if (validMoves.length === 1) {
                    setTimeout(() => {
                        handleExecuteMove(validMoves[0], rollingColor);
                    }, 400);
                } else if (validMoves.length === 0) {
                    // No moves possible -> auto pass turn after 900ms
                    setTimeout(() => {
                        const nextTurn = rollingColor === 'pink' ? 'blue' : 'pink';
                        setGameState(prev => ({
                            ...prev,
                            turn: nextTurn,
                            dice: null
                        }));
                        sendWs({
                            game: 'ludo',
                            action: 'pass_turn'
                        });
                    }, 900);
                }
            }
        }, 50);
    }, [rolling, isHopping, winner, gameState.dice, soundEnabled, myColor, myTokens, partnerTokens, canTokenMove, handleExecuteMove, sendWs]);

    const handleRollDice = useCallback(() => {
        if (!isMyTurn) return;
        handleRollDiceFor(myColor);
    }, [isMyTurn, handleRollDiceFor, myColor]);

    const handlePartnerRollDice = () => {
        if (!isPartnerActive) return;
        handleRollDiceFor(partnerColor);
    };

    const handleMoveToken = (tokenIdx) => {
        if (!isMyTurn || isHopping) return;
        handleExecuteMove(tokenIdx, myColor);
    };

    const handlePartnerMoveToken = (tokenIdx) => {
        if (!isPartnerActive || isHopping) return;
        handleExecuteMove(tokenIdx, partnerColor);
    };

    // 15-Second Turn Timer Countdown Interval
    useEffect(() => {
        if (winner || rolling || isHopping) return;
        setTurnTimeLeft(15);
        const timer = setInterval(() => {
            setTurnTimeLeft(prev => {
                if (prev <= 1) {
                    // Auto-roll or Auto-move/pass on timeout to prevent freezing
                    if (isMyTurn) {
                        if (!currentDice && !rolling) {
                            handleRollDice();
                        } else if (currentDice && !rolling && !isHopping) {
                            const validMoves = [];
                            myTokens.forEach((s, idx) => {
                                if (canTokenMove(s, currentDice)) validMoves.push(idx);
                            });
                            if (validMoves.length > 0) {
                                handleExecuteMove(validMoves[0], myColor);
                            } else {
                                const nextTurn = myColor === 'pink' ? 'blue' : 'pink';
                                setGameState(p => ({ ...p, turn: nextTurn, dice: null }));
                                sendWs({ game: 'ludo', action: 'pass_turn' });
                            }
                        }
                    }
                    return 15;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [turn, isMyTurn, currentDice, rolling, isHopping, winner, handleRollDice, myTokens, canTokenMove, handleExecuteMove, myColor, sendWs]);

    // LoveBot autonomous partner moves (in bot mode)
    useEffect(() => {
        if (turn === partnerColor && !winner && gameMode === 'bot' && !isHopping) {
            // 1. Roll Dice
            if (!currentDice && !rolling) {
                const rollTimer = setTimeout(() => {
                    handleRollDiceFor(partnerColor);
                }, 700);
                return () => clearTimeout(rollTimer);
            }

            // 2. Strategic Move Selection
            if (currentDice && !rolling) {
                const moveTimer = setTimeout(() => {
                    const validMoves = [];
                    partnerTokens.forEach((pStep, pIdx) => {
                        if (canTokenMove(pStep, currentDice)) validMoves.push(pIdx);
                    });

                    if (validMoves.length === 0) return;

                    let bestTokenIdx = validMoves[0];
                    let bestScore = -1;

                    validMoves.forEach(idx => {
                        const step = partnerTokens[idx];
                        let nextStep = step === -1 ? 0 : step + currentDice;
                        let score = nextStep;

                        if (nextStep === 56) score += 50; // Reaching home
                        if (step === -1 && currentDice === 6) score += 30; // Opening token

                        // Check if cuts player
                        const trackIdx = getTrackIndex(nextStep, partnerColor);
                        if (trackIdx !== null && !SAFE_STAR_INDICES.includes(trackIdx)) {
                            myTokens.forEach(mStep => {
                                const mTrack = getTrackIndex(mStep, myColor);
                                if (mTrack === trackIdx) score += 100;
                            });
                        }

                        if (score > bestScore) {
                            bestScore = score;
                            bestTokenIdx = idx;
                        }
                    });

                    handleExecuteMove(bestTokenIdx, partnerColor);
                }, 600);
                return () => clearTimeout(moveTimer);
            }
        }
    }, [turn, partnerColor, winner, currentDice, rolling, isHopping, gameMode, partnerTokens, canTokenMove, getTrackIndex, myTokens, myColor, handleExecuteMove, handleRollDiceFor]);

    // Reset game / Rematch
    const handleReset = () => {
        const resetState = {
            dice: null,
            turn: 'pink',
            tokens: { pink: [-1, -1, -1, -1], blue: [-1, -1, -1, -1] },
            winner: null,
            scores: gameState.scores
        };
        setGameState(resetState);
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

    // Token stacking calculations
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

    const tokenOffsets = useMemo(() => {
        const groups = {};
        allTokensOnBoard.forEach(item => {
            if (item.step === -1) return;
            const key = `${Math.round(item.cx)}_${Math.round(item.cy)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    }, [allTokensOnBoard]);

    const myScore = ludoState?.scores?.[userId] || 0;
    const partnerId = Object.keys(ludoState?.scores || {}).find(k => k !== userId);
    const partnerScore = (partnerId && ludoState?.scores?.[partnerId]) || 0;

    const myHomeCount = myTokens.filter(s => s === 56).length;
    const partnerHomeCount = partnerTokens.filter(s => s === 56).length;

    return (
        <div className="flex flex-col items-center max-w-xl mx-auto w-full px-2 sm:px-4 py-2 font-sans select-none animate-in fade-in duration-500">
            {/* Top Bar with Stakes & Controls */}
            <div className="w-full flex items-center justify-between gap-3 mb-2 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 border border-amber-400/40 text-white flex items-center justify-center font-black text-lg shadow-lg">
                        🎲
                    </div>
                    <div>
                        <h2 className="text-base font-black text-white flex items-center gap-1.5 tracking-wide">
                            <span>Ludo Royal 1v1</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                                REAL
                            </span>
                        </h2>
                        <p className="text-[11px] text-gray-400">
                            You: <strong className="text-rose-400 font-mono">{myScore}</strong> • {partnerName}: <strong className="text-amber-400 font-mono">{partnerScore}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSoundEnabled(s => !s)}
                        className={`p-2 rounded-xl border transition-all ${soundEnabled ? 'bg-white/10 text-amber-300 border-amber-500/30' : 'bg-white/5 text-gray-500 border-white/10'}`}
                        title={soundEnabled ? 'Sound ON' : 'Mute'}
                    >
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                    >
                        <RotateCcw size={14} />
                        <span>Rematch</span>
                    </motion.button>
                </div>
            </div>

            {/* Couple Stake Banner */}
            <div className="w-full mb-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-purple-950/40 via-rose-950/40 to-black/60 border border-rose-500/30 flex items-center justify-between text-xs shadow-md">
                <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">🎯</span>
                    <span className="font-bold text-rose-300 truncate">
                        {selectedStake}
                    </span>
                </div>
                <button
                    onClick={() => {
                        const nextIdx = (COUPLE_STAKES.indexOf(selectedStake) + 1) % COUPLE_STAKES.length;
                        setSelectedStake(COUPLE_STAKES[nextIdx]);
                    }}
                    className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg hover:bg-amber-500/30 transition-all flex-shrink-0"
                >
                    Change Stake
                </button>
            </div>

            {/* ── PLAYER CONTROL PANELS (YOU & PARTNER) ────────────────── */}
            <div className="w-full mb-2 grid grid-cols-2 gap-1.5 sm:gap-2.5">
                {/* You (Red) */}
                <div
                    className={`relative p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between overflow-hidden ${
                        isMyTurn
                            ? 'bg-gradient-to-r from-rose-950/90 to-black/80 border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                            : 'bg-black/50 border-white/10 opacity-75'
                    }`}
                >
                    <TurnTimerRing timeLeft={turnTimeLeft} isActive={isMyTurn && !winner} color="red" />

                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-black shadow border border-white/40 flex-shrink-0">
                            🔴
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] sm:text-xs font-bold text-white flex items-center gap-1">
                                <span>You</span>
                                {isMyTurn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-rose-300 font-mono truncate">
                                {myHomeCount}/4 Home 👑
                            </div>
                        </div>
                    </div>

                    <Realistic3DDice
                        value={isMyTurn ? (currentDice || (rolling ? diceDisplay : myLastDice)) : myLastDice}
                        rolling={rolling && isMyTurn}
                        onClick={handleRollDice}
                        disabled={!isMyTurn || rolling || isHopping || !!currentDice || !!winner}
                        isTurn={isMyTurn && !currentDice && !winner && !isHopping}
                        color="red"
                    />
                </div>

                {/* Partner (Yellow) */}
                <div
                    className={`relative p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between overflow-hidden ${
                        isPartnerActive
                            ? 'bg-gradient-to-r from-amber-950/90 to-black/80 border-amber-500 ring-2 ring-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                            : 'bg-black/50 border-white/10 opacity-75'
                    }`}
                >
                    <TurnTimerRing timeLeft={turnTimeLeft} isActive={isPartnerActive && !winner} color="yellow" />

                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-black shadow border border-white/40 flex-shrink-0">
                            🟡
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] sm:text-xs font-bold text-white flex items-center gap-1">
                                <span className="truncate max-w-[60px] sm:max-w-[80px]">{partnerName}</span>
                                {isPartnerActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-amber-300 font-mono truncate">
                                {partnerHomeCount}/4 Home 👑
                            </div>
                        </div>
                    </div>

                    <Realistic3DDice
                        value={isPartnerActive ? (currentDice || (rolling ? diceDisplay : partnerLastDice)) : partnerLastDice}
                        rolling={rolling && turn === partnerColor}
                        disabled={!isPartnerActive || rolling || isHopping || !!currentDice || !!winner}
                        onClick={handlePartnerRollDice}
                        isTurn={isPartnerActive && !currentDice && !winner && !isHopping}
                        color="yellow"
                    />
                </div>
            </div>

            {/* Turn Announcement Banner */}
            <div className="w-full mb-2 px-3 py-1.5 rounded-xl bg-black/70 border border-white/10 flex flex-col items-center justify-center text-xs">
                {extraTurnBanner && (
                    <span className="text-amber-400 font-black animate-bounce mb-0.5">
                        ✨ {extraTurnBanner}
                    </span>
                )}
                {winner ? (
                    <span className="text-emerald-400 font-black flex items-center gap-1.5 animate-bounce">
                        🏆 {winner === myColor ? 'Victory! You won the Ludo match!' : `${partnerName} won the match!`}
                    </span>
                ) : isHopping ? (
                    <span className="text-amber-300 font-bold flex items-center gap-1 animate-pulse">
                        🎲 Moving Pawn step-by-step...
                    </span>
                ) : isMyTurn ? (
                    <span className="text-rose-300 font-extrabold flex items-center gap-1 animate-pulse">
                        {currentDice ? `🎲 Rolled ${currentDice}! Tap a glowing pawn to move.` : '✨ Your Turn (Red)! Tap your 3D Dice to roll.'}
                    </span>
                ) : isPartnerActive ? (
                    <span className="text-amber-300 font-extrabold flex items-center gap-1 animate-pulse">
                        {currentDice ? `🎲 Rolled ${currentDice}! Tap a glowing pawn to move.` : `✨ ${partnerName}'s Turn (Yellow)! Tap 3D Dice.`}
                    </span>
                ) : (
                    <span className="text-gray-400 flex items-center gap-1">
                        ⏳ Waiting for {partnerName} to roll...
                    </span>
                )}
            </div>

            {/* ── 100% PURE VECTOR SVG AUTHENTIC LUDO BOARD (600x600) ──── */}
            <div className="relative w-full max-w-[min(94vw,410px)] mx-auto aspect-square p-1.5 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#2d1b3f] via-[#1d122b] to-[#140b1f] border-2 sm:border-4 border-[#52336e] shadow-2xl flex items-center justify-center overflow-hidden">
                <svg
                    viewBox="0 0 600 600"
                    className="w-full h-full aspect-square rounded-xl sm:rounded-2xl shadow-inner overflow-hidden"
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
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                            <stop offset="35%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#881337" />
                        </radialGradient>
                        <radialGradient id="pawn-grad-blue" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                            <stop offset="35%" stopColor="#fde047" />
                            <stop offset="100%" stopColor="#b45309" />
                        </radialGradient>
                    </defs>

                    {/* Board Outer Boundary */}
                    <rect x="0" y="0" width="600" height="600" fill="#ffffff" stroke="#0f172a" strokeWidth="4" />

                    {/* ==================== 1. FOUR CORNER YARDS / BASES (6x6 each) ==================== */}
                    {/* Top-Left: RED BASE */}
                    <rect x="0" y="0" width="240" height="240" fill="#e11d48" stroke="#0f172a" strokeWidth="2.5" />
                    <rect x="40" y="40" width="160" height="160" rx="20" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="80" cy="80" r="22" fill="#ffe4e6" stroke="#e11d48" strokeWidth="3" />
                    <circle cx="160" cy="80" r="22" fill="#ffe4e6" stroke="#e11d48" strokeWidth="3" />
                    <circle cx="80" cy="160" r="22" fill="#ffe4e6" stroke="#e11d48" strokeWidth="3" />
                    <circle cx="160" cy="160" r="22" fill="#ffe4e6" stroke="#e11d48" strokeWidth="3" />

                    {/* Top-Right: GREEN BASE */}
                    <rect x="360" y="0" width="240" height="240" fill="#16a34a" stroke="#0f172a" strokeWidth="2.5" />
                    <rect x="400" y="40" width="160" height="160" rx="20" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="440" cy="80" r="22" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />
                    <circle cx="520" cy="80" r="22" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />
                    <circle cx="440" cy="160" r="22" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />
                    <circle cx="520" cy="160" r="22" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />

                    {/* Bottom-Right: YELLOW BASE */}
                    <rect x="360" y="360" width="240" height="240" fill="#eab308" stroke="#0f172a" strokeWidth="2.5" />
                    <rect x="400" y="400" width="160" height="160" rx="20" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="440" cy="440" r="22" fill="#fef9c3" stroke="#eab308" strokeWidth="3" />
                    <circle cx="520" cy="440" r="22" fill="#fef9c3" stroke="#eab308" strokeWidth="3" />
                    <circle cx="440" cy="520" r="22" fill="#fef9c3" stroke="#eab308" strokeWidth="3" />
                    <circle cx="520" cy="520" r="22" fill="#fef9c3" stroke="#eab308" strokeWidth="3" />

                    {/* Bottom-Left: BLUE BASE */}
                    <rect x="0" y="360" width="240" height="240" fill="#0284c7" stroke="#0f172a" strokeWidth="2.5" />
                    <rect x="40" y="400" width="160" height="160" rx="20" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="80" cy="440" r="22" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
                    <circle cx="160" cy="440" r="22" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
                    <circle cx="80" cy="520" r="22" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
                    <circle cx="160" cy="520" r="22" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />

                    {/* ==================== 2. TRACK GRIDS ==================== */}
                    {/* Left Arm */}
                    <g transform="translate(0, 240)">
                        <use href="#cell" x="0" y="0" />
                        <use href="#cell" x="40" y="0" fill="#e11d48" />{/* Red Start */}
                        <use href="#cell" x="80" y="0" /><use href="#cell" x="120" y="0" /><use href="#cell" x="160" y="0" /><use href="#cell" x="200" y="0" />
                        {/* Red Home Stretch */}
                        <use href="#cell" x="0" y="40" />
                        <use href="#cell" x="40" y="40" fill="#e11d48" /><use href="#cell" x="80" y="40" fill="#e11d48" /><use href="#cell" x="120" y="40" fill="#e11d48" /><use href="#cell" x="160" y="40" fill="#e11d48" /><use href="#cell" x="200" y="40" fill="#e11d48" />
                        <use href="#cell" x="0" y="80" /><use href="#cell" x="40" y="80" /><use href="#cell" x="80" y="80" /><use href="#cell" x="120" y="80" /><use href="#cell" x="160" y="80" /><use href="#cell" x="200" y="80" />
                    </g>

                    {/* Top Arm */}
                    <g transform="translate(240, 0)">
                        <use href="#cell" x="0" y="0" /><use href="#cell" x="40" y="0" /><use href="#cell" x="80" y="0" />
                        <use href="#cell" x="0" y="40" /><use href="#cell" x="40" y="40" fill="#16a34a" /><use href="#cell" x="80" y="40" fill="#16a34a" />{/* Green Start */}
                        <use href="#cell" x="0" y="80" /><use href="#cell" x="40" y="80" fill="#16a34a" /><use href="#cell" x="80" y="80" />
                        <use href="#cell" x="0" y="120" /><use href="#cell" x="40" y="120" fill="#16a34a" /><use href="#cell" x="80" y="120" />
                        <use href="#cell" x="0" y="160" /><use href="#cell" x="40" y="160" fill="#16a34a" /><use href="#cell" x="80" y="160" />
                        <use href="#cell" x="0" y="200" /><use href="#cell" x="40" y="200" fill="#16a34a" /><use href="#cell" x="80" y="200" />
                    </g>

                    {/* Right Arm */}
                    <g transform="translate(360, 240)">
                        <use href="#cell" x="0" y="0" /><use href="#cell" x="40" y="0" /><use href="#cell" x="80" y="0" /><use href="#cell" x="120" y="0" /><use href="#cell" x="160" y="0" /><use href="#cell" x="200" y="0" />
                        {/* Yellow Home Stretch */}
                        <use href="#cell" x="0" y="40" fill="#eab308" /><use href="#cell" x="40" y="40" fill="#eab308" /><use href="#cell" x="80" y="40" fill="#eab308" /><use href="#cell" x="120" y="40" fill="#eab308" /><use href="#cell" x="160" y="40" fill="#eab308" />
                        <use href="#cell" x="200" y="40" />
                        <use href="#cell" x="0" y="80" /><use href="#cell" x="40" y="80" /><use href="#cell" x="80" y="80" /><use href="#cell" x="120" y="80" />
                        <use href="#cell" x="160" y="80" fill="#eab308" />{/* Yellow Start */}
                        <use href="#cell" x="200" y="80" />
                    </g>

                    {/* Bottom Arm */}
                    <g transform="translate(240, 360)">
                        <use href="#cell" x="0" y="0" /><use href="#cell" x="40" y="0" fill="#0284c7" /><use href="#cell" x="80" y="0" />
                        <use href="#cell" x="0" y="40" /><use href="#cell" x="40" y="40" fill="#0284c7" /><use href="#cell" x="80" y="40" />
                        <use href="#cell" x="0" y="80" /><use href="#cell" x="40" y="80" fill="#0284c7" /><use href="#cell" x="80" y="80" />
                        <use href="#cell" x="0" y="120" /><use href="#cell" x="40" y="120" fill="#0284c7" /><use href="#cell" x="80" y="120" />
                        <use href="#cell" x="0" y="160" fill="#0284c7" />{/* Blue Start */}
                        <use href="#cell" x="40" y="160" fill="#0284c7" /><use href="#cell" x="80" y="160" />
                        <use href="#cell" x="0" y="200" /><use href="#cell" x="40" y="200" /><use href="#cell" x="80" y="200" />
                    </g>

                    {/* ==================== 3. CENTER HOME TRIANGLES ==================== */}
                    <g transform="translate(240, 240)">
                        <rect x="0" y="0" width="120" height="120" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                        <polygon points="0,0 60,60 0,120" fill="#e11d48" stroke="#0f172a" strokeWidth="1.5" />
                        <polygon points="0,0 120,0 60,60" fill="#16a34a" stroke="#0f172a" strokeWidth="1.5" />
                        <polygon points="120,0 120,120 60,60" fill="#eab308" stroke="#0f172a" strokeWidth="1.5" />
                        <polygon points="0,120 60,60 120,120" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5" />
                        <circle cx="60" cy="60" r="16" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
                        <text x="60" y="65" textAnchor="middle" fontSize="14" fill="#78350f" fontWeight="bold">👑</text>
                    </g>

                    {/* ==================== 4. 8 SAFE STARS ==================== */}
                    <use href="#star" x="40" y="240" />
                    <use href="#star" x="80" y="320" />
                    <use href="#star" x="320" y="40" />
                    <use href="#star" x="240" y="80" />
                    <use href="#star" x="520" y="320" />
                    <use href="#star" x="480" y="240" />
                    <use href="#star" x="240" y="520" />
                    <use href="#star" x="320" y="480" />

                    {/* Directional Arrows for Home Stretch */}
                    <text x="45" y="295" fontSize="14" fill="#ffffff" fontWeight="bold">➜</text>
                    <text x="545" y="295" fontSize="14" fill="#78350f" fontWeight="bold">⬅</text>
                    <text x="295" y="45" fontSize="14" fill="#ffffff" fontWeight="bold">⬇</text>
                    <text x="295" y="565" fontSize="14" fill="#ffffff" fontWeight="bold">⬆</text>

                    {/* ==================== 5. 3D GLOSSY PAWNS (GOTTIYAN) ==================== */}
                    {allTokensOnBoard.map((item) => {
                        const { isMe, color, tokenIdx, step, cx, cy } = item;
                        const canMove = (isMe && isMyTurn && canTokenMove(step, currentDice) && !isHopping) ||
                                        (!isMe && isPartnerActive && canTokenMove(step, currentDice) && !isHopping);

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
                                onClick={() => {
                                    if (isMe && isMyTurn) handleMoveToken(tokenIdx);
                                    else if (!isMe && isPartnerActive) handlePartnerMoveToken(tokenIdx);
                                }}
                                className={canMove ? 'cursor-pointer' : ''}
                            >
                                <circle cx="0" cy="0" r="26" fill="#ffffff" opacity="0.001" />

                                {/* Highlight Pulsing Ring on Playable Pawn */}
                                {canMove && (
                                    <>
                                        <circle cx="0" cy="0" r="22" fill="none" stroke="#facc15" strokeWidth="3" opacity="0.85" />
                                        <circle cx="0" cy="0" r="26" fill="none" stroke="#facc15" strokeWidth="2" opacity="0.6" className="animate-ping" />
                                    </>
                                )}

                                {/* Pawn Shadow */}
                                <ellipse cx="0" cy="14" rx="14" ry="5" fill="#000000" opacity="0.4" />

                                {/* Pawn Flared Base */}
                                <ellipse
                                    cx="0"
                                    cy="11"
                                    rx="13"
                                    ry="4"
                                    fill={isRedPawn ? '#be123c' : '#b45309'}
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                />

                                {/* Pawn Stem */}
                                <path
                                    d="M -9,10 C -9,4 -4,0 -4,-3 L 4,-3 C 4,0 9,4 9,10 Z"
                                    fill={isRedPawn ? '#f43f5e' : '#facc15'}
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
            <div className="w-full mt-2.5 p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] text-gray-300">
                <span className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold">★</span> Safe Star
                </span>
                <span className="flex items-center gap-1">
                    <span className="text-rose-400 font-bold">🎲 6</span> Opens & Extra Roll
                </span>
                <span className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">⚡ Cut</span> Gives Bonus Turn
                </span>
            </div>

            {/* ── WINNER ROMANTIC CELEBRATION MODAL ── */}
            <AnimatePresence>
                {winner && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1c1228] to-black border border-amber-400/40 p-6 text-center shadow-2xl space-y-4"
                        >
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/40 animate-bounce">
                                👑
                            </div>
                            <h3 className="text-xl font-black text-white">
                                {winner === myColor ? "You Won the Ludo Match! 🏆" : `${partnerName} Won the Match! 🏆`}
                            </h3>
                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-amber-200">
                                <p className="font-bold uppercase tracking-wider text-[10px] text-gray-400 mb-1">Claimable Stake</p>
                                <p className="text-sm font-extrabold">{selectedStake}</p>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleReset}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/30"
                            >
                                Play Rematch 🎲
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
