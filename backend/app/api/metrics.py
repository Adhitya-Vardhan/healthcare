# STEP 44: Return simple system metrics
# File: app/api/metrics.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.models import User, Patient, FileUpload
from sqlalchemy import func

router = APIRouter()

@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    return {
        "success": True,
        "data": {
            "users": {
                "total": db.query(func.count(User.id)).scalar()
            },
            "patients": {
                "total": db.query(func.count(Patient.id)).scalar()
            },
            "uploads": {
                "totalFiles": db.query(func.count(FileUpload.id)).scalar()
            }
        }
    }
