import re
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional
from datetime import datetime

def clean_and_validate_indian_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    cleaned = re.sub(r"[\s\-\(\)]", "", phone.strip())
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]

    if not cleaned.isdigit():
        raise ValueError("Mobile number must contain only digits.")
    if len(cleaned) != 10:
        raise ValueError(f"Mobile number must be exactly 10 digits (received {len(cleaned)} digits).")
    if cleaned[0] not in "6789":
        raise ValueError("Mobile number must start with 6, 7, 8, or 9.")

    return f"+91 {cleaned[:5]} {cleaned[5:]}"

class UserCreate(BaseModel):
    name: Optional[str] = "Smart Plug User"
    email: EmailStr
    phone: Optional[str] = None
    password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return clean_and_validate_indian_phone(v)
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v_stripped = v.strip()
            if len(v_stripped) < 2:
                raise ValueError("Name must be at least 2 characters long.")
            return v_stripped
        return "Smart Plug User"

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    user_id: Optional[int] = None
    name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    role: Optional[str] = "user"
    created_at: Optional[datetime] = None

class EmailCheckResponse(BaseModel):
    available: bool
    message: str
    email: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    user: Optional[UserOut] = None

class UserProfileUpdate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

