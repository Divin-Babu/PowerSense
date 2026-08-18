from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime
from database import Base

class User(Base):
    __tablename__ = 'tbl_user'

    user_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    # Property alias for compatibility
    @property
    def name(self):
        return self.full_name

    @name.setter
    def name(self, val):
        self.full_name = val

    @property
    def id(self):
        return self.user_id

    @property
    def password(self):
        return self.password_hash

    def to_dict(self):
        created_val = getattr(self, "created_at", None)
        disp_name = self.full_name or "User"
        return {
            "id": self.user_id,
            "user_id": self.user_id,
            "full_name": disp_name,
            "name": disp_name,
            "email": self.email,
            "role": self.role or "user",
            "created_at": created_val.isoformat() if isinstance(created_val, datetime) else None
        }
