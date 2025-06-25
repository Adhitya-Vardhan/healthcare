# STEP 12: Register user routes in main app
# File: app/main.py

from fastapi import FastAPI
from app.api import auth, user, admin_users , config , patients, files
from app.api import audit, health, metrics


from app.core.rate_limitter import limiter
from slowapi.errors import RateLimitExceeded
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse




app = FastAPI()
app.state.limiter = limiter
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


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"success": False, "error": {"code": "RATE_LIMIT_EXCEEDED", "message": str(exc)}}
    )