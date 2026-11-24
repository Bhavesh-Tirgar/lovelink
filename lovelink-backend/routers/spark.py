import uuid
import random
from datetime import datetime
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc
from sqlalchemy.orm.attributes import flag_modified

from database import get_db
from models.user import User
from models.couple import Couple
from models.spark import CoupleSpark, SparkDailyAnswer
from crud.couple import get_linked_couple_by_user
from models.notification import Notification
from routers.auth import get_current_user
from ws_manager.manager import manager
from utils.spark_questions import SPARK_QUESTIONS, DATE_NIGHT_IDEAS, get_question_for_day

router = APIRouter()


class AnswerRequest(BaseModel):
    answer: str = Field(..., min_length=1, max_length=2000)

class BatteryRequest(BaseModel):
    battery: int = Field(..., ge=5, le=100)
    status: Optional[str] = Field(None, max_length=100)

class ReactRequest(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=10)

class CommentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

class AcceptDateRequest(BaseModel):
    date_idea: dict

class CapsuleCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    message: str = Field(..., min_length=1, max_length=3000)
    unlock_date: str = Field(..., max_length=30) # e.g. "2026-12-31" or ISO
    hint: Optional[str] = Field("Sealed with love 💌", max_length=150)


async def _get_user_couple(db: AsyncSession, user_id: str) -> Couple:
    couple = await get_linked_couple_by_user(db, user_id)
    if not couple:
        raise HTTPException(status_code=400, detail="You must be linked with a partner first")
    return couple


async def _get_or_create_spark(db: AsyncSession, couple_id: str) -> CoupleSpark:
    res = await db.execute(select(CoupleSpark).where(CoupleSpark.couple_id == couple_id))
    spark = res.scalar_one_or_none()
    if not spark:
        spark = CoupleSpark(
            couple_id=couple_id,
            user1_battery=85,
            user2_battery=85,
            user1_status="Thinking of you 💭",
            user2_status="Thinking of you 💭",
            streak=1,
            time_capsules=[]
        )
        db.add(spark)
        await db.commit()
        await db.refresh(spark)
    return spark


async def _get_or_create_daily_answer(db: AsyncSession, couple_id: str, day_key: str) -> SparkDailyAnswer:
    res = await db.execute(
        select(SparkDailyAnswer).where(
            SparkDailyAnswer.couple_id == couple_id,
            SparkDailyAnswer.day_key == day_key
        )
    )
    daily = res.scalar_one_or_none()
    if not daily:
        q = get_question_for_day(day_key)
        daily = SparkDailyAnswer(
            couple_id=couple_id,
            day_key=day_key,
            question_id=q["id"],
            question_text=q["question"],
            question_category=q["category"],
            reactions={},
            comments=[]
        )
        db.add(daily)
        await db.commit()
        await db.refresh(daily)
    return daily


@router.get("")
async def get_spark_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    spark = await _get_or_create_spark(db, couple.id)

    # Current calendar day key (UTC or local)
    day_key = datetime.utcnow().strftime("%Y-%m-%d")
    daily = await _get_or_create_daily_answer(db, couple.id, day_key)

    is_user1 = str(couple.user1_id) == str(current_user.id)
    partner_id = couple.user2_id if is_user1 else couple.user1_id

    # Fetch partner user details
    p_res = await db.execute(select(User).where(User.id == partner_id))
    partner = p_res.scalar_one_or_none()
    partner_name = partner.name if partner else "Partner"

    my_battery = spark.user1_battery if is_user1 else spark.user2_battery
    partner_battery = spark.user2_battery if is_user1 else spark.user1_battery
    my_status = spark.user1_status if is_user1 else spark.user2_status
    partner_status = spark.user2_status if is_user1 else spark.user1_status

    my_answer = daily.user1_answer if is_user1 else daily.user2_answer
    my_answered_at = daily.user1_answered_at if is_user1 else daily.user2_answered_at
    partner_raw_answer = daily.user2_answer if is_user1 else daily.user1_answer
    partner_answered_at = daily.user2_answered_at if is_user1 else daily.user1_answered_at

    partner_has_answered = bool(partner_raw_answer and partner_raw_answer.strip())
    my_has_answered = bool(my_answer and my_answer.strip())

    # Blind reveal logic: Partner answer is only visible once current user has also answered
    is_revealed = my_has_answered and partner_has_answered
    partner_visible_answer = partner_raw_answer if is_revealed else None

    # Filter time capsules: locked capsules created by partner have message body masked
    visible_capsules = []
    today_iso = datetime.utcnow().strftime("%Y-%m-%d")
    for cap in (spark.time_capsules or []):
        is_mine = cap.get("author_id") == str(current_user.id)
        is_past_unlock = cap.get("unlock_date", "") <= today_iso or cap.get("is_opened", False)
        
        cap_copy = dict(cap)
        if not is_mine and not is_past_unlock:
            cap_copy["message"] = None # Masked
            cap_copy["is_locked"] = True
        else:
            cap_copy["is_locked"] = False
        visible_capsules.append(cap_copy)

    return {
        "couple_id": couple.id,
        "day_key": day_key,
        "streak": spark.streak,
        "question": {
            "id": daily.question_id,
            "text": daily.question_text,
            "category": daily.question_category
        },
        "me": {
            "id": str(current_user.id),
            "name": current_user.name,
            "battery": my_battery,
            "status": my_status,
            "has_answered": my_has_answered,
            "answer": my_answer,
            "answered_at": my_answered_at.isoformat() if my_answered_at else None
        },
        "partner": {
            "id": str(partner_id),
            "name": partner_name,
            "battery": partner_battery,
            "status": partner_status,
            "has_answered": partner_has_answered,
            "answer": partner_visible_answer,
            "answered_at": partner_answered_at.isoformat() if (partner_answered_at and is_revealed) else None
        },
        "is_revealed": is_revealed,
        "reactions": daily.reactions or {},
        "comments": daily.comments or [],
        "active_date_idea": spark.active_date_idea,
        "time_capsules": visible_capsules
    }


@router.post("/answer")
async def submit_answer(
    req: AnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    spark = await _get_or_create_spark(db, couple.id)
    day_key = datetime.utcnow().strftime("%Y-%m-%d")
    daily = await _get_or_create_daily_answer(db, couple.id, day_key)

    is_user1 = str(couple.user1_id) == str(current_user.id)
    now = datetime.utcnow()

    if is_user1:
        daily.user1_answer = req.answer.strip()
        daily.user1_answered_at = now
    else:
        daily.user2_answer = req.answer.strip()
        daily.user2_answered_at = now

    both_answered = bool(
        (daily.user1_answer and daily.user1_answer.strip()) and
        (daily.user2_answer and daily.user2_answer.strip())
    )

    if both_answered:
        # Check streak update
        if spark.last_streak_date != day_key:
            spark.streak += 1
            spark.last_streak_date = day_key
        
        # Broadcast celebration unlock
        await manager.broadcast(couple.id, {
            "type": "spark_unlocked",
            "day_key": day_key,
            "streak": spark.streak
        })
    else:
        # Notify partner that user answered
        partner_id = couple.user2_id if is_user1 else couple.user1_id
        notif = Notification(
            user_id=str(partner_id),
            couple_id=couple.id,
            type="spark_answered",
            title=f"{current_user.name} answered today's Spark! 💌",
            body="Submit your answer to reveal what they said!",
            data={"day_key": day_key}
        )
        db.add(notif)
        await manager.broadcast(couple.id, {
            "type": "spark_partner_answered",
            "by_name": current_user.name,
            "day_key": day_key
        })

    await db.commit()
    return {"status": "ok", "both_answered": both_answered, "streak": spark.streak}


@router.post("/battery")
async def update_battery(
    req: BatteryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    spark = await _get_or_create_spark(db, couple.id)
    is_user1 = str(couple.user1_id) == str(current_user.id)
    now = datetime.utcnow()

    new_battery = max(5, min(100, req.battery))
    new_status = req.status.strip() if req.status else "Thinking of you 💭"

    if is_user1:
        spark.user1_battery = new_battery
        spark.user1_status = new_status
        spark.user1_battery_updated_at = now
    else:
        spark.user2_battery = new_battery
        spark.user2_status = new_status
        spark.user2_battery_updated_at = now

    await db.commit()

    # Broadcast to partner
    await manager.broadcast(couple.id, {
        "type": "spark_battery_updated",
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "battery": new_battery,
        "status": new_status
    })

    return {"status": "ok", "battery": new_battery, "user_status": new_status}


@router.post("/pulse")
async def send_love_pulse(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Tactile Love Pulse (+15% battery surge to partner).
    Triggers haptic ripple, chime, and instant boost!
    """
    couple = await _get_user_couple(db, current_user.id)
    spark = await _get_or_create_spark(db, couple.id)
    is_user1 = str(couple.user1_id) == str(current_user.id)
    partner_id = couple.user2_id if is_user1 else couple.user1_id

    # Boost partner battery
    if is_user1:
        spark.user2_battery = min(100, spark.user2_battery + 15)
        new_partner_battery = spark.user2_battery
    else:
        spark.user1_battery = min(100, spark.user1_battery + 15)
        new_partner_battery = spark.user1_battery

    notif = Notification(
        user_id=str(partner_id),
        couple_id=couple.id,
        type="love_pulse",
        title=f"⚡ Love Pulse from {current_user.name}!",
        body=f"{current_user.name} sent you a warm surge of love! (+15% Love Battery)",
        data={"from_name": current_user.name}
    )
    db.add(notif)
    await db.commit()

    await manager.broadcast(couple.id, {
        "type": "spark_love_pulse",
        "from_user_id": str(current_user.id),
        "from_name": current_user.name,
        "partner_battery": new_partner_battery
    })

    return {"status": "ok", "partner_battery": new_partner_battery}


@router.post("/nudge")
async def nudge_partner(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    is_user1 = str(couple.user1_id) == str(current_user.id)
    partner_id = couple.user2_id if is_user1 else couple.user1_id

    notif = Notification(
        user_id=str(partner_id),
        couple_id=couple.id,
        type="spark_nudge",
        title=f"🔔 {current_user.name} nudged you!",
        body="Come answer today's Spark question to reveal both of your answers!",
        data={"from_name": current_user.name}
    )
    db.add(notif)
    await db.commit()

    await manager.broadcast(couple.id, {
        "type": "spark_nudge",
        "from_name": current_user.name
    })

    return {"status": "ok", "message": "Nudge sent!"}


@router.post("/react")
async def react_to_answer(
    req: ReactRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    day_key = datetime.utcnow().strftime("%Y-%m-%d")
    daily = await _get_or_create_daily_answer(db, couple.id, day_key)

    reactions = dict(daily.reactions or {})
    reactions[str(current_user.id)] = req.emoji
    daily.reactions = reactions
    flag_modified(daily, "reactions")
    await db.commit()

    await manager.broadcast(couple.id, {
        "type": "spark_reaction",
        "user_id": str(current_user.id),
        "emoji": req.emoji,
        "reactions": daily.reactions
    })

    return {"status": "ok", "reactions": daily.reactions}


@router.post("/comment")
async def add_comment(
    req: CommentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    day_key = datetime.utcnow().strftime("%Y-%m-%d")
    daily = await _get_or_create_daily_answer(db, couple.id, day_key)

    new_comment = {
        "id": str(uuid.uuid4()),
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "text": req.text.strip(),
        "created_at": datetime.utcnow().strftime("%H:%M")
    }

    comments = list(daily.comments or [])
    comments.append(new_comment)
    daily.comments = comments
    flag_modified(daily, "comments")
    await db.commit()

    await manager.broadcast(couple.id, {
        "type": "spark_comment",
        "comment": new_comment
    })

    return {"status": "ok", "comment": new_comment}


@router.get("/scratch-date")
async def get_scratch_date(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Pick a fresh surprise date idea from curated deck"""
    pool = DATE_NIGHT_IDEAS
    if category and category.lower() != "all":
        pool = [d for d in DATE_NIGHT_IDEAS if category.lower() in d["category"].lower()]
    if not pool:
        pool = DATE_NIGHT_IDEAS
    
    choice = random.choice(pool)
    return choice


@router.post("/accept-date")
async def accept_date_idea(
    req: AcceptDateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    spark = await _get_or_create_spark(db, couple.id)

    idea = dict(req.date_idea)
    idea["accepted_by"] = current_user.name
    idea["accepted_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    spark.active_date_idea = idea
    flag_modified(spark, "active_date_idea")
    await db.commit()

    await manager.broadcast(couple.id, {
        "type": "spark_date_accepted",
        "date_idea": idea
    })

    return {"status": "ok", "active_date_idea": idea}


@router.post("/complete-date")
async def complete_date_idea(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    spark = await _get_or_create_spark(db, couple.id)

    spark.active_date_idea = None
    flag_modified(spark, "active_date_idea")
    await db.commit()

    await manager.broadcast(couple.id, {
        "type": "spark_date_completed"
    })

    return {"status": "ok"}


@router.get("/archive")
async def get_spark_archive(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    res = await db.execute(
        select(SparkDailyAnswer)
        .where(
            SparkDailyAnswer.couple_id == couple.id,
            SparkDailyAnswer.user1_answer.is_not(None),
            SparkDailyAnswer.user2_answer.is_not(None)
        )
        .order_by(desc(SparkDailyAnswer.created_at))
        .limit(60)
    )
    records = res.scalars().all()
    
    is_user1 = str(couple.user1_id) == str(current_user.id)

    archive_list = []
    for r in records:
        archive_list.append({
            "id": r.id,
            "day_key": r.day_key,
            "question_text": r.question_text,
            "question_category": r.question_category,
            "my_answer": r.user1_answer if is_user1 else r.user2_answer,
            "partner_answer": r.user2_answer if is_user1 else r.user1_answer,
            "reactions": r.reactions or {},
            "created_at": r.created_at.strftime("%B %d, %Y") if r.created_at else r.day_key
        })

    return archive_list


@router.post("/capsule")
async def create_time_capsule(
    req: CapsuleCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    spark = await _get_or_create_spark(db, couple.id)
    is_user1 = str(couple.user1_id) == str(current_user.id)
    partner_id = couple.user2_id if is_user1 else couple.user1_id

    new_capsule = {
        "id": str(uuid.uuid4()),
        "title": req.title.strip(),
        "message": req.message.strip(),
        "hint": req.hint.strip() if req.hint else "Sealed with love 💌",
        "author_id": str(current_user.id),
        "author_name": current_user.name,
        "unlock_date": req.unlock_date.strip(),
        "is_opened": False,
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    }

    capsules = list(spark.time_capsules or [])
    capsules.insert(0, new_capsule)
    spark.time_capsules = capsules
    flag_modified(spark, "time_capsules")

    # Partner notification
    notif = Notification(
        user_id=str(partner_id),
        couple_id=couple.id,
        type="capsule_sealed",
        title=f"💌 {current_user.name} sealed a mystery Love Letter!",
        body=f'"{new_capsule["title"]}" is locked until {new_capsule["unlock_date"]}.',
        data={"capsule_id": new_capsule["id"]}
    )
    db.add(notif)
    await db.commit()

    await manager.broadcast(couple.id, {
        "type": "spark_capsule_sealed",
        "author_name": current_user.name,
        "title": new_capsule["title"]
    })

    return {"status": "ok", "capsule": new_capsule}


@router.post("/capsule/{capsule_id}/open")
async def open_time_capsule(
    capsule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    spark = await _get_or_create_spark(db, couple.id)

    capsules = list(spark.time_capsules or [])
    found = False
    for cap in capsules:
        if cap.get("id") == capsule_id:
            cap["is_opened"] = True
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Capsule not found")

    spark.time_capsules = capsules
    flag_modified(spark, "time_capsules")
    await db.commit()

    await manager.broadcast(couple.id, {
        "type": "spark_capsule_opened",
        "capsule_id": capsule_id
    })

    return {"status": "ok"}
