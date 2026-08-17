import sys
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Allow absolute and relative imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models.user import User
from schemas.user import UserCreate, UserLogin, UserOut, AuthResponse, EmailCheckResponse, clean_and_validate_indian_phone
from utils.auth import hash_password, verify_password, create_access_token

router = APIRouter()

def to_user_out(user: User) -> UserOut:
    if hasattr(UserOut, "model_validate"):
        return UserOut.model_validate(user)
    return UserOut.from_orm(user)

@router.get("/check-email", response_model=EmailCheckResponse)
def check_email_availability(email: str, db: Session = Depends(get_db)):
    clean_email = email.strip().lower() if email else ""
    if not clean_email or "@" not in clean_email or "." not in clean_email:
        return EmailCheckResponse(
            available=False,
            message="Please enter a valid email format.",
            email=clean_email
        )

    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        return EmailCheckResponse(
            available=False,
            message="This email is already registered. Please sign in instead.",
            email=clean_email
        )

    return EmailCheckResponse(
        available=True,
        message="Email is available for registration.",
        email=clean_email
    )

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    clean_email = user_in.email.strip().lower()
    
    # Check if user already exists in tbl_user
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash password and create new user
    hashed_pwd = hash_password(user_in.password)
    user_name = user_in.name.strip() if user_in.name else "Smart Plug User"

    user_phone = user_in.phone.strip() if user_in.phone else None

    new_user = User(
        name=user_name,
        email=clean_email,
        phone=user_phone,
        password=hashed_pwd,
        role="user"
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during user registration: {str(e)}"
        )

    token = create_access_token(data={"sub": str(getattr(new_user, "email")), "user_id": getattr(new_user, "id")})

    return AuthResponse(
        success=True,
        message="Account created successfully!",
        token=token,
        user=to_user_out(new_user)
    )

@router.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    clean_email = credentials.email.strip().lower()

    # Query tbl_user table
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(credentials.password, str(getattr(user, "password"))):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(data={"sub": str(getattr(user, "email")), "user_id": getattr(user, "id")})

    return AuthResponse(
        success=True,
        message="Login successful!",
        token=token,
        user=to_user_out(user)
    )

@router.get("/me")
def get_current_user_stub():
    return {"message": "PowerSense AI Authentication Service Active"}
