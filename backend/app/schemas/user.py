# STEP 11: User profile schema + endpoint
# File: app/schemas/user.py

from pydantic import BaseModel
from datetime import datetime

class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    phone: str | None
    role: str
    location: str
    team: str
    last_login: datetime | None
    created_at: datetime

    class Config:
        orm_mode = True


# STEP 14: Create user creation and list schemas
# File: app/schemas/user.py (extend this file)

class CreateUserRequest(BaseModel):
    username: str
    email: str
    first_name: str
    last_name: str
    phone: str | None
    password: str
    role_id: int
    location_id: int
    team_id: int
    must_change_password: bool = True

class UserListResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    role: str
    location: str
    team: str
    is_active: bool
    last_login: datetime | None

    class Config:
        orm_mode = True

class UpdateUserProfile(BaseModel):
    first_name: str
    last_name: str
    phone: str | None = None
    email: str