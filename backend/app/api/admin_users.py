# STEP 15: Add endpoints for admins to create & list users
# File: app/api/admin_users.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.schemas.user import CreateUserRequest, UserListResponse
from app.models.models import User, Role, Location, Team
from app.utils.security import hash_password

router = APIRouter()

def is_admin(user=Depends(get_current_user)):
    if user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return user

@router.post("/users", response_model=UserListResponse)
def create_user(user_in: CreateUserRequest, db: Session = Depends(get_db), admin=Depends(is_admin)):
    hashed_pwd = hash_password(user_in.password)
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        password_hash=hashed_pwd,
        salt="static",  # Replace with salt logic if needed
        role_id=user_in.role_id,
        location_id=user_in.location_id,
        team_id=user_in.team_id,
        must_change_password=user_in.must_change_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/users", response_model=list[UserListResponse])
def list_users(
    db: Session = Depends(get_db),
    admin=Depends(is_admin),
    page: int = Query(1),
    limit: int = Query(20)
):
    offset = (page - 1) * limit
    users = db.query(User).offset(offset).limit(limit).all()
    return users
