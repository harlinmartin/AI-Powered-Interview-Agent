from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from .. import models, schemas
from ..database import get_db

import os
from google.oauth2 import id_token
from google.auth.transport import requests

router = APIRouter(tags=["Authentication"])

SECRET_KEY = os.getenv("SECRET_KEY", "SECRET_KEY_GOES_HERE_CHANGE_IN_PROD")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 Hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    new_user = models.User(email=user.email, full_name=user.full_name, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

class GoogleLoginData(BaseModel):
    token: str

@router.post("/google-login", response_model=schemas.Token)
def google_login(data: GoogleLoginData, db: Session = Depends(get_db)):
    try:
        # Verify the token with Google
        CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        # Add clock skew tolerance (e.g. 5 minutes) to handle Docker/Host time drift
        id_info = id_token.verify_oauth2_token(
            data.token, 
            requests.Request(), 
            CLIENT_ID,
            clock_skew_in_seconds=300
        )

        email = id_info['email']
        name = id_info.get('name', '')
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            # Create new user
            hashed_password = get_password_hash("google_auth_dummy_password")
            new_user = models.User(email=email, full_name=name, hashed_password=hashed_password)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user
        else:
            # Update name if changed
            if name and user.full_name != name:
                user.full_name = name
                db.commit()
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
        
    except ValueError as e:
        print(f"GOOGLE LOGIN ERROR: {e}")  # Print specific error to logs
        raise HTTPException(status_code=401, detail=f"Invalid Google Token: {str(e)}")

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from pydantic import EmailStr

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        # Don't reveal valid emails
        return {"message": "If the email exists, a reset link has been sent."}
    
    # Generate Reset Token (15 mins)
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {"sub": user.email, "type": "reset", "exp": expire}
    reset_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    # Send Email via SendGrid
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
    if not sendgrid_api_key:
        print("⚠️ SENDGRID_API_KEY not set - email not sent")
        return {"message": "Email service not configured. Please contact support."}
    
    try:
        message = Mail(
            from_email=os.getenv("MAIL_FROM", "noreply@elevateai.com"),
            to_emails=data.email,
            subject="Password Reset Request",
            html_content=f"""
            <h3>Password Reset</h3>
            <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
            <a href="{reset_link}">Reset Password</a>
            <br><br>
            <p>If you did not request this, please ignore this email.</p>
            """
        )
        
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        print(f"✅ Email sent via SendGrid: {response.status_code}")
        
        return {"message": "Reset link sent"}
    except Exception as e:
        print(f"❌ SendGrid error: {e}")
        return {"message": "Failed to send email. Please try again later."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")
        
        if email is None or token_type != "reset":
            raise HTTPException(status_code=400, detail="Invalid token")
            
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Update Password
        user.hashed_password = get_password_hash(data.new_password)
        db.commit()
        
        return {"message": "Password updated successfully"}
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
