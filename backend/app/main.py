# Updated main.py with enhanced security and all new endpoints
# File: backend/app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.deps import UserContextMiddleware
import asyncio
from app.api.websockets import periodic_admin_updates
from app.core.websocket_manager import connection_manager
from datetime import datetime

# Import all routers including new ones
from app.api import auth, user, admin_users, patients, config, files, audit, health, metrics
from app.api import encryption  # New encryption management API
from app.api import websockets  # New WebSocket API

# Import enhanced security middleware
from app.core.security_middleware import (
    CSRFProtectionMiddleware,
    XSSProtectionMiddleware, 
    RateLimitingMiddleware,
    SecurityHeadersMiddleware
)

# Rate limiting imports
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

app = FastAPI(
    title="Healthcare Patient Management API",
    description="Secure patient data management system with encryption",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None
)

# CORS middleware (configure for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security middleware stack (order matters!)
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

# 1. Security headers (first)
app.add_middleware(SecurityHeadersMiddleware)

# 2. Rate limiting
app.add_middleware(RateLimitingMiddleware, max_requests=1000, window_seconds=3600)

# 3. CSRF protection (only in production)
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(CSRFProtectionMiddleware, secret_key=SECRET_KEY)

# 4. XSS protection
app.add_middleware(XSSProtectionMiddleware)

# 5. User context middleware (last)
app.add_middleware(UserContextMiddleware)

# Set up rate limiter at app level
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Add rate limit exception handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include all routers with proper prefixes and tags
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(user.router, prefix="/api", tags=["User Management"])
app.include_router(admin_users.router, prefix="/api/admin", tags=["Admin - User Management"])
app.include_router(config.router, prefix="/api", tags=["Configuration"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patient Management"])
app.include_router(files.router, prefix="/api", tags=["File Management"])
app.include_router(audit.router, prefix="/api", tags=["Audit & Logging"])
app.include_router(encryption.router, prefix="/api", tags=["Encryption Management"])
app.include_router(health.router, prefix="/api", tags=["System Health"])
app.include_router(metrics.router, prefix="/api", tags=["System Metrics"])
app.include_router(websockets.router, prefix="/api", tags=["WebSocket Real-time"])  # New WebSocket routes

@app.on_event("startup")
async def startup_event():
    """Startup events"""
    print("🚀 Healthcare API Starting Up...")
    print("🔒 Security middleware enabled")
    print("🔐 Encryption service initialized")
    print("🔗 WebSocket connections ready")
    
    # Start background tasks
    
    # Start periodic admin updates task
    asyncio.create_task(periodic_admin_updates())
    
    # Start heartbeat task
    asyncio.create_task(heartbeat_task())
    
    # List all routes for debugging (remove in production)
    if os.getenv("ENVIRONMENT") != "production":
        print("\n📋 Available API Routes:")
        for route in app.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                methods = ', '.join(route.methods)
                print(f"  {methods:15} {route.path}")
        
        print("\n🔗 WebSocket Endpoints:")
        print("  WebSocket      /api/ws (General real-time)")
        print("  WebSocket      /api/ws/admin (Admin monitoring)")

async def heartbeat_task():
    """Background task to send periodic heartbeat"""
    from app.core.websocket_manager import connection_manager
    while True:
        try:
            await asyncio.sleep(60)  # Send heartbeat every minute
            await connection_manager.send_heartbeat()
        except Exception as e:
            print(f"❌ Heartbeat task error: {e}")
            await asyncio.sleep(120)  # Wait longer on error

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🛑 Healthcare API Shutting Down...")
    print("🔌 Closing WebSocket connections...")
    
    # Close all WebSocket connections gracefully
    from app.core.websocket_manager import connection_manager
    
    # Send shutdown notification to all connected clients
    shutdown_message = {
        "type": "server_shutdown",
        "data": {
            "message": "Server is shutting down. Please reconnect in a moment.",
            "timestamp": datetime.utcnow().isoformat()
        }
    }
    
    try:
        await connection_manager.broadcast_to_all(shutdown_message)
        # Give time for messages to be sent
        import asyncio
        await asyncio.sleep(2)
    except Exception as e:
        print(f"❌ Error during shutdown cleanup: {e}")

# Enhanced rate limit exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom rate limit response"""
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again later.",
                "detail": str(exc),
                "retry_after": 60
            }
        }
    )

# Global exception handler for enhanced security
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler that doesn't leak sensitive information"""
    
    # Log the actual error (in production, use proper logging)
    print(f"❌ Unhandled exception: {str(exc)}")
    
    # Return generic error message in production
    if os.getenv("ENVIRONMENT") == "production":
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An internal error occurred. Please try again later."
                }
            }
        )
    else:
        # In development, show actual error
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": str(exc),
                    "type": type(exc).__name__
                }
            }
        )

# Root endpoint
@app.get("/")
def read_root():
    """Root endpoint with API information"""
    return {
        "message": "Healthcare Patient Management API",
        "version": "1.0.0",
        "status": "operational",
        "documentation": "/docs" if os.getenv("ENVIRONMENT") != "production" else "Contact administrator",
        "features": {
            "real_time_notifications": "WebSocket support enabled",
            "file_upload_progress": "Real-time progress tracking",
            "live_audit_monitoring": "Admin real-time dashboard",
            "system_health_monitoring": "Live system metrics"
        },
        "websocket_endpoints": {
            "general": "/api/ws",
            "admin": "/api/ws/admin"
        },
        "security": {
            "encryption": "AES-256",
            "authentication": "JWT Bearer Token",
            "rate_limiting": "Enabled",
            "csrf_protection": "Enabled",
            "real_time_audit": "Enabled"
        }
    }

# Health check endpoint (without authentication)
@app.get("/health")
def health_check():
    """Basic health check endpoint"""
    from app.core.websocket_manager import connection_manager
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "websocket_connections": {
            "total_connections": connection_manager.get_connection_count(),
            "unique_users": connection_manager.get_user_count()
        }
    }

# API status endpoint
@app.get("/api/status")
def api_status():
    """Detailed API status information"""
    from app.core.websocket_manager import connection_manager
    
    connection_stats = connection_manager.get_connection_stats()
    
    return {
        "api": {
            "status": "operational",
            "version": "1.0.0",
            "uptime": "Available since startup"
        },
        "features": {
            "user_authentication": "enabled",
            "patient_data_encryption": "enabled",
            "audit_logging": "enabled",
            "file_upload": "enabled",
            "data_export": "enabled",
            "rate_limiting": "enabled",
            "csrf_protection": "enabled",
            "websocket_support": "enabled",
            "real_time_notifications": "enabled",
            "live_monitoring": "enabled"
        },
        "endpoints": {
            "authentication": "/api/auth/*",
            "patient_management": "/api/patients/*",
            "file_operations": "/api/files/*",
            "audit_logs": "/api/audit/*",
            "system_health": "/api/health/*",
            "encryption_management": "/api/encryption/*",
            "websocket_general": "/api/ws",
            "websocket_admin": "/api/ws/admin"
        },
        "real_time_features": {
            "upload_progress": "Real-time file upload progress tracking",
            "patient_notifications": "Live patient CRUD notifications",
            "audit_streaming": "Real-time audit log streaming",
            "health_monitoring": "Live system health dashboard",
            "connection_stats": connection_stats
        }
    }

# CSRF token endpoint
@app.get("/api/csrf-token")
def get_csrf_token(request: Request):
    """Get CSRF token for session"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        return JSONResponse(
            status_code=400,
            content={"error": "Session ID required"}
        )
    
    # In a real implementation, generate and store CSRF token
    # For now, return a placeholder
    return {
        "csrf_token": "csrf_token_placeholder",
        "expires_in": 3600,
        "session_id": session_id
    }

# WebSocket connection info endpoint
@app.get("/api/websocket/info")
def websocket_info():
    """Get WebSocket connection information and examples"""
    return {
        "endpoints": {
            "general": {
                "url": "/api/ws",
                "description": "General WebSocket endpoint for all users",
                "authentication": "JWT token required as query parameter: ?token=your_jwt_token",
                "features": [
                    "Real-time upload progress",
                    "Patient CRUD notifications",
                    "Personal notifications"
                ]
            },
            "admin": {
                "url": "/api/ws/admin",
                "description": "Admin-only WebSocket endpoint for monitoring",
                "authentication": "Admin JWT token required as query parameter",
                "features": [
                    "Live audit log streaming",
                    "System health monitoring",
                    "Connection statistics",
                    "Real-time dashboard data"
                ]
            }
        },
        "message_types": {
            "client_to_server": [
                "ping - Heartbeat ping",
                "subscribe_audit - Subscribe to audit logs (Admin only)",
                "subscribe_health - Subscribe to health updates (Admin only)",
                "get_patient_count - Get current patient count",
                "get_connection_stats - Get connection statistics (Admin only)"
            ],
            "server_to_client": [
                "upload_progress - File upload progress updates",
                "upload_complete - Upload completion notification",
                "upload_error - Upload error notification",
                "patient_created - New patient notification",
                "patient_updated - Patient update notification",
                "patient_deleted - Patient deletion notification",
                "audit_log - Real-time audit events",
                "system_health - System health updates",
                "notification - General notifications",
                "heartbeat - Server heartbeat"
            ]
        },
        "connection_example": {
            "javascript": """
const ws = new WebSocket('ws://localhost:8000/api/ws?token=your_jwt_token');

ws.onopen = function(event) {
    console.log('Connected to WebSocket');
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
    
    switch(message.type) {
        case 'upload_progress':
            updateProgressBar(message.data.progress);
            break;
        case 'patient_created':
            showNotification('Patient created: ' + message.data.patient_name);
            break;
        // Handle other message types...
    }
};

// Send ping
ws.send(JSON.stringify({type: 'ping'}));
            """,
            "python": """
import asyncio
import websockets
import json

async def connect():
    uri = "ws://localhost:8000/api/ws?token=your_jwt_token"
    
    async with websockets.connect(uri) as websocket:
        # Send ping
        await websocket.send(json.dumps({"type": "ping"}))
        
        # Listen for messages
        async for message in websocket:
            data = json.loads(message)
            print(f"Received: {data}")
            
asyncio.run(connect())
            """
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") != "production" else False,
        log_level="info",
        ws_ping_interval=20,  # WebSocket ping interval
        ws_ping_timeout=10    # WebSocket ping timeout
    )