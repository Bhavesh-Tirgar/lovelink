import uuid
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
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
async def games_websocket(websocket: WebSocket, couple_id: str, token: str = Query(...)):
    """Multiplayer WebSocket for Rock-Paper-Scissors, Tic-Tac-Toe, and Truth/Dare sync."""
    await websocket.accept()
    from routers.auth import decode_token
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    room = f"games_{couple_id}"
    await manager.connect(websocket, room)

    # Initialize couple session if not present
    if couple_id not in game_sessions:
        game_sessions[couple_id] = {
            "rps": {"moves": {}, "scores": {}},
            "ttt": {"board": [""] * 9, "turn": user_id, "scores": {}, "symbol": {user_id: "X"}},
            "tod": {
                "turn": user_id,
                "current_challenge": None,
                "completed_count": 0
            }
        }

    session = game_sessions[couple_id]
    if "tod" not in session:
        session["tod"] = {
            "turn": user_id,
            "current_challenge": None,
            "completed_count": 0
        }
    await manager.send_personal(websocket, {
        "type": "session_init",
        "user_id": user_id,
        "tod": session["tod"]
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
                
                if action == "set_turn":
                    target_turn = data.get("turn", user_id)
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

    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
