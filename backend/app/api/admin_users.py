# Fixed admin_users.py with proper error handling
# File: backend/app/api/admin_users.py

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.deps import get_db, get_current_user
from app.schemas.user import CreateUserRequest, UserListResponse
from app.models.models import User, Role, Location, Team
from app.utils.security import hash_password
from datetime import datetime

router = APIRouter()

def is_admin(user=Depends(get_current_user)):
    if user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return user

@router.post("/users", response_model=UserListResponse)
def create_user(user_in: CreateUserRequest, db: Session = Depends(get_db), admin=Depends(is_admin)):
    try:
        # Check if username already exists
        existing_username = db.query(User).filter(User.username == user_in.username).first()
        if existing_username:
            raise HTTPException(
                status_code=400, 
                detail=f"Username '{user_in.username}' already exists"
            )
        
        # Check if email already exists
        existing_email = db.query(User).filter(User.email == user_in.email).first()
        if existing_email:
            raise HTTPException(
                status_code=400, 
                detail=f"Email '{user_in.email}' already exists"
            )
        
        # Validate that role, location, and team exist
        role = db.query(Role).filter(Role.id == user_in.role_id).first()
        if not role:
            raise HTTPException(status_code=400, detail="Invalid role_id")
        
        location = db.query(Location).filter(Location.id == user_in.location_id).first()
        if not location:
            raise HTTPException(status_code=400, detail="Invalid location_id")
        
        team = db.query(Team).filter(Team.id == user_in.team_id).first()
        if not team:
            raise HTTPException(status_code=400, detail="Invalid team_id")
        
        # Hash the password
        hashed_pwd = hash_password(user_in.password)
        
        # Create new user
        new_user = User(
            username=user_in.username,
            email=user_in.email,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            phone=user_in.phone,
            password_hash=hashed_pwd,
            salt="static",  # Replace with proper salt logic if needed
            role_id=user_in.role_id,
            location_id=user_in.location_id,
            team_id=user_in.team_id,
            must_change_password=user_in.must_change_password,
            created_at=datetime.utcnow(),
            is_active=True,
            is_verified=False
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Return the created user data
        return UserListResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            role=role.name,  # Use the role object we already fetched
            location=location.code,  # Use the location object we already fetched
            team=team.code,  # Use the team object we already fetched
            is_active=new_user.is_active,
            last_login=new_user.last_login
        )
        
    except IntegrityError as e:
        db.rollback()
        error_msg = str(e.orig)
        if "users_username_key" in error_msg:
            raise HTTPException(status_code=400, detail=f"Username '{user_in.username}' already exists")
        elif "users_email_key" in error_msg:
            raise HTTPException(status_code=400, detail=f"Email '{user_in.email}' already exists")
        else:
            raise HTTPException(status_code=400, detail="Database constraint violation")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/users", response_model=list[UserListResponse])
def list_users(
    db: Session = Depends(get_db),
    admin=Depends(is_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    try:
        offset = (page - 1) * limit
        users = (
            db.query(User)
            .join(Role)
            .join(Location) 
            .join(Team)
            .offset(offset)
            .limit(limit)
            .all()
        )
        
        return [
            UserListResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role.name,
                location=user.location.code,
                team=user.team.code,
                is_active=user.is_active,
                last_login=user.last_login
            )
            for user in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

# Additional endpoint to check if username/email exists
@router.get("/users/check-availability")
def check_user_availability(
    username: str = None,
    email: str = None,
    db: Session = Depends(get_db),
    admin=Depends(is_admin)
):
    """Check if username or email is available"""
    result = {"available": True, "messages": []}
    
    if username:
        existing_username = db.query(User).filter(User.username == username).first()
        if existing_username:
            result["available"] = False
            result["messages"].append(f"Username '{username}' is already taken")
    
    if email:
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            result["available"] = False
            result["messages"].append(f"Email '{email}' is already taken")
    
    return result