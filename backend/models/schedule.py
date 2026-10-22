from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey
from database import Base

class Schedule(Base):
    __tablename__ = 'tbl_schedule'

    schedule_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('tbl_user.user_id'), nullable=False, index=True)
    device_id = Column(BigInteger, ForeignKey('tbl_device.device_id'), nullable=True)
    name = Column(String(150), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    on_time = Column(String(10), nullable=False)   # "06:30"
    off_time = Column(String(10), nullable=False)  # "23:30"
    repeat = Column(String(20), default="EVERYDAY", nullable=False)  # 'EVERYDAY', 'WEEKDAYS', 'WEEKENDS'
    category = Column(String(50), default="Custom", nullable=True)
    relay_channel = Column(String(20), default="RELAY_1", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "id": f"sch-{self.schedule_id}",
            "schedule_id": self.schedule_id,
            "user_id": self.user_id,
            "device_id": self.device_id,
            "name": self.name,
            "enabled": bool(self.enabled),
            "onTime": self.on_time,
            "offTime": self.off_time,
            "repeat": self.repeat,
            "category": self.category or "Custom",
            "relay_channel": self.relay_channel or "RELAY_1",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
