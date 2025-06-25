# WebSocket API endpoints
# File: app/api/websockets.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.core.websocket_manager import connection_manager, websocket_notifier, MessageType
from app.core.security import verify_token
from app.models.models import User, UserAuditLog, EncryptionAuditLog, Patient
from app.utils.encryption import encryption_service
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional
import psutil

router = APIRouter()

async def get_user_from_token(token: str, db: Session) -> Optional[User]:
    """Get user from JWT token for WebSocket authentication"""
    try:
        token_data = verify_token(token)
        if not token_data:
            return None
        
        user = db.query(User).filter(User.id == token_data.get("user_id")).first()
        return user
    except Exception:
        return None

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
    connection_id: Optional[str] = Query(None, description="Optional connection identifier")
):
    """Main WebSocket endpoint for real-time communication"""
    db = next(get_db())
    user = None
    
    try:
        # Authenticate user
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4001, reason="Invalid authentication token")
            return
        
        # Connect user
        await connection_manager.connect(websocket, user.id, user.role.name, connection_id)
        
        # Log connection
        await websocket_notifier.notify_audit_event(
            "websocket_connect",
            user.id,
            {"connection_id": connection_id, "user_role": user.role.name}
        )
        
        # Keep connection alive and handle messages
        while True:
            try:
                # Wait for message with timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(websocket, user, message, db)
                
            except asyncio.TimeoutError:
                # Send heartbeat on timeout
                await connection_manager.send_personal_message({
                    "type": MessageType.HEARTBEAT,
                    "data": {"timestamp": datetime.utcnow().isoformat()}
                }, websocket)
                
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
        if user:
            await websocket_notifier.notify_audit_event(
                "websocket_disconnect",
                user.id,
                {"connection_id": connection_id}
            )
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        await connection_manager.disconnect(websocket)
    finally:
        db.close()

async def handle_websocket_message(websocket: WebSocket, user: User, message: dict, db: Session):
    """Handle incoming WebSocket messages"""
    message_type = message.get("type")
    data = message.get("data", {})
    
    try:
        if message_type == "ping":
            # Respond to ping with pong
            await connection_manager.send_personal_message({
                "type": "pong",
                "data": {"timestamp": datetime.utcnow().isoformat()}
            }, websocket)
            
        elif message_type == "subscribe_audit":
            # Subscribe to audit logs (Admin only)
            if user.role.name == "Admin":
                await connection_manager.join_room(websocket, "audit_subscribers")
                await connection_manager.send_personal_message({
                    "type": "subscription_ack",
                    "data": {"subscription": "audit_logs", "status": "subscribed"}
                }, websocket)
            else:
                await connection_manager.send_personal_message({
                    "type": "error",
                    "data": {"message": "Access denied: Admin role required"}
                }, websocket)
                
        elif message_type == "subscribe_health":
            # Subscribe to system health updates (Admin only)
            if user.role.name == "Admin":
                await connection_manager.join_room(websocket, "health_subscribers")
                await connection_manager.send_personal_message({
                    "type": "subscription_ack",
                    "data": {"subscription": "system_health", "status": "subscribed"}
                }, websocket)
                # Send current health status
                await send_current_health_status(websocket, db)
            else:
                await connection_manager.send_personal_message({
                    "type": "error",
                    "data": {"message": "Access denied: Admin role required"}
                }, websocket)
                
        elif message_type == "get_patient_count":
            # Get real-time patient count for user
            if user.role.name == "Manager":
                count = db.query(Patient).filter(Patient.uploaded_by == user.id).count()
                await connection_manager.send_personal_message({
                    "type": "patient_count",
                    "data": {"count": count, "timestamp": datetime.utcnow().isoformat()}
                }, websocket)
                
        elif message_type == "get_connection_stats":
            # Get connection statistics (Admin only)
            if user.role.name == "Admin":
                stats = connection_manager.get_connection_stats()
                await connection_manager.send_personal_message({
                    "type": "connection_stats",
                    "data": stats
                }, websocket)
                
        else:
            await connection_manager.send_personal_message({
                "type": "error",
                "data": {"message": f"Unknown message type: {message_type}"}
            }, websocket)
            
    except Exception as e:
        await connection_manager.send_personal_message({
            "type": "error",
            "data": {"message": f"Error processing message: {str(e)}"}
        }, websocket)

async def send_current_health_status(websocket: WebSocket, db: Session):
    """Send current system health status"""
    try:
        # Get system metrics
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Get database metrics
        total_patients = db.query(Patient).count()
        total_users = db.query(User).count()
        
        # Check recent encryption failures
        last_hour = datetime.utcnow() - timedelta(hours=1)
        recent_failures = db.query(EncryptionAuditLog).filter(
            EncryptionAuditLog.timestamp >= last_hour,
            EncryptionAuditLog.success == False
        ).count()
        
        health_data = {
            "overall_status": "healthy" if recent_failures < 10 else "degraded",
            "system_metrics": {
                "memory_usage_percent": round(memory.percent, 1),
                "cpu_usage_percent": round(cpu_percent, 1),
                "memory_used_gb": round(memory.used / 1024 / 1024 / 1024, 2),
                "memory_total_gb": round(memory.total / 1024 / 1024 / 1024, 2)
            },
            "database_metrics": {
                "total_patients": total_patients,
                "total_users": total_users,
                "recent_encryption_failures": recent_failures
            },
            "connection_metrics": connection_manager.get_connection_stats(),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await connection_manager.send_personal_message({
            "type": MessageType.SYSTEM_HEALTH,
            "data": health_data
        }, websocket)
        
    except Exception as e:
        print(f"❌ Error sending health status: {e}")

@router.websocket("/ws/admin")
async def admin_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token")
):
    """Dedicated WebSocket endpoint for admin real-time monitoring"""
    db = next(get_db())
    user = None
    
    try:
        # Authenticate admin user
        user = await get_user_from_token(token, db)
        if not user or user.role.name != "Admin":
            await websocket.close(code=4003, reason="Admin access required")
            return
        
        # Connect admin
        await connection_manager.connect(websocket, user.id, user.role.name)
        
        # Auto-subscribe to admin feeds
        await connection_manager.join_room(websocket, "audit_subscribers")
        await connection_manager.join_room(websocket, "health_subscribers")
        
        # Send initial data
        await send_admin_dashboard_data(websocket, db)
        
        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                await handle_admin_message(websocket, user, message, db)
                
            except asyncio.TimeoutError:
                # Send periodic updates
                await send_admin_dashboard_data(websocket, db)
                
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
    except Exception as e:
        print(f"❌ Admin WebSocket error: {e}")
        await connection_manager.disconnect(websocket)
    finally:
        db.close()

async def send_admin_dashboard_data(websocket: WebSocket, db: Session):
    """Send comprehensive admin dashboard data"""
    try:
        # Recent activity (last 24 hours)
        last_24h = datetime.utcnow() - timedelta(hours=24)
        
        recent_user_activity = db.query(UserAuditLog).filter(
            UserAuditLog.timestamp >= last_24h
        ).count()
        
        recent_encryption_activity = db.query(EncryptionAuditLog).filter(
            EncryptionAuditLog.timestamp >= last_24h
        ).count()
        
        # Failed activities
        failed_logins = db.query(UserAuditLog).filter(
            UserAuditLog.action == "login_failed",
            UserAuditLog.timestamp >= last_24h
        ).count()
        
        encryption_failures = db.query(EncryptionAuditLog).filter(
            EncryptionAuditLog.success == False,
            EncryptionAuditLog.timestamp >= last_24h
        ).count()
        
        # System status
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        dashboard_data = {
            "activity_summary": {
                "user_activities_24h": recent_user_activity,
                "encryption_operations_24h": recent_encryption_activity,
                "failed_logins_24h": failed_logins,
                "encryption_failures_24h": encryption_failures
            },
            "system_status": {
                "memory_percent": round(memory.percent, 1),
                "cpu_percent": round(cpu_percent, 1),
                "total_connections": connection_manager.get_connection_count(),
                "unique_users_online": connection_manager.get_user_count()
            },
            "alerts": [],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add alerts based on thresholds
        if failed_logins > 10:
            dashboard_data["alerts"].append({
                "type": "security",
                "severity": "high",
                "message": f"{failed_logins} failed login attempts in last 24 hours"
            })
        
        if encryption_failures > 5:
            dashboard_data["alerts"].append({
                "type": "system",
                "severity": "medium", 
                "message": f"{encryption_failures} encryption failures in last 24 hours"
            })
        
        if memory.percent > 85:
            dashboard_data["alerts"].append({
                "type": "system",
                "severity": "high",
                "message": f"High memory usage: {memory.percent}%"
            })
        
        await connection_manager.send_personal_message({
            "type": "admin_dashboard",
            "data": dashboard_data
        }, websocket)
        
    except Exception as e:
        print(f"❌ Error sending admin dashboard data: {e}")

async def handle_admin_message(websocket: WebSocket, user: User, message: dict, db: Session):
    """Handle admin-specific WebSocket messages"""
    message_type = message.get("type")
    
    if message_type == "get_live_audit":
        # Get recent audit entries
        recent_entries = db.query(UserAuditLog).order_by(
            UserAuditLog.timestamp.desc()
        ).limit(10).all()
        
        audit_data = [
            {
                "id": entry.id,
                "user_id": entry.user_id,
                "action": entry.action,
                "timestamp": entry.timestamp.isoformat(),
                "ip_address": entry.ip_address
            }
            for entry in recent_entries
        ]
        
        await connection_manager.send_personal_message({
            "type": "live_audit_data",
            "data": {"entries": audit_data}
        }, websocket)
        
    elif message_type == "trigger_health_check":
        # Trigger immediate health check
        await send_current_health_status(websocket, db)

# Background task for periodic updates
async def periodic_admin_updates():
    """Background task to send periodic updates to admin subscribers"""
    while True:
        try:
            await asyncio.sleep(30)  # Update every 30 seconds
            
            # Send to health subscribers
            if "health_subscribers" in connection_manager.rooms:
                db = next(get_db())
                try:
                    for websocket in connection_manager.rooms["health_subscribers"]:
                        await send_current_health_status(websocket, db)
                finally:
                    db.close()
                    
        except Exception as e:
            print(f"❌ Error in periodic admin updates: {e}")
            await asyncio.sleep(60)  # Wait longer on error