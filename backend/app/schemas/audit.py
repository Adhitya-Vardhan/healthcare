# STEP 41: Audit schema + endpoint
# File: app/schemas/audit.py

from pydantic import BaseModel
from datetime import datetime

class AuditEntry(BaseModel):
    id: int
    user_id: int
    username: str
    action: str
    resource_type: str
    resource_id: str
    ip_address: str
    timestamp: datetime

    class Config:
        orm_mode = True

class AuditLogResponse(BaseModel):
    activities: list[AuditEntry]
    page: int
    limit: int
    total: int
    pages: int
