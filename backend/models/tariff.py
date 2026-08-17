from sqlalchemy import Column, BigInteger, String, Numeric, Date
from database import Base

class Tariff(Base):
    __tablename__ = 'tbl_tariff'

    tariff_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    tariff_name = Column(String(255), nullable=False)
    rate_per_kwh = Column(Numeric(10, 2), nullable=False)  # ₹ / kWh
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)

    def to_dict(self):
        return {
            "tariff_id": self.tariff_id,
            "id": self.tariff_id,
            "tariff_name": self.tariff_name,
            "rate_per_kwh": float(self.rate_per_kwh) if self.rate_per_kwh is not None else 6.50,
            "effective_from": self.effective_from.isoformat() if self.effective_from else None,
            "effective_to": self.effective_to.isoformat() if self.effective_to else None,
        }
