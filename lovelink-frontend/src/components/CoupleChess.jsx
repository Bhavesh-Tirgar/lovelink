import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import { Crown, RotateCcw, Flag, Sparkles, Heart, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

// Web Audio sound synthesizer for realistic, dependency-free chess acoustics
const playChessSound = (type, soundEnabled = true) => {
    if (!soundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        if (type === 'move') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'capture') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(480, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'check') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc2.frequency.setValueAtTime(880.00, now + 0.06); // A5
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);
            osc2.start(now + 0.06);
            osc2.stop(now + 0.35);
        } else if (type === 'win') {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.25, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.4);
            });
        }
    } catch {}
};

// Unicode pieces mapping with modern styling
const PIECE_SYMBOLS = {
    p: '♟',
    r: '♜',
    n: '♞',
    b: '♝',
    q: '♛',
    k: '♚'
};

const STAKE_PRESETS = [
    "Loser gives a 15-minute massage 💆",
    "Winner gets 20 romantic kisses 💋",
    "Loser cooks breakfast in bed 🍳",
    "Winner picks tonight's movie 🎬",
    "Loser owes a romantic surprise date ✨",
    "Winner gets pampered all evening 👑"
];

export default function CoupleChess({
    userId,
    coupleId,
    partnerName = "Partner",
    sendWs,
    chessState,
    isLiveConnected
}) {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [lastMove, setLastMove] = useState(null);
    const [customStakesOpen, setCustomStakesOpen] = useState(false);
    const [stakesInput, setStakesInput] = useState('');

    // Local chess instance initialized with session FEN or standard start
    const gameRef = useRef(new Chess(chessState?.fen || undefined));
    const [currentFen, setCurrentFen] = useState(() => gameRef.current.fen());

    // Sync external chess state updates (from WebSocket)
    useEffect(() => {
        if (chessState?.fen && chessState.fen !== gameRef.current.fen()) {
            try {
                gameRef.current.load(chessState.fen);
                setCurrentFen(chessState.fen);
                setSelectedSquare(null);
                setPossibleMoves([]);
            } catch (e) {
                console.error("Failed to load FEN", e);
            }
        }
    }, [chessState?.fen]);

    // Handle last move highlighting and sound playback
    useEffect(() => {
        if (chessState?.lastMove) {
            setLastMove(chessState.lastMove);
            if (chessState.lastMove.is_checkmate) {
                playChessSound('win', soundEnabled);
                if (chessState.lastMove.by_user === userId) {
                    confetti({
                        particleCount: 120,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#ec4899', '#f43f5e', '#a855f7', '#fb7185', '#ffffff']
                    });
                }
            } else if (chessState.lastMove.is_check) {
                playChessSound('check', soundEnabled);
            } else if (chessState.lastMove.captured) {
                playChessSound('capture', soundEnabled);
            } else {
                playChessSound('move', soundEnabled);
            }
        }
    }, [chessState?.lastMove, soundEnabled, userId]);

    // Role assignment: Determine whether current user plays White or Black
    // Default: white is the creator or first player
    const whitePlayerId = chessState?.white;
    const isWhite = whitePlayerId ? String(whitePlayerId) === String(userId) : true;
    const myColor = isWhite ? 'w' : 'b';
    const partnerColor = isWhite ? 'b' : 'w';

    const turn = gameRef.current.turn(); // 'w' or 'b'
    const isMyTurn = turn === myColor;

    const isCheck = gameRef.current.isCheck();
    const isCheckmate = gameRef.current.isCheckmate();
    const isDraw = gameRef.current.isDraw();

    // Ranks and Files (Auto-flipped so your color is on your home bottom side!)
    const ranks = useMemo(() => {
        return isWhite ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
    }, [isWhite]);

    const files = useMemo(() => {
        return isWhite ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    }, [isWhite]);

    // Captured pieces tally
    const capturedPieces = useMemo(() => {
        const board = gameRef.current.board();
        const currentCount = { w: { p: 0, r: 0, n: 0, b: 0, q: 0 }, b: { p: 0, r: 0, n: 0, b: 0, q: 0 } };
        board.flat().forEach(piece => {
            if (piece) {
                currentCount[piece.color][piece.type] = (currentCount[piece.color][piece.type] || 0) + 1;
            }
        });
        const starting = { p: 8, r: 2, n: 2, b: 2, q: 1 };
        const capturedByWhite = []; // Black pieces taken
        const capturedByBlack = []; // White pieces taken

        ['p', 'n', 'b', 'r', 'q'].forEach(type => {
            const lostBlack = starting[type] - (currentCount.b[type] || 0);
            for (let i = 0; i < lostBlack; i++) capturedByWhite.push(type);
            const lostWhite = starting[type] - (currentCount.w[type] || 0);
            for (let i = 0; i < lostWhite; i++) capturedByBlack.push(type);
        });

        return {
            whiteTook: capturedByWhite,
            blackTook: capturedByBlack
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFen]);

    // Handle Square Selection and Moves
    const handleSquareClick = useCallback((square) => {
        if (!isMyTurn || isCheckmate || isDraw) return;

        const piece = gameRef.current.get(square);

        // 1. If clicking a square with user's own piece -> select it & show legal moves
        if (piece && piece.color === myColor) {
            setSelectedSquare(square);
            const legal = gameRef.current.moves({ square, verbose: true });
            setPossibleMoves(legal);
            return;
        }

        // 2. If already selected a piece and clicked a valid move destination -> execute move
        if (selectedSquare) {
            const matchedMove = possibleMoves.find(m => m.to === square);
            if (matchedMove) {
                try {
                    const moveObj = {
                        from: selectedSquare,
                        to: square,
                        promotion: matchedMove.promotion || 'q'
                    };
                    const res = gameRef.current.move(moveObj);
                    if (res) {
                        const newFen = gameRef.current.fen();
                        setCurrentFen(newFen);
                        setSelectedSquare(null);
                        setPossibleMoves([]);
                        setLastMove({ from: selectedSquare, to: square });

                        const check = gameRef.current.isCheck();
                        const mate = gameRef.current.isCheckmate();
                        const draw = gameRef.current.isDraw();

                        if (mate) {
                            playChessSound('win', soundEnabled);
                            confetti({
                                particleCount: 150,
                                spread: 90,
                                origin: { y: 0.6 },
                                colors: ['#ec4899', '#f43f5e', '#a855f7', '#fb7185', '#ffffff']
                            });
                        } else if (check) {
                            playChessSound('check', soundEnabled);
                        } else if (res.captured) {
                            playChessSound('capture', soundEnabled);
                        } else {
                            playChessSound('move', soundEnabled);
                        }

                        // Broadcast to partner over WebSocket
                        sendWs({
                            game: 'chess',
                            action: 'move',
                            from: selectedSquare,
                            to: square,
                            promotion: moveObj.promotion,
                            fen: newFen,
                            san: res.san,
                            captured: res.captured || null,
                            is_check: check,
                            is_checkmate: mate,
                            is_draw: draw
                        });
                    }
                } catch (e) {
                    console.error("Illegal move attempt", e);
                }
            } else {
                // Clicked an invalid destination -> deselect
                setSelectedSquare(null);
                setPossibleMoves([]);
            }
        }
    }, [isMyTurn, isCheckmate, isDraw, myColor, selectedSquare, possibleMoves, sendWs, soundEnabled]);

    // Rematch / Reset
    const handleRematch = () => {
        gameRef.current.reset();
        const startFen = gameRef.current.fen();
        setCurrentFen(startFen);
        setSelectedSquare(null);
        setPossibleMoves([]);
        setLastMove(null);

        sendWs({
            game: 'chess',
            action: 'reset',
            fen: startFen
        });
    };

    // Resign
    const handleResign = () => {
        if (window.confirm("Surrender this round to your love? 💕")) {
            sendWs({
                game: 'chess',
                action: 'resign'
            });
        }
    };

    // Update Stakes
    const handleSetStakes = (newStake) => {
        sendWs({
            game: 'chess',
            action: 'set_stakes',
            stakes: newStake
        });
        setCustomStakesOpen(false);
    };

    // Find King position for check indicator
    const kingInCheckSquare = useMemo(() => {
        if (!isCheck) return null;
        const board = gameRef.current.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.type === 'k' && piece.color === turn) {
                    const fileLetter = String.fromCharCode(97 + c);
                    const rankNumber = String(8 - r);
                    return `${fileLetter}${rankNumber}`;
                }
            }
        }
        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCheck, turn, currentFen]);

    // Scores
    const myScore = chessState?.scores?.[userId] || 0;
    const partnerId = Object.keys(chessState?.scores || {}).find(k => k !== userId);
    const partnerScore = (partnerId && chessState?.scores?.[partnerId]) || 0;

    return (
        <div className="flex flex-col items-center max-w-xl mx-auto w-full px-2 sm:px-4 py-2 font-sans select-none animate-in fade-in duration-500">
            {/* Header: Scores, Sound & Stakes */}
            <div className="w-full flex items-center justify-between gap-3 mb-3 px-1">
                <div className="flex items-center gap-2">
                    <span className="p-2 rounded-2xl bg-gradient-to-br from-amber-500/20 to-pink-500/20 border border-amber-500/30 text-amber-300">
                        <Crown size={18} />
                    </span>
                    <div>
                        <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                            Royal Couple Chess
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
                        title={soundEnabled ? "Mute sound" : "Unmute sound"}
                    >
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button
                        onClick={handleRematch}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        title="Rematch & Swap Colors"
                    >
                        <RotateCcw size={15} />
                    </button>
                </div>
            </div>

            {/* Love Stakes Banner */}
            <div className="w-full mb-3 p-2.5 rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/40 to-pink-950/40 border border-pink-500/20 flex items-center justify-between gap-2 shadow-inner">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Sparkles size={15} className="text-pink-400 flex-shrink-0 animate-pulse" />
                    <span className="text-xs text-pink-200 font-medium truncate">
                        {chessState?.stakes || "Loser gives a 15-minute massage 💆"}
                    </span>
                </div>
                <button
                    onClick={() => setCustomStakesOpen(true)}
                    className="flex-shrink-0 text-[11px] font-bold text-pink-300 hover:text-white px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 transition-all"
                >
                    Change Stakes
                </button>
            </div>

            {/* Custom Stakes Modal */}
            {customStakesOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0e0a1a] border border-pink-500/30 rounded-3xl p-5 max-w-sm w-full shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                            <Heart size={16} className="text-pink-400" /> Set Love Stakes
                        </h3>
                        <p className="text-xs text-gray-400 mb-3">Choose what the winner gets or write your own romantic bet:</p>
                        <div className="flex flex-col gap-1.5 mb-3 max-h-48 overflow-y-auto">
                            {STAKE_PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSetStakes(preset)}
                                    className="text-left text-xs p-2 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 text-gray-200 hover:text-pink-200 transition-all"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Custom love dare..."
                                value={stakesInput}
                                onChange={(e) => setStakesInput(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500"
                            />
                            <button
                                onClick={() => { if (stakesInput.trim()) handleSetStakes(stakesInput.trim()); }}
                                className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition-all"
                            >
                                Set
                            </button>
                            <button
                                onClick={() => setCustomStakesOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Partner Info & Captured by You */}
            <div className="w-full flex items-center justify-between px-2 py-1 mb-1 text-xs">
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${turn === partnerColor ? 'bg-amber-400 animate-pulse ring-2 ring-amber-400/30' : 'bg-gray-600'}`} />
                    <span className="font-semibold text-gray-300">
                        {partnerName} {partnerColor === 'w' ? '(Rose Gold 🌸)' : '(Midnight 🌙)'}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 text-xs text-pink-300/80">
                    {(isWhite ? capturedPieces.whiteTook : capturedPieces.blackTook).map((p, i) => (
                        <span key={i} className="opacity-90">{PIECE_SYMBOLS[p]}</span>
                    ))}
                </div>
            </div>

            {/* ── 8x8 CHESSBOARD ────────────────────────────────────────── */}
            <div className="relative p-2.5 sm:p-3 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <div className="grid grid-cols-8 grid-rows-8 w-[min(90vw,420px)] h-[min(90vw,420px)] rounded-2xl overflow-hidden border border-white/20 shadow-inner" style={{ touchAction: 'manipulation' }}>
                    {ranks.map((rank) =>
                        files.map((file) => {
                            const square = `${file}${rank}`;
                            const fileIdx = file.charCodeAt(0) - 97;
                            const rankIdx = parseInt(rank, 10) - 1;
                            const isDark = (fileIdx + rankIdx) % 2 === 0;

                            const piece = gameRef.current.get(square);
                            const isSelected = selectedSquare === square;
                            const isValidDest = possibleMoves.some(m => m.to === square);
                            const isLastMoveSq = lastMove && (lastMove.from === square || lastMove.to === square);
                            const isKingCheck = kingInCheckSquare === square;

                            // Color styling for romantic chessboard
                            let squareBg = isDark ? 'bg-[#1e152e]' : 'bg-[#3b2d54]';
                            if (isSelected) {
                                squareBg = 'bg-pink-600/60 ring-2 ring-pink-400 ring-inset';
                            } else if (isKingCheck) {
                                squareBg = 'bg-rose-600/80 animate-pulse ring-2 ring-rose-400 ring-inset';
                            } else if (isLastMoveSq) {
                                squareBg = isDark ? 'bg-[#38264e] border border-amber-400/40' : 'bg-[#4c3866] border border-amber-400/40';
                            }

                            return (
                                <button
                                    key={square}
                                    onClick={() => handleSquareClick(square)}
                                    className={`relative flex items-center justify-center transition-all ${squareBg} ${isMyTurn ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    {/* Piece Character */}
                                    {piece && (
                                        <span
                                            className={`text-2xl sm:text-3xl select-none leading-none drop-shadow-md transition-transform active:scale-95 ${
                                                piece.color === 'w'
                                                    ? 'text-pink-200 drop-shadow-[0_2px_6px_rgba(244,114,182,0.6)] filter brightness-110'
                                                    : 'text-indigo-950 drop-shadow-[0_2px_8px_rgba(168,85,247,0.85)] filter contrast-150'
                                            }`}
                                            style={piece.color === 'b' ? {
                                                textShadow: '-1px -1px 0 #c084fc, 1px -1px 0 #c084fc, -1px 1px 0 #c084fc, 1px 1px 0 #c084fc, 0 0 10px rgba(192,132,252,0.8)'
                                            } : {
                                                textShadow: '0 0 8px rgba(251,207,232,0.9)'
                                            }}
                                        >
                                            {PIECE_SYMBOLS[piece.type]}
                                        </span>
                                    )}

                                    {/* Move destination hint dot */}
                                    {isValidDest && !piece && (
                                        <span className="w-3.5 h-3.5 rounded-full bg-pink-400/70 shadow-[0_0_8px_rgba(244,114,182,0.9)] animate-pulse" />
                                    )}

                                    {/* Capture hint ring */}
                                    {isValidDest && piece && (
                                        <span className="absolute inset-1 rounded-full border-2 border-rose-400 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                                    )}

                                    {/* Coordinate labels on perimeter */}
                                    {file === (isWhite ? 'a' : 'h') && (
                                        <span className="absolute top-0.5 left-0.5 text-[8px] font-bold opacity-30 pointer-events-none text-white">
                                            {rank}
                                        </span>
                                    )}
                                    {rank === (isWhite ? '1' : '8') && (
                                        <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold opacity-30 pointer-events-none text-white">
                                            {file}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* User Info & Captured by Partner */}
            <div className="w-full flex items-center justify-between px-2 py-1 mt-1 text-xs">
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${turn === myColor ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30' : 'bg-gray-600'}`} />
                    <span className="font-semibold text-white">
                        You {myColor === 'w' ? '(Rose Gold 🌸)' : '(Midnight 🌙)'}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 text-xs text-purple-300/80">
                    {(isWhite ? capturedPieces.blackTook : capturedPieces.whiteTook).map((p, i) => (
                        <span key={i} className="opacity-90">{PIECE_SYMBOLS[p]}</span>
                    ))}
                </div>
            </div>

            {/* Game Status Footer Banner */}
            <div className="w-full mt-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                    {isCheckmate ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-bounce">
                            🏆 Checkmate! {turn === myColor ? `${partnerName} wins!` : 'You win!'}
                        </span>
                    ) : isCheck ? (
                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-pulse">
                            <ShieldAlert size={14} /> CHECK! King in danger!
                        </span>
                    ) : isDraw ? (
                        <span className="text-xs font-bold text-amber-300">
                            🤝 Draw / Stalemate! A perfect match.
                        </span>
                    ) : (
                        <span className={`text-xs font-medium ${isMyTurn ? 'text-pink-300 font-bold' : 'text-gray-400'}`}>
                            {isMyTurn ? "Your turn to move! ✨" : `Waiting for ${partnerName}'s move...`}
                        </span>
                    )}
                </div>

                <button
                    onClick={handleResign}
                    disabled={isCheckmate || isDraw}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-rose-400 transition-colors disabled:opacity-30"
                    title="Resign this game"
                >
                    <Flag size={13} /> Surrender
                </button>
            </div>
        </div>
    );
}
