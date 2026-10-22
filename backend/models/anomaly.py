from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from database import Base

class Anomaly(Base):
    __tablename__ = 'tbl_anomaly'

    anomaly_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    device_id = Column(BigInteger, ForeignKey('tbl_device.device_id'), nullable=True)
    user_id = Column(BigInteger, ForeignKey('tbl_user.user_id'), nullable=True)
    appliance_id = Column(BigInteger, ForeignKey('tbl_appliance.appliance_id'), nullable=True)
    reading_id = Column(BigInteger, ForeignKey('tbl_energy_reading.reading_id'), nullable=True)
    anomaly_type = Column(String(100), nullable=False)  # 'High Power Usage', 'Unusual Spike'
    severity = Column(String(50), nullable=False)        # 'warning', 'critical'
    description = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "anomaly_id": self.anomaly_id,
            "id": self.anomaly_id,
            "device_id": self.device_id,
            "user_id": self.user_id,
            "appliance_id": self.appliance_id,
            "reading_id": self.reading_id,
            "anomaly_type": self.anomaly_type,
            "severity": self.severity,
            "description": self.description,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
        }
