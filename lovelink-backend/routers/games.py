import uuid
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db, AsyncSessionLocal
from models.user import User
from models.couple import Couple
from routers.auth import get_current_user
from ws_manager.manager import manager
from pydantic import BaseModel
from typing import Optional, List, Dict
import random
import json

router = APIRouter()

# ── IN-MEMORY GAME SESSIONS PER COUPLE ───────────────────────────────────────────
# {couple_id: {"rps": {user1: move, user2: move, scores: {}}, "ttt": {board: [], turn: user_id, scores: {}}}}
game_sessions: Dict[str, dict] = {}

# ── CURATED COUPLE TRUTH OR DARE PROMPTS ───────────────────────────────────────
TRUTH_PROMPTS = {
    "romantic": [
        "What was the exact moment you realized you had feelings for me?",
        "What is your favorite memory of us together so far?",
        "If you could relive one day in our relationship, which day would it be?",
        "What is one small, everyday thing I do that secretly makes you smile?",
        "What is your favorite feature or habit of mine?",
        "What song always reminds you of me?",
        "What was your honest first impression of me when we first met?",
        "What is one dream you hope we accomplish together in the next 5 years?",
        "What is the most romantic thing I've ever done for you?",
        "What is something you find irresistibly attractive about me?"
    ],
    "deep": [
        "What is one fear you have about the future that you haven't told many people?",
        "When was the last time you cried, and what was it about?",
        "What is one thing you think we can improve or grow closer in?",
        "What is a lesson from your past that shaped how you love today?",
        "What does 'unconditional love' mean to you in practice?",
        "When do you feel most safe and understood around me?",
        "What is one secret dream you have that you rarely share with anyone?",
        "What is a childhood memory that still influences who you are?"
    ],
    "spicy": [
        "What is one secret fantasy you've had about us?",
        "Where is the most daring or adventurous place you'd want to kiss me?",
        "What outfit or look of mine drives you crazy?",
        "What is your favorite kind of kiss (forehead, slow, passionate)?",
        "Describe your dream romantic midnight rendezvous with me.",
        "What is something I do without realizing that turns you on?"
    ],
    "funny": [
        "What is the most embarrassing thing you've done in front of me?",
        "If our relationship was a movie title, what would it be?",
        "What is my weirdest quirk or habit?",
        "If you had to describe my cooking or dance skills in three words, what would they be?",
        "What was an awkward moment on one of our first few dates?"
    ]
}

DARE_PROMPTS = {
    "romantic": [
        "Look into my eyes for 60 seconds without speaking or laughing.",
        "Send me a 20-second voice note saying 5 things you love about me.",
        "Text me a love letter using only emojis, and I have to decode it.",
        "Give me a gentle shoulder or back massage for 2 minutes (or promise one on our next meetup!).",
        "Whisper your favorite secret pet name for me.",
        "Dedicate and sing (or lip sync) the chorus of our favorite love song to me right now."
    ],
    "spicy": [
        "Give me your best slow, passionate kiss (or blow a slow, dramatic kiss on camera).",
        "Send me a selfie making your most seductive face.",
        "Whisper a naughty secret fantasy in my ear (or over voice call).",
        "Let me style your hair or pick your outfit for our next date."
    ],
    "funny": [
        "Do your best dramatic impression of me when I get hungry or dramatic.",
        "Try not to laugh for 1 minute while I make silly faces at you.",
        "Talk in an exaggerated British or French accent for the next 3 rounds.",
        "Show me the most unflattering photo currently in your camera roll.",
        "Do a 15-second silly dance on the spot right now."
    ]
}

# ── WOULD YOU RATHER SCENARIOS ────────────────────────────────────────────────
WOULD_YOU_RATHER = [
    {
        "id": 1,
        "optionA": "Wake up to breakfast in bed made by me every Sunday",
        "optionB": "Get a 20-minute relaxing massage from me every night"
    },
    {
        "id": 2,
        "optionA": "Spend a week in a cozy snowy cabin with no phones",
        "optionB": "Spend a week at a sunny beach resort with luxury dining"
    },
    {
        "id": 3,
        "optionA": "Always know what the other is thinking (mind reading)",
        "optionB": "Always feel what the other is feeling (empathy link)"
    },
    {
        "id": 4,
        "optionA": "Have a spontaneous road trip with zero planning",
        "optionB": "Have a perfectly planned 5-star dream vacation"
    },
    {
        "id": 5,
        "optionA": "Win an argument every single time",
        "optionB": "Get unlimited sweet apologetic hugs & treats every time"
    },
    {
        "id": 6,
        "optionA": "Relive our very first date over again",
        "optionB": "Fast forward to our 10th anniversary celebration"
    },
    {
        "id": 7,
        "optionA": "Cook an elaborate gourmet meal together from scratch",
        "optionB": "Order our favorite comfort junk food and binge-watch movies"
    },
    {
        "id": 8,
        "optionA": "Dance together under the rain in the street",
        "optionB": "Stargaze wrapped in blankets on the roof until sunrise"
    }
]

# ── REST ENDPOINTS ─────────────────────────────────────────────────────────────

@router.get("/truth-or-dare")
async def get_truth_or_dare(
    type: str = Query("truth", pattern="^(truth|dare)$"),
    category: str = Query("romantic", pattern="^(romantic|deep|spicy|funny)$"),
    current_user: User = Depends(get_current_user)
):
    """Returns a random Truth or Dare prompt based on category."""
    prompts_dict = TRUTH_PROMPTS if type == "truth" else DARE_PROMPTS
    category_list = prompts_dict.get(category, prompts_dict["romantic"])
    prompt = random.choice(category_list)
    return {
        "type": type,
        "category": category,
        "prompt": prompt
    }

@router.get("/would-you-rather")
async def get_would_you_rather(current_user: User = Depends(get_current_user)):
    """Returns a random romantic Would You Rather scenario."""
    return random.choice(WOULD_YOU_RATHER)

# ── WEBSOCKET FOR REAL-TIME 2-PLAYER GAMES ─────────────────────────────────────

@router.websocket("/ws/{couple_id}")
async def games_websocket(
    websocket: WebSocket,
    couple_id: str,
    ticket: Optional[str] = Query(None),
    token: Optional[str] = Query(None)
):
    """Multiplayer WebSocket for Rock-Paper-Scissors, Tic-Tac-Toe, and Truth/Dare sync."""
    await websocket.accept()
    user_id = None
    if ticket:
        from utils.tickets import verify_and_consume_ws_ticket
        user_id = verify_and_consume_ws_ticket(ticket)
    elif token:
        from routers.auth import decode_token
        user_id = decode_token(token)

    if not user_id:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    room = f"games_{couple_id}"
    await manager.connect(websocket, room)

    # Resolve partner user ID for turn switching
    other_user_id = None
    try:
        async with AsyncSessionLocal() as db:
            c_res = await db.execute(select(Couple).where(Couple.id == couple_id))
            couple = c_res.scalars().first()
            if couple:
                other_user_id = str(couple.user2_id) if str(couple.user1_id) == user_id else str(couple.user1_id)
    except Exception as e:
        print(f"Error fetching couple for game session: {e}")

    # Initialize couple session if not present
    if couple_id not in game_sessions:
        game_sessions[couple_id] = {
            "rps": {"moves": {}, "scores": {}},
            "ttt": {"board": [""] * 9, "turn": user_id, "scores": {}, "symbol": {user_id: "X"}},
            "tod": {
                "turn": user_id,
                "current_challenge": None,
                "completed_count": 0
            },
            "chess": {
                "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                "white": user_id,
                "black": other_user_id or "partner",
                "turn": "w",
                "stakes": "Loser gives a 15-minute massage 💆",
                "scores": {user_id: 0, (other_user_id or "partner"): 0}
            },
            "ludo": {
                "player_pink": user_id,
                "player_blue": other_user_id or "partner",
                "turn": "pink",
                "dice": None,
                "tokens": {"pink": [-1, -1, -1, -1], "blue": [-1, -1, -1, -1]},
                "scores": {user_id: 0, (other_user_id or "partner"): 0},
                "winner": None
            },
            "uno": {
                "player_1": user_id,
                "player_2": other_user_id or "partner",
                "turn": user_id,
                "scores": {user_id: 0, (other_user_id or "partner"): 0},
                "winner": None
            }
        }

    session = game_sessions[couple_id]
    if "tod" not in session:
        session["tod"] = {
            "turn": user_id,
            "current_challenge": None,
            "completed_count": 0
        }
    if "chess" not in session:
        session["chess"] = {
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "white": user_id,
            "black": other_user_id or "partner",
            "turn": "w",
            "stakes": "Loser gives a 15-minute massage 💆",
            "scores": {user_id: 0, (other_user_id or "partner"): 0}
        }
    if "ludo" not in session:
        session["ludo"] = {
            "player_pink": user_id,
            "player_blue": other_user_id or "partner",
            "turn": "pink",
            "dice": None,
            "tokens": {"pink": [-1, -1], "blue": [-1, -1]},
            "scores": {user_id: 0, (other_user_id or "partner"): 0},
            "winner": None
        }
    if "uno" not in session:
        session["uno"] = {
            "player_1": user_id,
            "player_2": other_user_id or "partner",
            "turn": user_id,
            "scores": {user_id: 0, (other_user_id or "partner"): 0},
            "winner": None
        }
    await manager.send_personal(websocket, {
        "type": "session_init",
        "user_id": user_id,
        "tod": session["tod"],
        "chess": session["chess"],
        "ludo": session["ludo"],
        "uno": session["uno"]
    })

    try:
        while True:
            data = await websocket.receive_json()
            game = data.get("game")
            action = data.get("action")

            # ── 1. ROCK PAPER SCISSORS ───────────────────────────────────────
            if game == "rps":
                if action == "move":
                    move = data.get("move") # rock, paper, scissors
                    session["rps"]["moves"][user_id] = move

                    # Check if partner has also made their move
                    moves = session["rps"]["moves"]
                    if len(moves) == 2:
                        u1, u2 = list(moves.keys())
                        m1, m2 = moves[u1], moves[u2]

                        # Calculate winner
                        winner = None
                        if m1 == m2:
                            winner = "draw"
                        elif (m1 == "rock" and m2 == "scissors") or \
                             (m1 == "paper" and m2 == "rock") or \
                             (m1 == "scissors" and m2 == "paper"):
                            winner = u1
                        else:
                            winner = u2

                        # Update score
                        if winner and winner != "draw":
                            session["rps"]["scores"][winner] = session["rps"]["scores"].get(winner, 0) + 1

                        # Broadcast reveal to both
                        await manager.broadcast(room, {
                            "type": "rps_reveal",
                            "moves": moves,
                            "winner": winner,
                            "scores": session["rps"]["scores"]
                        })
                        session["rps"]["moves"] = {}
                    else:
                        # Notify partner that a move was locked in without revealing it
                        await manager.broadcast(room, {
                            "type": "rps_locked",
                            "by_user": user_id
                        }, exclude=websocket)

                elif action == "reset":
                    session["rps"]["moves"] = {}
                    await manager.broadcast(room, {"type": "rps_reset"})

            # ── 2. TIC TAC TOE ───────────────────────────────────────────────
            elif game == "ttt":
                if action == "move":
                    index = data.get("index")
                    symbol = data.get("symbol", "❤️") # Heart or Kiss
                    if 0 <= index < 9 and not session["ttt"]["board"][index]:
                        session["ttt"]["board"][index] = symbol
                        # Broadcast move (exclude sender because sender has already updated their board)
                        await manager.broadcast(room, {
                            "type": "ttt_update",
                            "index": index,
                            "symbol": symbol,
                            "board": session["ttt"]["board"],
                            "by_user": user_id
                        }, exclude=websocket)

                elif action == "reset":
                    session["ttt"]["board"] = [""] * 9
                    await manager.broadcast(room, {"type": "ttt_reset", "by_user": user_id})

            # ── 3. TRUTH OR DARE (INTERACTIVE & REALISTIC) ─────────────────────
            elif game == "truth_or_dare":
                tod_session = session.setdefault("tod", {"turn": user_id, "current_challenge": None, "completed_count": 0})
                
                if action in ("set_turn", "claim_turn", "pass_turn"):
                    if action == "claim_turn":
                        target_turn = user_id
                    elif action == "pass_turn":
                        target_turn = other_user_id or "other"
                    else:
                        target_turn = data.get("turn", user_id)
                        if target_turn in ("partner", "other") and other_user_id:
                            target_turn = other_user_id
                        elif target_turn in ("me", "self"):
                            target_turn = user_id

                    tod_session["turn"] = target_turn
                    await manager.broadcast(room, {
                        "type": "tod_turn_changed",
                        "turn": target_turn,
                        "by_user": user_id
                    })

                elif action == "send_challenge":
                    challenge_type = data.get("challenge_type", "truth")
                    prompt = data.get("prompt", "").strip()
                    category = data.get("category", "romantic")
                    is_custom = bool(data.get("is_custom", False))
                    
                    challenge_obj = {
                        "id": str(uuid.uuid4())[:8],
                        "type": challenge_type,
                        "prompt": prompt,
                        "category": category,
                        "is_custom": is_custom,
                        "from_user": user_id,
                        "answer": None,
                        "status": "pending"
                    }
                    tod_session["current_challenge"] = challenge_obj
                    await manager.broadcast(room, {
                        "type": "tod_challenge_received",
                        "challenge": challenge_obj,
                        "from_user": user_id
                    })

                elif action == "submit_answer":
                    answer = data.get("answer", "").strip()
                    if tod_session.get("current_challenge"):
                        tod_session["current_challenge"]["answer"] = answer
                        tod_session["current_challenge"]["status"] = "answered"
                    tod_session["completed_count"] = tod_session.get("completed_count", 0) + 1
                    
                    await manager.broadcast(room, {
                        "type": "tod_answer_revealed",
                        "answer": answer,
                        "by_user": user_id,
                        "challenge": tod_session.get("current_challenge"),
                        "completed_count": tod_session["completed_count"]
                    })

                elif action == "complete_dare":
                    note = data.get("note", "").strip()
                    if tod_session.get("current_challenge"):
                        tod_session["current_challenge"]["status"] = "completed"
                        tod_session["current_challenge"]["answer"] = note
                    tod_session["completed_count"] = tod_session.get("completed_count", 0) + 1
                    
                    await manager.broadcast(room, {
                        "type": "tod_dare_completed",
                        "note": note,
                        "by_user": user_id,
                        "challenge": tod_session.get("current_challenge"),
                        "completed_count": tod_session["completed_count"]
                    })

                elif action == "next_round":
                    tod_session["current_challenge"] = None
                    curr_turn = tod_session.get("turn")
                    if other_user_id:
                        new_turn = other_user_id if curr_turn == user_id else user_id
                    else:
                        new_turn = data.get("next_turn") or user_id
                    tod_session["turn"] = new_turn
                    await manager.broadcast(room, {
                        "type": "tod_round_reset",
                        "turn": new_turn,
                        "by_user": user_id
                    })

                elif action == "sync":
                    await manager.broadcast(room, {
                        "type": "truth_or_dare_sync",
                        "payload": data.get("payload"),
                        "by_user": user_id
                    }, exclude=websocket)

            # ── 4. WOULD YOU RATHER ─────────────────────
            elif game == "would_you_rather":
                if action in ("choice", "sync_choice"):
                    choice_val = data.get("choice") or (data.get("payload", {}).get("choice") if isinstance(data.get("payload"), dict) else None)
                    await manager.broadcast(room, {
                        "type": "would_you_rather_choice",
                        "choice": choice_val,
                        "by_user": user_id
                    }, exclude=websocket)
                else:
                    await manager.broadcast(room, {
                        "type": "would_you_rather_card",
                        "payload": data.get("payload"),
                        "by_user": user_id
                    }, exclude=websocket)

            # ── 5. COUPLE CHESS (ROYAL SHOWDOWN) ────────
            elif game == "chess":
                if "chess" not in session:
                    session["chess"] = {
                        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                        "white": user_id,
                        "black": other_user_id or "partner",
                        "turn": "w",
                        "stakes": "Loser gives a 15-minute massage 💆",
                        "scores": {user_id: 0, (other_user_id or "partner"): 0}
                    }
                chess_s = session["chess"]

                if action == "move":
                    fen = data.get("fen")
                    from_sq = data.get("from")
                    to_sq = data.get("to")
                    san = data.get("san")
                    promotion = data.get("promotion", "q")
                    is_check = data.get("is_check", False)
                    is_checkmate = data.get("is_checkmate", False)
                    is_draw = data.get("is_draw", False)

                    chess_s["fen"] = fen
                    chess_s["turn"] = "b" if chess_s.get("turn") == "w" else "w"

                    if is_checkmate:
                        chess_s["scores"][user_id] = chess_s["scores"].get(user_id, 0) + 1

                    await manager.broadcast(room, {
                        "type": "chess_move",
                        "from": from_sq,
                        "to": to_sq,
                        "san": san,
                        "promotion": promotion,
                        "fen": fen,
                        "is_check": is_check,
                        "is_checkmate": is_checkmate,
                        "is_draw": is_draw,
                        "by_user": user_id,
                        "turn": chess_s["turn"],
                        "scores": chess_s["scores"]
                    })

                elif action == "reset":
                    # Swap White/Black colors on rematch for fairness
                    old_white = chess_s.get("white")
                    old_black = chess_s.get("black")
                    chess_s["white"] = old_black
                    chess_s["black"] = old_white
                    chess_s["fen"] = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    chess_s["turn"] = "w"
                    if data.get("stakes"):
                        chess_s["stakes"] = data.get("stakes")

                    await manager.broadcast(room, {
                        "type": "chess_reset",
                        "fen": chess_s["fen"],
                        "white": chess_s["white"],
                        "black": chess_s["black"],
                        "turn": chess_s["turn"],
                        "stakes": chess_s.get("stakes"),
                        "scores": chess_s.get("scores", {}),
                        "by_user": user_id
                    })

                elif action == "set_stakes":
                    new_stakes = data.get("stakes")
                    if new_stakes:
                        chess_s["stakes"] = new_stakes
                    await manager.broadcast(room, {
                        "type": "chess_stakes_updated",
                        "stakes": chess_s.get("stakes"),
                        "by_user": user_id
                    })

                elif action == "resign":
                    winner_id = other_user_id if str(user_id) != str(other_user_id) else (chess_s.get("white") if user_id == chess_s.get("black") else chess_s.get("black"))
                    if winner_id:
                        chess_s["scores"][winner_id] = chess_s["scores"].get(winner_id, 0) + 1
                    await manager.broadcast(room, {
                        "type": "chess_resigned",
                        "resigned_by": user_id,
                        "winner_id": winner_id,
                        "scores": chess_s.get("scores", {})
                    })

            # ── 6. LUDO 1V1 (COUPLE SHOWDOWN) ───────────
            elif game == "ludo":
                if "ludo" not in session:
                    session["ludo"] = {
                        "player_pink": user_id,
                        "player_blue": other_user_id or "partner",
                        "turn": "pink",
                        "dice": None,
                        "tokens": {"pink": [-1, -1, -1, -1], "blue": [-1, -1, -1, -1]},
                        "scores": {user_id: 0, (other_user_id or "partner"): 0},
                        "winner": None
                    }
                ludo_s = session["ludo"]

                if action == "roll_dice":
                    dice = data.get("dice") or random.randint(1, 6)
                    ludo_s["dice"] = dice
                    await manager.broadcast(room, {
                        "type": "ludo_dice_rolled",
                        "dice": dice,
                        "turn": ludo_s["turn"],
                        "by_user": user_id
                    })

                elif action == "move_token":
                    color = data.get("color")
                    token_idx = data.get("token_idx")
                    new_pos = data.get("new_pos")
                    next_turn = data.get("next_turn")
                    opponent_cut_idx = data.get("opponent_cut_idx")
                    winner = data.get("winner")

                    if color in ludo_s["tokens"] and 0 <= token_idx < len(ludo_s["tokens"][color]):
                        ludo_s["tokens"][color][token_idx] = new_pos

                    if opponent_cut_idx is not None:
                        opp_color = "blue" if color == "pink" else "pink"
                        if 0 <= opponent_cut_idx < len(ludo_s["tokens"][opp_color]):
                            ludo_s["tokens"][opp_color][opponent_cut_idx] = -1

                    if next_turn:
                        ludo_s["turn"] = next_turn

                    if winner:
                        ludo_s["winner"] = winner
                        ludo_s["scores"][user_id] = ludo_s["scores"].get(user_id, 0) + 1

                    await manager.broadcast(room, {
                        "type": "ludo_token_moved",
                        "color": color,
                        "token_idx": token_idx,
                        "new_pos": new_pos,
                        "opponent_cut_idx": opponent_cut_idx,
                        "tokens": ludo_s["tokens"],
                        "turn": ludo_s["turn"],
                        "winner": ludo_s["winner"],
                        "scores": ludo_s["scores"],
                        "by_user": user_id
                    })

                elif action == "pass_turn":
                    next_turn = "blue" if ludo_s["turn"] == "pink" else "pink"
                    ludo_s["turn"] = next_turn
                    await manager.broadcast(room, {
                        "type": "ludo_turn_passed",
                        "turn": next_turn,
                        "by_user": user_id
                    })

                elif action == "reset":
                    # Swap colors on rematch
                    old_pink = ludo_s.get("player_pink")
                    old_blue = ludo_s.get("player_blue")
                    ludo_s["player_pink"] = old_blue
                    ludo_s["player_blue"] = old_pink
                    ludo_s["turn"] = "pink"
                    ludo_s["dice"] = None
                    ludo_s["tokens"] = {"pink": [-1, -1, -1, -1], "blue": [-1, -1, -1, -1]}
                    ludo_s["winner"] = None

                    await manager.broadcast(room, {
                        "type": "ludo_reset",
                        "player_pink": ludo_s["player_pink"],
                        "player_blue": ludo_s["player_blue"],
                        "tokens": ludo_s["tokens"],
                        "turn": ludo_s["turn"],
                        "scores": ludo_s["scores"],
                        "by_user": user_id
                    })

            # ── 7. UNO / CRAZY EIGHTS (COUPLE CARD SHOWDOWN) ──
            elif game == "uno":
                if "uno" not in session:
                    session["uno"] = {
                        "player_1": user_id,
                        "player_2": other_user_id or "partner",
                        "turn": user_id,
                        "scores": {user_id: 0, (other_user_id or "partner"): 0},
                        "winner": None
                    }
                uno_s = session["uno"]

                if action == "sync_init":
                    uno_s["deck"] = data.get("deck")
                    uno_s["discard"] = data.get("discard")
                    uno_s["top_card"] = data.get("top_card")
                    uno_s["active_color"] = data.get("active_color")
                    uno_s["turn"] = data.get("turn") or user_id
                    uno_s["winner"] = None

                    await manager.broadcast(room, {
                        "type": "uno_synced_init",
                        "deck": uno_s["deck"],
                        "discard": uno_s["discard"],
                        "top_card": uno_s["top_card"],
                        "active_color": uno_s["active_color"],
                        "turn": uno_s["turn"],
                        "p1_hand": data.get("p1_hand"),
                        "p2_hand": data.get("p2_hand"),
                        "by_user": user_id
                    }, exclude=websocket)

                elif action == "play_card":
                    card = data.get("card")
                    active_color = data.get("active_color")
                    next_turn = data.get("next_turn")
                    draw_penalty = data.get("draw_penalty", 0)
                    is_uno = data.get("is_uno", False)
                    winner = data.get("winner")

                    if winner:
                        uno_s["winner"] = winner
                        uno_s["scores"][user_id] = uno_s["scores"].get(user_id, 0) + 1

                    await manager.broadcast(room, {
                        "type": "uno_card_played",
                        "card": card,
                        "active_color": active_color,
                        "next_turn": next_turn,
                        "draw_penalty": draw_penalty,
                        "is_uno": is_uno,
                        "winner": winner,
                        "scores": uno_s["scores"],
                        "by_user": user_id
                    })

                elif action == "draw_card":
                    card = data.get("card")
                    next_turn = data.get("next_turn")
                    await manager.broadcast(room, {
                        "type": "uno_card_drawn",
                        "card": card,
                        "next_turn": next_turn,
                        "by_user": user_id
                    })

                elif action == "reset":
                    uno_s["winner"] = None
                    await manager.broadcast(room, {
                        "type": "uno_reset",
                        "scores": uno_s["scores"],
                        "by_user": user_id
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
