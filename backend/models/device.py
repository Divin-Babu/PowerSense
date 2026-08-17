from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from database import Base

class Device(Base):
    __tablename__ = 'tbl_device'

    device_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('tbl_user.user_id'), nullable=True)
    device_uid = Column(String(255), unique=True, index=True, nullable=False)
    device_name = Column(String(255), nullable=False)
    status = Column(String(50), default="ONLINE", nullable=True)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "device_id": self.device_id,
            "id": self.device_id,
            "user_id": self.user_id,
            "device_uid": self.device_uid,
            "device_name": self.device_name,
            "name": self.device_name,
            "status": self.status,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
