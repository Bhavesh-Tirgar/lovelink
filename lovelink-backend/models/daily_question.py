import uuid
from sqlalchemy import Column, String
from database import Base

class DailyQuestion(Base):
    __tablename__ = "daily_questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_text = Column(String, nullable=False)
    category = Column(String, nullable=True)
