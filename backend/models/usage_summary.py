from sqlalchemy import Column, BigInteger, String, Numeric, Date, ForeignKey
from database import Base

class UsageSummary(Base):
    __tablename__ = 'tbl_usage_summary'

    summary_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    appliance_id = Column(BigInteger, ForeignKey('tbl_appliance.appliance_id'), nullable=True)
    period_type = Column(String(50), nullable=False)  # 'DAY', 'WEEK', 'MONTH', 'YEAR'
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    total_energy = Column(Numeric(12, 3), nullable=True)  # kWh
    average_power = Column(Numeric(10, 2), nullable=True)  # W
    peak_power = Column(Numeric(10, 2), nullable=True)  # W

    def to_dict(self):
        return {
            "summary_id": self.summary_id,
            "id": self.summary_id,
            "appliance_id": self.appliance_id,
            "period_type": self.period_type,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "total_energy": float(self.total_energy) if self.total_energy is not None else 0.0,
            "average_power": float(self.average_power) if self.average_power is not None else 0.0,
            "peak_power": float(self.peak_power) if self.peak_power is not None else 0.0,
        }
