# File: app/api/audit.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.models import UserAuditLog, User
from app.schemas.audit import AuditLogResponse, AuditEntry
from sqlalchemy import func
from fastapi import HTTPException

router = APIRouter()

@router.get("/audit/user-activity", response_model=AuditLogResponse)
def get_user_activity(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    page: int = 1,
    limit: int = 20
):
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Admin access only")

    query = db.query(UserAuditLog).join(User, User.id == UserAuditLog.user_id)

    total = query.count()
    pages = (total + limit - 1) // limit
    entries = query.offset((page - 1) * limit).limit(limit).all()

    result = [
        AuditEntry(
            id=e.id,
            user_id=e.user_id,
            username=e.user.username,
            action=e.action,
            resource_type=e.resource_type,
            resource_id=e.resource_id,
            ip_address=e.ip_address,
            timestamp=e.timestamp
        )
        for e in entries
    ]

    return AuditLogResponse(activities=result, page=page, limit=limit, total=total, pages=pages)

# STEP 42: Get encryption/decryption activity
# File: app/api/audit.py (extend)

@router.get("/audit/encryption-activity")
def get_encryption_activity(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Admin access only")

    entries = db.execute("""
        SELECT
            ea.id, ea.user_id, u.username, ea.patient_id, ea.operation,
            ea.field_name, ea.key_version, ea.timestamp
        FROM encryption_audit_log ea
        LEFT JOIN users u ON ea.user_id = u.id
        ORDER BY ea.timestamp DESC
        LIMIT 50
    """).fetchall()

    return {"activities": [dict(row._mapping) for row in entries]}
