# Fixed dependencies file with proper middleware
# File: backend/app/core/deps.py

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.db.session import SessionLocal
from app.models.models import User
from app.core.security import verify_token

# Security scheme
security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user and set user_id in request state"""
    
    # Verify the token
    token_data = verify_token(credentials.credentials)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == token_data.get("user_id")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Set user_id in request state for rate limiting
    request.state.user_id = user.id
    request.state.user = user
    
    return user

class UserContextMiddleware(BaseHTTPMiddleware):
    """Middleware to extract and store user context in request state"""
    
    async def dispatch(self, request: Request, call_next):
        # Try to extract user info from Authorization header
        try:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                from app.core.security import get_token_data
                token_data = get_token_data(token)
                if token_data and "user_id" in token_data:
                    request.state.user_id = token_data["user_id"]
        except Exception:
            # If token extraction fails, continue without setting user_id
            pass
        
        response = await call_next(request)
        return response