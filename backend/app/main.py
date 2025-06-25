# Complete main.py with all your existing routers
# File: backend/app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.deps import UserContextMiddleware

# Import all your routers
from app.api import auth, user, admin_users, patients, config, files, audit, health, metrics

# Rate limiting imports
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

app = FastAPI(title="Healthcare API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom user context middleware
app.add_middleware(UserContextMiddleware)

# Set up rate limiter at app level
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Add rate limit exception handler at app level (not router level)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include all your routers
app.include_router(auth.router, tags=["auth"])
app.include_router(user.router, tags=["users"])
app.include_router(admin_users.router, prefix="/admin", tags=["admin"])
app.include_router(config.router, tags=["config"])
app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(files.router, tags=["files"])
app.include_router(audit.router, tags=["audit"])
app.include_router(health.router, tags=["health"])
app.include_router(metrics.router, tags=["metrics"])

@app.on_event("startup")
def list_routes():
    for route in app.routes:
        print(f"{route.path} - {route.methods}")

# Custom rate limit exception handler (overrides the default one)
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "success": False, 
            "error": {
                "code": "RATE_LIMIT_EXCEEDED", 
                "message": str(exc)
            }
        }
    )

@app.get("/")
def read_root():
    return {"message": "Healthcare API is running!"}

@app.get("/health-check")
def health_check():
    return {"status": "healthy", "message": "API is operational"}