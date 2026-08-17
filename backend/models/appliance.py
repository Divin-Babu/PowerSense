from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey
from database import Base

class Appliance(Base):
    __tablename__ = 'tbl_appliance'

    appliance_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('tbl_user.user_id'), nullable=True)
    device_id = Column(BigInteger, ForeignKey('tbl_device.device_id'), nullable=True)
    appliance_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    rated_power = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "appliance_id": self.appliance_id,
            "id": self.appliance_id,
            "user_id": self.user_id,
            "device_id": self.device_id,
            "appliance_name": self.appliance_name,
            "name": self.appliance_name,
            "category": self.category,
            "rated_power": float(self.rated_power) if self.rated_power is not None else 0.0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
