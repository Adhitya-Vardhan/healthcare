# STEP 7: Service to handle authentication logic
# File: app/services/auth_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import User
from app.utils.security import verify_password, create_access_token
from datetime import timedelta
from datetime import datetime

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

def login(db: Session, username: str, password: str) -> str:
    user = authenticate_user(db, username, password)

    # ⏰ Update last_login
    user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.name},
        expires_delta=timedelta(minutes=60)
    )
    return access_token
