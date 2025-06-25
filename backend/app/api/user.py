# File: app/api/user.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.schemas.user import UserProfile
from app.schemas.user import UpdateUserProfile

router = APIRouter()

@router.get("/users/profile", response_model=UserProfile)
def get_profile(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone": current_user.phone,
        "role": current_user.role.name,
        "location": current_user.location.code,
        "team": current_user.team.code,
        "last_login": current_user.last_login,
        "created_at": current_user.created_at
    }



@router.put("/users/profile", response_model=UserProfile)
def update_profile(data: UpdateUserProfile, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    current_user.first_name = data.first_name
    current_user.last_name = data.last_name
    current_user.phone = data.phone
    current_user.email = data.email
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone": current_user.phone,
        "role": current_user.role.name,
        "location": current_user.location.code,
        "team": current_user.team.code,
        "last_login": current_user.last_login,
        "created_at": current_user.created_at
    }

