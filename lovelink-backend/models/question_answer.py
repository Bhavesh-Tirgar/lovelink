import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from database import Base


class QuestionAnswer(Base):
    __tablename__ = "question_answers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(36), ForeignKey("daily_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    answer_text = Column(String, nullable=False)
    date = Column(Date, server_default=func.current_date(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("couple_id", "user_id", "date", name="uix_couple_user_date"),
    )
