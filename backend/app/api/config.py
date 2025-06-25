# STEP 21: Expose GET /config/* endpoints for dropdowns
# File: app/api/config.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.schemas.config import RoleOut, LocationOut, TeamOut
from app.models.models import Role, Location, Team

router = APIRouter()

@router.get("/config/roles", response_model=list[RoleOut])
def get_roles(db: Session = Depends(get_db)):
    return db.query(Role).filter(Role.is_active == True).all()

@router.get("/config/locations", response_model=list[LocationOut])
def get_locations(db: Session = Depends(get_db)):
    return db.query(Location).filter(Location.is_active == True).all()

@router.get("/config/teams", response_model=list[TeamOut])
def get_teams(db: Session = Depends(get_db)):
    return db.query(Team).filter(Team.is_active == True).all()
