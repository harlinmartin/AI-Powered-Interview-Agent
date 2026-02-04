from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = "Candidate"

class UserCreate(UserBase):
    password: str

    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        import re
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

    # Support for Pydantic V1 & V2 compatible validation
    try:
        from pydantic import field_validator
        @field_validator('password')
        @classmethod
        def validate_password(cls, v: str) -> str:
            return cls.validate_password_strength(v)
    except ImportError:
        from pydantic import validator
        @validator('password')
        def validate_password(cls, v):
            return cls.validate_password_strength(v)

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
