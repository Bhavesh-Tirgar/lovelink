from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models.user import User
from models.couple import Couple
from models.daily_question import DailyQuestion
from models.question_answer import QuestionAnswer
from utils.firebase import send_push # Added import
from routers.auth import get_current_user
from ws_manager.manager import manager

router = APIRouter()

class AnswerCreate(BaseModel):
    answer_text: str

class DailyQuestionResponse(BaseModel):
    question_id: str
    question_text: str
    my_answer: Optional[str] = None
    partner_answer: Optional[str] = None


async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple


@router.get("/today", response_model=DailyQuestionResponse)
async def get_daily_question(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    
    # Get all questions to find today's based on day of year
    result = await db.execute(select(DailyQuestion).order_by(DailyQuestion.question_text))
    questions = result.scalars().all()
    
    if not questions:
        raise HTTPException(status_code=500, detail="No questions seeded")
        
    day_of_year = datetime.now().timetuple().tm_yday
    question_index = day_of_year % len(questions)
    today_question = questions[question_index]
    
    # Find answers for today
    today_date = datetime.now().date()
    
    answers_result = await db.execute(
        select(QuestionAnswer)
        .where(
            QuestionAnswer.couple_id == str(couple.id),
            QuestionAnswer.question_id == today_question.id,
            QuestionAnswer.date == today_date
        )
    )
    answers = answers_result.scalars().all()
    
    my_answer = None
    partner_answer = None
    partner_id = str(couple.user2_id if str(couple.user1_id) == str(current_user.id) else couple.user1_id)
    
    for ans in answers:
        if ans.user_id == str(current_user.id):
            my_answer = ans.answer_text
        elif ans.user_id == partner_id:
            partner_answer = ans.answer_text
            
    # Hide partner answer if we haven't answered yet
    if my_answer is None:
        partner_answer = None
        
    return {
        "question_id": today_question.id,
        "question_text": today_question.question_text,
        "my_answer": my_answer,
        "partner_answer": partner_answer
    }


@router.post("/answer")
async def answer_daily_question(
    payload: AnswerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    now = datetime.now()
    today_date = now.date()
    
    # Verify the question exists and get it
    result = await db.execute(select(DailyQuestion).order_by(DailyQuestion.question_text))
    questions = result.scalars().all()
    day_of_year = now.timetuple().tm_yday
    today_question = questions[day_of_year % len(questions)]
    
    # Check if already answered
    existing_result = await db.execute(
        select(QuestionAnswer)
        .where(
            QuestionAnswer.couple_id == str(couple.id),
            QuestionAnswer.user_id == str(current_user.id),
            QuestionAnswer.date == today_date
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already answered today")
        
    # Check if partner already answered BEFORE we save our answer
    partner_id = str(couple.user2_id if str(couple.user1_id) == str(current_user.id) else couple.user1_id)
    partner_ans_result = await db.execute(
        select(QuestionAnswer)
        .where(
            QuestionAnswer.couple_id == str(couple.id),
            QuestionAnswer.user_id == partner_id,
            QuestionAnswer.question_id == today_question.id,
            QuestionAnswer.date == today_date
        )
    )
    partner_answer = partner_ans_result.scalar_one_or_none()
        
    # Save our answer
    answer = QuestionAnswer(
        couple_id=str(couple.id),
        user_id=str(current_user.id),
        question_id=today_question.id,
        answer_text=payload.answer_text,
        date=today_date
    )
    db.add(answer)
    
    # If partner answered, broadcast it to both of us and send push
    if partner_answer:
        await manager.broadcast(str(couple.id), {
            "type": "question_answered",
            "question_id": str(today_question.id), # Use today_question.id
            "both_answered": True
        })
        
        # Send Push Notification to partner because BOTH answered
        partner_user_result = await db.execute(select(User).where(User.id == partner_id))
        partner = partner_user_result.scalar_one_or_none()
        
        if partner and partner.fcm_token:
             await send_push(
                fcm_token=partner.fcm_token,
                title="Daily Question Unlocked! 🔓",
                body=f"Both of you have answered! Open the app to see what {current_user.name} said.",
                data={"type": "question"}
            )
            
    else:
        # Just broadcast that I answered and send push to partner
        await manager.broadcast(str(couple.id), {
            "type": "question_answered",
            "question_id": str(today_question.id), # Use today_question.id
            "both_answered": False,
            "answered_by": str(current_user.id)
        })
        
        # Determine notification setup for just one person answering
        partner_user_result = await db.execute(select(User).where(User.id == partner_id))
        partner = partner_user_result.scalar_one_or_none()
        
        if partner and partner.fcm_token:
             await send_push(
                fcm_token=partner.fcm_token,
                title="Daily Question 💭",
                body=f"{current_user.name} answered today's question! Answer yours to unlock it.",
                data={"type": "question"}
            )
            
    await db.commit()
        
    return {
        "answer_text": payload.answer_text,
        "partner_answer": partner_answer.answer_text if partner_answer else None
    }
