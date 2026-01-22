from sqlalchemy import Column, Integer, String
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Foreign Key to User logic handled manually or via ForeignKey
    job_description = Column(String)
    resume_text = Column(String)
    status = Column(String, default="PENDING")
    duration_seconds = Column(Integer, default=0)
    created_at = Column(String) # Storing as ISO string for simplicity in MVP
    feedback_result = Column(String) # JSON string storing full feedback metrics
    
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, index=True)
    role = Column(String) # user or ai
    content = Column(String)

class ResumeOptimization(Base):
    __tablename__ = "resume_optimizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    job_description = Column(String)
    ats_score = Column(Integer)
    missing_keywords = Column(String) # JSON string
    suggestions = Column(String)
    created_at = Column(String) # ISO format
