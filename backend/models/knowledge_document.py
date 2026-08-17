from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Text, DateTime
from database import Base

class KnowledgeDocument(Base):
    __tablename__ = 'tbl_knowledge_document'

    document_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=True)  # 'Hardware Specs', 'Optimization', 'Setup'
    appliance_category = Column(String(100), nullable=True)
    source = Column(String(255), nullable=True)
    file_path = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            "document_id": self.document_id,
            "id": self.document_id,
            "title": self.title,
            "document_type": self.document_type,
            "category": self.document_type,
            "appliance_category": self.appliance_category,
            "source": self.source,
            "file_path": self.file_path,
            "content": self.file_path,  # text content or doc path
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
