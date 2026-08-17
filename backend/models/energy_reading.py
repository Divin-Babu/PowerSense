from datetime import datetime
from sqlalchemy import Column, BigInteger, Numeric, DateTime, ForeignKey
from database import Base

class EnergyReading(Base):
    __tablename__ = 'tbl_energy_reading'

    reading_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    device_id = Column(BigInteger, ForeignKey('tbl_device.device_id'), nullable=True)
    appliance_id = Column(BigInteger, ForeignKey('tbl_appliance.appliance_id'), nullable=True)
    voltage = Column(Numeric(8, 2), nullable=True)
    current = Column(Numeric(8, 2), nullable=True)
    power = Column(Numeric(10, 2), nullable=True)
    energy = Column(Numeric(12, 3), nullable=True)
    power_factor = Column(Numeric(4, 2), nullable=True)
    frequency = Column(Numeric(6, 2), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "reading_id": self.reading_id,
            "id": self.reading_id,
            "device_id": self.device_id,
            "appliance_id": self.appliance_id,
            "voltage": float(self.voltage) if self.voltage is not None else 0.0,
            "current": float(self.current) if self.current is not None else 0.0,
            "power": float(self.power) if self.power is not None else 0.0,
            "energy": float(self.energy) if self.energy is not None else 0.0,
            "power_factor": float(self.power_factor) if self.power_factor is not None else 1.0,
            "frequency": float(self.frequency) if self.frequency is not None else 50.0,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
        }
