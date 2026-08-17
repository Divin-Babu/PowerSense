from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from database import Base

class Anomaly(Base):
    __tablename__ = 'tbl_anomaly'

    anomaly_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    appliance_id = Column(BigInteger, ForeignKey('tbl_appliance.appliance_id'), nullable=True)
    reading_id = Column(BigInteger, ForeignKey('tbl_energy_reading.reading_id'), nullable=True)
    anomaly_type = Column(String(100), nullable=False)
    severity = Column(String(50), default="warning", nullable=True)  # 'critical', 'warning', 'info'
    description = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "anomaly_id": self.anomaly_id,
            "id": self.anomaly_id,
            "appliance_id": self.appliance_id,
            "reading_id": self.reading_id,
            "anomaly_type": self.anomaly_type,
            "type": self.anomaly_type,
            "severity": self.severity,
            "description": self.description,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
        }
