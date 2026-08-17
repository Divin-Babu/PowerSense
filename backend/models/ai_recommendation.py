from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from database import Base

class AiRecommendation(Base):
    __tablename__ = 'tbl_ai_recommendation'

    recommendation_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    appliance_id = Column(BigInteger, ForeignKey('tbl_appliance.appliance_id'), nullable=True)
    anomaly_id = Column(BigInteger, ForeignKey('tbl_anomaly.anomaly_id'), nullable=True)
    recommendation = Column(Text, nullable=False)
    source_type = Column(String(100), default="RAG_AI_ENGINE", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "recommendation_id": self.recommendation_id,
            "id": self.recommendation_id,
            "appliance_id": self.appliance_id,
            "anomaly_id": self.anomaly_id,
            "recommendation": self.recommendation,
            "source_type": self.source_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
