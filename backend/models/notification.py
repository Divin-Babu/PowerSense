from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from database import Base

class Notification(Base):
    __tablename__ = 'tbl_notification'

    notification_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('tbl_user.user_id'), nullable=True)
    appliance_id = Column(BigInteger, ForeignKey('tbl_appliance.appliance_id'), nullable=True)
    notification_type = Column(String(100), nullable=False)  # 'warning', 'info', 'critical', 'success'
    message = Column(Text, nullable=False)
    status = Column(String(50), default="UNREAD", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "notification_id": self.notification_id,
            "id": self.notification_id,
            "user_id": self.user_id,
            "appliance_id": self.appliance_id,
            "notification_type": self.notification_type,
            "category": self.notification_type,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
