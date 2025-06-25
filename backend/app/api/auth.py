# STEP 8: FastAPI route to handle login
# File: app/api/auth.py

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth_service import login

from slowapi import Limiter
from app.core.rate_limitter import limiter

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_user(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    token = login(db, data.username, data.password)
    return {"access_token": token}

# STEP 13: Add logout endpoint (stateless placeholder)
# File: app/api/auth.py

@router.post("/logout")
def logout():
    return {"success": True, "message": "Logged out successfully"}
