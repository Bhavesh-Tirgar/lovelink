import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Layers, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+2', 'skip'];

// Generate standard Uno deck
function createDeck() {
    const deck = [];
    let id = 1;

    COLORS.forEach(color => {
        VALUES.forEach(val => {
            deck.push({ id: `c-${id++}`, color, value: val });
            if (val !== '0') {
                deck.push({ id: `c-${id++}`, color, value: val });
            }
        });
    });

    // 4 Wild and 4 Wild +4
    for (let i = 0; i < 4; i++) {
        deck.push({ id: `c-${id++}`, color: 'wild', value: 'wild' });
        deck.push({ id: `c-${id++}`, color: 'wild', value: '+4' });
    }

    // Shuffle deck (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

// Web Audio sound synthesizer
const playUnoSound = (type, soundEnabled = true) => {
    if (!soundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        if (type === 'play') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'draw') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(380, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'wild') {
            [440, 554.37, 659.25, 880].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                gain.gain.setValueAtTime(0.2, now + idx * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.15);
            });
        } else if (type === 'uno') {
            [587.33, 880].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.3, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.25);
            });
        } else if (type === 'win') {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.3, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.4);
            });
        }
    } catch {}
};

// Card styling maps
const COLOR_STYLES = {
    red: { bg: 'bg-rose-600', border: 'border-rose-400', text: 'text-rose-200', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.6)]' },
    blue: { bg: 'bg-cyan-600', border: 'border-cyan-400', text: 'text-cyan-200', glow: 'shadow-[0_0_12px_rgba(6,182,212,0.6)]' },
    green: { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-200', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]' },
    yellow: { bg: 'bg-amber-500', border: 'border-amber-300', text: 'text-amber-100', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]' },
    wild: { bg: 'bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500', border: 'border-white/60', text: 'text-white', glow: 'shadow-[0_0_15px_rgba(255,255,255,0.7)]' }
};

export default function CoupleUno({
    userId,
    coupleId,
    partnerName = "Partner",
    sendWs,
    unoState,
    isLiveConnected
}) {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [myHand, setMyHand] = useState([]);
    const [partnerCardCount, setPartnerCardCount] = useState(7);
    const [discardPile, setDiscardPile] = useState([]);
    const [deck, setDeck] = useState([]);
    const [activeColor, setActiveColor] = useState('red');
    const [turn, setTurn] = useState(null);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const [pendingWildCard, setPendingWildCard] = useState(null);

    const isMyTurn = turn === userId;
    const topCard = discardPile[discardPile.length - 1] || null;
    const winner = unoState?.winner;

    // Initialize game if first time opening
    const initGame = useCallback(() => {
        const fullDeck = createDeck();
        const p1Hand = fullDeck.splice(0, 7);
        const p2Hand = fullDeck.splice(0, 7);

        // Find first non-wild card for top of discard
        let startCardIdx = fullDeck.findIndex(c => c.color !== 'wild');
        if (startCardIdx === -1) startCardIdx = 0;
        const [startCard] = fullDeck.splice(startCardIdx, 1);

        setMyHand(p1Hand);
        setPartnerCardCount(p2Hand.length);
        setDiscardPile([startCard]);
        setDeck(fullDeck);
        setActiveColor(startCard.color);
        setTurn(userId);

        sendWs({
            game: 'uno',
            action: 'sync_init',
            deck: fullDeck,
            discard: [startCard],
            top_card: startCard,
            active_color: startCard.color,
            turn: userId,
            p1_hand: p1Hand,
            p2_hand: p2Hand
        });
    }, [userId, sendWs]);

    // Mount initialization
    useEffect(() => {
        if (!topCard && !winner) {
            initGame();
        }
    }, [topCard, winner, initGame]);

    // Handle incoming WebSocket synced state
    useEffect(() => {
        if (unoState?.incomingSync) {
            const sync = unoState.incomingSync;
            if (sync.p2_hand && sync.p1_hand) {
                // Partner initiated game -> pick our assigned hand
                setMyHand(sync.p2_hand);
                setPartnerCardCount(sync.p1_hand.length);
            }
            if (sync.discard) setDiscardPile(sync.discard);
            if (sync.active_color) setActiveColor(sync.active_color);
            if (sync.turn) setTurn(sync.turn);
            if (sync.deck) setDeck(sync.deck);
        }
    }, [unoState?.incomingSync]);

    // Handle played card from partner
    useEffect(() => {
        if (unoState?.lastPlayedCard) {
            const { card, active_color, next_turn, draw_penalty, winner: gameWinner, by_user } = unoState.lastPlayedCard;
            if (by_user !== userId) {
                playUnoSound(card.color === 'wild' ? 'wild' : 'play', soundEnabled);
                setDiscardPile(prev => [...prev, card]);
                setActiveColor(active_color);
                setPartnerCardCount(c => Math.max(0, c - 1));
                setTurn(next_turn);

                // Handle draw penalties (+2 or +4)
                if (draw_penalty > 0) {
                    playUnoSound('draw', soundEnabled);
                    setDeck(d => {
                        const drawn = d.slice(0, draw_penalty);
                        setMyHand(h => [...h, ...drawn]);
                        return d.slice(draw_penalty);
                    });
                }

                if (gameWinner) {
                    playUnoSound('win', soundEnabled);
                }
            }
        }
    }, [unoState?.lastPlayedCard, userId, soundEnabled]);

    // Handle card drawn by partner
    useEffect(() => {
        if (unoState?.lastDrawn) {
            const { next_turn, by_user } = unoState.lastDrawn;
            if (by_user !== userId) {
                playUnoSound('draw', soundEnabled);
                setPartnerCardCount(c => c + 1);
                setTurn(next_turn);
            }
        }
    }, [unoState?.lastDrawn, userId, soundEnabled]);

    // Check if a card is legally playable
    const isCardPlayable = useCallback((card) => {
        if (!topCard || !isMyTurn || winner) return false;
        if (card.color === 'wild') return true;
        if (card.color === activeColor) return true;
        if (card.value === topCard.value) return true;
        return false;
    }, [topCard, isMyTurn, winner, activeColor]);

    // Play Card
    const handleCardClick = (card) => {
        if (!isMyTurn || !isCardPlayable(card)) return;

        // If wild card -> open color selector modal
        if (card.color === 'wild') {
            setPendingWildCard(card);
            setColorPickerOpen(true);
            return;
        }

        executeCardPlay(card, card.color);
    };

    const executeCardPlay = (card, chosenColor) => {
        const remainingHand = myHand.filter(c => c.id !== card.id);
        setMyHand(remainingHand);
        setDiscardPile(prev => [...prev, card]);
        setActiveColor(chosenColor);

        playUnoSound(card.color === 'wild' ? 'wild' : 'play', soundEnabled);

        const isUno = remainingHand.length === 1;
        if (isUno) {
            playUnoSound('uno', soundEnabled);
        }

        const isGameWon = remainingHand.length === 0;
        if (isGameWon) {
            playUnoSound('win', soundEnabled);
            confetti({
                particleCount: 160,
                spread: 100,
                origin: { y: 0.5 },
                colors: ['#f43f5e', '#38bdf8', '#10b981', '#f59e0b', '#ec4899']
            });
        }

        // Determine next turn & draw penalty
        let drawPenalty = 0;
        let nextTurn = partnerName; // partner user ID or toggle
        // If +2 card
        if (card.value === '+2') {
            drawPenalty = 2;
            nextTurn = userId; // In 1v1, +2 skips partner turn, so you get another turn!
        } else if (card.value === '+4') {
            drawPenalty = 4;
            nextTurn = userId; // In 1v1, +4 skips partner turn!
        } else if (card.value === 'skip') {
            nextTurn = userId; // Skip gives you another turn in 1v1!
        } else {
            // Normal pass to partner
            nextTurn = 'partner';
        }

        sendWs({
            game: 'uno',
            action: 'play_card',
            card,
            active_color: chosenColor,
            next_turn: nextTurn === userId ? userId : 'partner',
            draw_penalty: drawPenalty,
            is_uno: isUno,
            winner: isGameWon ? userId : null
        });

        setColorPickerOpen(false);
        setPendingWildCard(null);
    };

    // Draw card from deck
    const handleDrawCard = () => {
        if (!isMyTurn || winner || deck.length === 0) return;

        playUnoSound('draw', soundEnabled);
        const [drawnCard] = deck.slice(0, 1);
        const remainingDeck = deck.slice(1);

        setDeck(remainingDeck);
        setMyHand(h => [...h, drawnCard]);
        setTurn('partner');

        sendWs({
            game: 'uno',
            action: 'draw_card',
            card: drawnCard,
            next_turn: 'partner'
        });
    };

    // Reset game
    const handleReset = () => {
        initGame();
        sendWs({
            game: 'uno',
            action: 'reset'
        });
    };

    // Scores
    const myScore = unoState?.scores?.[userId] || 0;
    const partnerId = Object.keys(unoState?.scores || {}).find(k => k !== userId);
    const partnerScore = (partnerId && unoState?.scores?.[partnerId]) || 0;

    return (
        <div className="flex flex-col items-center max-w-xl mx-auto w-full px-2 sm:px-4 py-2 font-sans select-none animate-in fade-in duration-500">
            {/* Header */}
            <div className="w-full flex items-center justify-between gap-3 mb-3 px-1">
                <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 text-amber-300">
                        <Layers size={18} />
                    </span>
                    <div>
                        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                            Couple Uno Showdown
                        </h2>
                        <p className="text-[11px] text-gray-400">
                            You: <strong className="text-pink-300">{myScore}</strong> • {partnerName}: <strong className="text-purple-300">{partnerScore}</strong>
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
                        title="New Round / Shuffle"
                    >
                        <RotateCcw size={15} />
                    </button>
                </div>
            </div>

            {/* Status / Active Color Bar */}
            <div className="w-full mb-3 p-2.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full ${COLOR_STYLES[activeColor]?.bg} ${COLOR_STYLES[activeColor]?.glow} ring-2 ring-white/60 animate-pulse`} />
                    <span className="text-xs font-semibold text-white">
                        {winner ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                                🏆 {winner === userId ? 'You won the round!' : `${partnerName} won!`}
                            </span>
                        ) : isMyTurn ? (
                            <span className="text-pink-200">Your turn! Match {activeColor.toUpperCase()} or {topCard?.value}</span>
                        ) : (
                            <span className="text-gray-400">Waiting for {partnerName}...</span>
                        )}
                    </span>
                </div>

                {myHand.length === 1 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black tracking-wider animate-bounce shadow-[0_0_12px_#f43f5e]">
                        UNO! 🔥
                    </span>
                )}
            </div>

            {/* Partner's Hand (Face-down cards rack) */}
            <div className="w-full flex flex-col items-center mb-3">
                <p className="text-[11px] text-gray-400 mb-1.5 font-medium">
                    {partnerName}'s Hand ({partnerCardCount} cards)
                </p>
                <div className="flex items-center justify-center -space-x-3 sm:-space-x-4 overflow-hidden px-4 py-1">
                    {Array.from({ length: partnerCardCount }).map((_, idx) => (
                        <div
                            key={idx}
                            className="w-10 h-14 sm:w-12 sm:h-16 rounded-xl bg-gradient-to-tr from-purple-950 to-indigo-900 border border-white/20 shadow-md flex items-center justify-center select-none"
                        >
                            <span className="text-pink-400 font-black text-xs">U</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Center Play Area (Draw Deck & Discard Pile) */}
            <div className="w-full flex items-center justify-center gap-6 sm:gap-10 my-2 py-4 px-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-md">
                {/* Draw Deck */}
                <button
                    onClick={handleDrawCard}
                    disabled={!isMyTurn || !!winner}
                    className={`relative w-20 h-28 sm:w-24 sm:h-36 rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 border-2 border-indigo-400/50 shadow-2xl flex flex-col items-center justify-center transition-all ${
                        isMyTurn && !winner ? 'hover:scale-105 active:scale-95 hover:border-pink-400 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'opacity-60 cursor-default'
                    }`}
                >
                    <span className="text-2xl font-black text-pink-400 tracking-wider">UNO</span>
                    <span className="text-[10px] text-gray-400 mt-1 font-bold">DRAW</span>
                    <span className="absolute bottom-1.5 text-[9px] text-gray-500 font-medium">
                        {deck.length} left
                    </span>
                </button>

                {/* Discard Pile (Top Card) */}
                {topCard && (
                    <div
                        className={`w-20 h-28 sm:w-24 sm:h-36 rounded-2xl ${COLOR_STYLES[activeColor]?.bg} border-2 ${COLOR_STYLES[activeColor]?.border} ${COLOR_STYLES[activeColor]?.glow} flex flex-col items-center justify-center shadow-2xl transform rotate-1 select-none`}
                    >
                        <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">
                            {topCard.value}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-white/80 tracking-widest mt-1">
                            {activeColor}
                        </span>
                    </div>
                )}
            </div>

            {/* Player's Hand (Interactive cards rack) */}
            <div className="w-full flex flex-col items-center mt-3">
                <p className="text-[11px] text-pink-300 mb-2 font-medium">
                    Your Hand ({myHand.length} cards)
                </p>
                <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 max-w-lg px-2">
                    {myHand.map((card) => {
                        const playable = isCardPlayable(card);
                        const style = COLOR_STYLES[card.color];

                        return (
                            <button
                                key={card.id}
                                onClick={() => handleCardClick(card)}
                                disabled={!playable}
                                className={`w-12 h-18 sm:w-14 sm:h-20 rounded-xl ${style.bg} border ${style.border} flex flex-col items-center justify-center shadow-lg transition-all ${
                                    playable
                                        ? 'hover:scale-110 active:scale-95 cursor-pointer -translate-y-2 ring-2 ring-pink-400 ring-offset-2 ring-offset-black shadow-[0_0_15px_rgba(244,114,182,0.8)]'
                                        : 'opacity-40 grayscale-[40%] cursor-default'
                                }`}
                            >
                                <span className="text-lg sm:text-xl font-black text-white leading-tight">
                                    {card.value}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Wild Color Picker Modal */}
            {colorPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0e0a1a] border border-white/20 rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center">
                        <h3 className="text-base font-bold text-white mb-2 flex items-center justify-center gap-1.5">
                            <Sparkles size={16} className="text-pink-400" /> Choose Wild Color
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Pick the next active color for the discard pile:</p>
                        <div className="grid grid-cols-2 gap-3">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => executeCardPlay(pendingWildCard, c)}
                                    className={`py-3 rounded-2xl ${COLOR_STYLES[c].bg} text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all`}
                                >
                                    {c.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
