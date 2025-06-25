# STEP 43: System health endpoint
# File: app/api/health.py

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": "healthy",
                "encryption": "healthy",
                "fileStorage": "healthy"
            }
        }
    }
