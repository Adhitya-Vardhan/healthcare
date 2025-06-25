# STEP 20: Create config schemas
# File: app/schemas/config.py

from pydantic import BaseModel

class RoleOut(BaseModel):
    id: int
    name: str
    description: str
    level: int

    class Config:
        orm_mode = True

class LocationOut(BaseModel):
    id: int
    code: str
    name: str
    country: str

    class Config:
        orm_mode = True

class TeamOut(BaseModel):
    id: int
    code: str
    name: str
    description: str

    class Config:
        orm_mode = True
