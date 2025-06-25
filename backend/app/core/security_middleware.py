# Enhanced security middleware
# File: app/core/security_middleware.py

import secrets
import hashlib
from fastapi import HTTPException, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import html
import re
from typing import Optional
import time
from collections import defaultdict, deque

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """CSRF Protection Middleware"""
    
    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key
        self.token_store = {}  # In production, use Redis or database
    
    def generate_csrf_token(self, session_id: str) -> str:
        """Generate CSRF token for session"""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(f"{token}{self.secret_key}".encode()).hexdigest()
        self.token_store[session_id] = {
            "token": token,
            "hash": token_hash,
            "created_at": time.time()
        }
        return token
    
    def validate_csrf_token(self, session_id: str, token: str) -> bool:
        """Validate CSRF token"""
        if session_id not in self.token_store:
            return False
        
        stored_data = self.token_store[session_id]
        expected_hash = hashlib.sha256(f"{token}{self.secret_key}".encode()).hexdigest()
        
        # Check if token matches and is not expired (1 hour)
        is_valid = (
            stored_data["hash"] == expected_hash and
            time.time() - stored_data["created_at"] < 3600
        )
        
        return is_valid
    
    async def dispatch(self, request: Request, call_next):
        # Skip CSRF for GET, HEAD, OPTIONS
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            response = await call_next(request)
            return response
        
        # Skip CSRF for auth endpoints (login)
        if request.url.path.startswith("/api/auth/") or request.url.path.startswith("/auth/"):
            response = await call_next(request)
            return response
        
        # For state-changing operations, validate CSRF token
        session_id = request.headers.get("X-Session-ID")
        csrf_token = request.headers.get("X-CSRF-Token")
        
        if not session_id or not csrf_token:
            return JSONResponse(
                status_code=403,
                content={"error": "CSRF token required"}
            )
        
        if not self.validate_csrf_token(session_id, csrf_token):
            return JSONResponse(
                status_code=403,
                content={"error": "Invalid CSRF token"}
            )
        
        response = await call_next(request)
        return response

class XSSProtectionMiddleware(BaseHTTPMiddleware):
    """XSS Protection Middleware"""
    
    @staticmethod
    def sanitize_string(value: str) -> str:
        """Sanitize string to prevent XSS"""
        if not isinstance(value, str):
            return value
        
        # HTML escape
        sanitized = html.escape(value)
        
        # Remove potentially dangerous patterns
        dangerous_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
            r'<iframe[^>]*>.*?</iframe>',
            r'<object[^>]*>.*?</object>',
            r'<embed[^>]*>.*?</embed>',
        ]
        
        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE | re.DOTALL)
        
        return sanitized
    
    @staticmethod
    def sanitize_dict(data: dict) -> dict:
        """Recursively sanitize dictionary values"""
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = XSSProtectionMiddleware.sanitize_string(value)
            elif isinstance(value, dict):
                sanitized[key] = XSSProtectionMiddleware.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    XSSProtectionMiddleware.sanitize_string(item) if isinstance(item, str) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        return sanitized
    
    async def dispatch(self, request: Request, call_next):
        # Add XSS protection headers
        response = await call_next(request)
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https:"
        )
        
        return response

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Enhanced Rate Limiting Middleware"""
    
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(deque)
    
    def _cleanup_old_requests(self, identifier: str, current_time: float):
        """Remove old requests outside the time window"""
        cutoff_time = current_time - self.window_seconds
        while self.requests[identifier] and self.requests[identifier][0] < cutoff_time:
            self.requests[identifier].popleft()
    
    def is_rate_limited(self, identifier: str) -> bool:
        """Check if identifier is rate limited"""
        current_time = time.time()
        self._cleanup_old_requests(identifier, current_time)
        
        if len(self.requests[identifier]) >= self.max_requests:
            return True
        
        self.requests[identifier].append(current_time)
        return False
    
    async def dispatch(self, request: Request, call_next):
        # Get identifier (IP or user ID)
        identifier = request.client.host
        if hasattr(request.state, 'user_id'):
            identifier = f"user_{request.state.user_id}"
        
        # Check rate limit
        if self.is_rate_limited(identifier):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {self.max_requests} requests per {self.window_seconds} seconds"
                }
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        current_time = time.time()
        self._cleanup_old_requests(identifier, current_time)
        remaining = max(0, self.max_requests - len(self.requests[identifier]))
        
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(current_time + self.window_seconds))
        
        return response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add comprehensive security headers"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        security_headers = {
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' https:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'"
            )
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response

# Utility functions for request context
def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    # Check for forwarded headers first
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"

def get_user_agent(request: Request) -> str:
    """Get user agent from request"""
    return request.headers.get("User-Agent", "unknown")

def sanitize_input(data: any) -> any:
    """Sanitize input data to prevent XSS"""
    if isinstance(data, str):
        return XSSProtectionMiddleware.sanitize_string(data)
    elif isinstance(data, dict):
        return XSSProtectionMiddleware.sanitize_dict(data)
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    else:
        return data