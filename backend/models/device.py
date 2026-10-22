from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Numeric
from database import Base

class Device(Base):
    __tablename__ = 'tbl_device'

    device_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('tbl_user.user_id'), nullable=True)
    device_uid = Column(String(255), unique=True, index=True, nullable=False)
    device_name = Column(String(255), nullable=False)
    status = Column(String(50), default="ONLINE", nullable=True)
    relay_state = Column(String(20), default="ON", nullable=True)
    relay1_state = Column(String(20), default="ON", nullable=True)
    relay2_state = Column(String(20), default="OFF", nullable=True)
    voltage = Column(Numeric(8, 2), default=230.0, nullable=True)
    current = Column(Numeric(8, 2), default=0.0, nullable=True)
    power = Column(Numeric(10, 2), default=0.0, nullable=True)
    energy = Column(Numeric(12, 3), default=0.0, nullable=True)
    frequency = Column(Numeric(6, 2), default=50.0, nullable=True)
    power_factor = Column(Numeric(4, 2), default=1.0, nullable=True)
    power_source = Column(String(100), default="HLK-PM01 5V AC-DC", nullable=True)
    rssi = Column(BigInteger, default=-60, nullable=True)
    ip_address = Column(String(50), default="192.168.1.100", nullable=True)
    mac_address = Column(String(50), default="24:6F:28:B4:9A:12", nullable=True)
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
            "status": self.status or "ONLINE",
            "relay_state": self.relay_state or "ON",
            "relay1_state": self.relay1_state or "ON",
            "relay2_state": self.relay2_state or "OFF",
            "voltage": float(self.voltage) if self.voltage is not None else 230.0,
            "current": float(self.current) if self.current is not None else 0.0,
            "power": float(self.power) if self.power is not None else 0.0,
            "watts": float(self.power) if self.power is not None else 0.0,
            "energy": float(self.energy) if self.energy is not None else 0.0,
            "frequency": float(self.frequency) if self.frequency is not None else 50.0,
            "power_factor": float(self.power_factor) if self.power_factor is not None else 1.0,
            "power_source": self.power_source or "HLK-PM01 5V AC-DC",
            "rssi": int(self.rssi) if self.rssi is not None else -60,
            "ip_address": self.ip_address or "192.168.1.100",
            "mac_address": self.mac_address or "24:6F:28:B4:9A:12",
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
