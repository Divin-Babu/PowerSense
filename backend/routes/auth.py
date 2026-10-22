import sys
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Allow absolute and relative imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models.user import User
from schemas.user import (
    UserCreate,
    UserLogin,
    UserOut,
    AuthResponse,
    EmailCheckResponse,
    UserProfileUpdate,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    VerifyResetTokenRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    clean_and_validate_indian_phone
)
from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token
)
from services.email_service import send_password_reset_email
from services.telemetry_storage import TelemetryStorageManager

router = APIRouter()

def to_user_out(user: User) -> UserOut:
    raw_name = getattr(user, "full_name", None) or getattr(user, "name", None) or "User"
    return UserOut(
        id=getattr(user, "user_id", None) or getattr(user, "id", None),
        user_id=getattr(user, "user_id", None) or getattr(user, "id", None),
        full_name=raw_name,
        name=raw_name,
        email=getattr(user, "email", ""),
        phone=getattr(user, "phone", None),
        role=getattr(user, "role", "user") or "user",
        created_at=getattr(user, "created_at", None)
    )

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
    user_name = (user_in.full_name or user_in.name or "User").strip()

    user_phone = user_in.phone.strip() if user_in.phone else None

    new_user = User(
        full_name=user_name,
        email=clean_email,
        phone=user_phone,
        password_hash=hashed_pwd,
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

    token = create_access_token(data={"sub": str(getattr(new_user, "email")), "user_id": getattr(new_user, "user_id", getattr(new_user, "id", None))})

    return AuthResponse(
        success=True,
        message="Account created successfully!",
        token=token,
        user=to_user_out(new_user)
    )

@router.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    clean_identifier = credentials.email.strip().lower()

    # Query tbl_user table by email, full_name, or email prefix (e.g. "admin" for "admin@powersense.com")
    user = db.query(User).filter(
        (User.email == clean_identifier) |
        (User.email.startswith(clean_identifier + "@")) |
        (User.full_name.ilike(clean_identifier))
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password."
        )

    pwd_hash = getattr(user, "password_hash", None) or getattr(user, "password", "")
    if not verify_password(credentials.password, str(pwd_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password."
        )

    token = create_access_token(data={"sub": str(getattr(user, "email")), "user_id": getattr(user, "user_id", getattr(user, "id", None))})

    # Activate this user session for incoming ESP32 live telemetry and storage
    if getattr(user, "user_id", None):
        TelemetryStorageManager.set_active_user(user.user_id)

    return AuthResponse(
        success=True,
        message="Login successful!",
        token=token,
        user=to_user_out(user)
    )

@router.put("/profile/update", response_model=AuthResponse)
@router.post("/profile/update", response_model=AuthResponse)
def update_profile(req: UserProfileUpdate, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    # 1. Update Full Name if provided
    raw_name = req.full_name or req.name
    if raw_name and raw_name.strip():
        name_clean = raw_name.strip()
        if len(name_clean) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name must be at least 2 characters long."
            )
        user.full_name = name_clean

    # 2. Update Phone if provided
    if req.phone is not None:
        if req.phone.strip():
            try:
                formatted_phone = clean_and_validate_indian_phone(req.phone)
                user.phone = formatted_phone
            except ValueError as ve:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(ve)
                )
        else:
            user.phone = None

    # 3. Change Password if new_password is provided
    if req.new_password and req.new_password.strip():
        new_pwd = req.new_password.strip()
        if len(new_pwd) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long."
            )
        
        if not req.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to set a new password."
            )

        current_pwd_hash = getattr(user, "password_hash", None) or getattr(user, "password", "")
        if not verify_password(req.current_password, str(current_pwd_hash)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password entered is incorrect."
            )

        user.password_hash = hash_password(new_pwd)

        user.password_hash = hash_password(new_pwd)

    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while updating profile: {str(e)}"
        )

    return AuthResponse(
        success=True,
        message="Profile updated successfully!",
        user=to_user_out(user)
    )

@router.get("/profile", response_model=AuthResponse)
def get_user_profile(email: str, db: Session = Depends(get_db)):
    clean_email = email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )
    return AuthResponse(
        success=True,
        message="Profile fetched successfully",
        user=to_user_out(user)
    )

@router.get("/me")
def get_current_user_stub():
    return {"message": "PowerSense AI Authentication Service Active"}

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    
    if not clean_email or "@" not in clean_email or "." not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address."
        )

    # 1. Check if the user exists in tbl_user
    user = db.query(User).filter(User.email == clean_email).first()
    
    # 2. If user does NOT exist -> Inform frontend that user is not registered
    if not user:
        return ForgotPasswordResponse(
            success=False,
            is_registered=False,
            message="No account exists with this email address. Please register to create an account.",
            email=clean_email
        )

    # 3. If user DOES exist -> Generate reset token and send email
    try:
        reset_token = create_password_reset_token(clean_email)
        recipient_name = getattr(user, "full_name", None) or getattr(user, "name", None) or "PowerSense User"
        
        # Send email via Gmail SMTP
        send_password_reset_email(
            to_email=clean_email,
            recipient_name=recipient_name,
            reset_token=reset_token
        )
        
        return ForgotPasswordResponse(
            success=True,
            is_registered=True,
            message=f"Password reset link has been sent to {clean_email}. Please check your inbox.",
            email=clean_email
        )
    except Exception as e:
        print(f"[Forgot Password Error] Failed to send email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send reset email: {str(e)}"
        )

@router.post("/verify-reset-token")
def verify_reset_token(req: VerifyResetTokenRequest, db: Session = Depends(get_db)):
    payload = verify_password_reset_token(req.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link. Please request a new one."
        )

    clean_email = payload.get("email") or payload.get("sub")
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this token was not found."
        )

    return {
        "valid": True,
        "email": clean_email,
        "name": getattr(user, "full_name", None) or getattr(user, "name", "User")
    }

@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    # 1. Verify token
    payload = verify_password_reset_token(req.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token. Please request a new password reset link."
        )

    token_email = (payload.get("email") or payload.get("sub") or "").strip().lower()
    
    # 2. Check if confirm password matches if provided
    if req.confirm_password and req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match. Please verify and re-enter."
        )

    # 3. Find user in database
    user = db.query(User).filter(User.email == token_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this reset link was not found."
        )

    # 4. Hash new password and update tbl_user
    new_hashed_pwd = hash_password(req.new_password)
    user.password_hash = new_hashed_pwd

    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while updating password: {str(e)}"
        )

    return ResetPasswordResponse(
        success=True,
        message="Your password has been reset successfully! You can now sign in with your new password.",
        user=to_user_out(user)
    )
