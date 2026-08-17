from datetime import datetime
from sqlalchemy import Column, BigInteger, Numeric, Date, DateTime, ForeignKey
from database import Base

class BillEstimate(Base):
    __tablename__ = 'tbl_bill_estimate'

    bill_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('tbl_user.user_id'), nullable=True)
    tariff_id = Column(BigInteger, ForeignKey('tbl_tariff.tariff_id'), nullable=True)
    billing_month = Column(Date, nullable=False)
    total_units = Column(Numeric(12, 3), nullable=True)  # kWh
    estimated_amount = Column(Numeric(12, 2), nullable=True)  # INR ₹
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "bill_id": self.bill_id,
            "id": self.bill_id,
            "user_id": self.user_id,
            "tariff_id": self.tariff_id,
            "billing_month": self.billing_month.isoformat() if self.billing_month else None,
            "total_units": float(self.total_units) if self.total_units is not None else 0.0,
            "estimated_amount": float(self.estimated_amount) if self.estimated_amount is not None else 0.0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
