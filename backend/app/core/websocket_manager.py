# WebSocket connection manager and utilities
# File: app/core/websocket_manager.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set, Optional, Any
import json
import asyncio
from datetime import datetime
import uuid
from enum import Enum

class MessageType(str, Enum):
    """WebSocket message types"""
    UPLOAD_PROGRESS = "upload_progress"
    UPLOAD_COMPLETE = "upload_complete"
    UPLOAD_ERROR = "upload_error"
    PATIENT_CREATED = "patient_created"
    PATIENT_UPDATED = "patient_updated"
    PATIENT_DELETED = "patient_deleted"
    AUDIT_LOG = "audit_log"
    SYSTEM_HEALTH = "system_health"
    NOTIFICATION = "notification"
    HEARTBEAT = "heartbeat"
    CONNECTION_ACK = "connection_ack"
    ERROR = "error"

class ConnectionManager:
    """Manages WebSocket connections with user authentication and room support"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, dict] = {}
        # Room-based connections (for group notifications)
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # Connection ID mapping
        self.connection_ids: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int, user_role: str, connection_id: str = None):
        """Accept WebSocket connection and store user info"""
        try:
            # Note: websocket.accept() is called in the endpoint before this method
            # so we don't need to call it again here
            
            # Generate connection ID if not provided
            if not connection_id:
                connection_id = str(uuid.uuid4())
            
            # Store connection
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            
            self.active_connections[user_id].append(websocket)
            self.connection_ids[connection_id] = websocket
            
            # Store metadata
            self.connection_metadata[websocket] = {
                "user_id": user_id,
                "user_role": user_role,
                "connection_id": connection_id,
                "connected_at": datetime.utcnow(),
                "last_ping": datetime.utcnow()
            }
            
            # Add to appropriate rooms based on role
            await self.join_room(websocket, f"user_{user_id}")
            await self.join_room(websocket, f"role_{user_role.lower()}")
            
            # Send connection acknowledgment
            await self.send_personal_message({
                "type": MessageType.CONNECTION_ACK,
                "data": {
                    "connection_id": connection_id,
                    "message": "Connected successfully",
                    "timestamp": datetime.utcnow().isoformat()
                }
            }, websocket)
            
            print(f"🔗 WebSocket connected: User {user_id} ({user_role}) - Connection {connection_id}")
            
        except Exception as e:
            print(f"❌ Error during WebSocket connection: {e}")
            # Try to close the connection if it was partially established
            try:
                await websocket.close(code=1011, reason="Internal server error")
            except:
                pass
            raise
    
    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.connection_metadata:
            metadata = self.connection_metadata[websocket]
            user_id = metadata["user_id"]
            connection_id = metadata["connection_id"]
            
            # Remove from user connections
            if user_id in self.active_connections:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove from rooms
            for room_connections in self.rooms.values():
                room_connections.discard(websocket)
            
            # Remove metadata
            del self.connection_metadata[websocket]
            
            # Remove connection ID mapping
            if connection_id in self.connection_ids:
                del self.connection_ids[connection_id]
            
            print(f"🔌 WebSocket disconnected: User {user_id} - Connection {connection_id}")
    
    async def join_room(self, websocket: WebSocket, room_name: str):
        """Add connection to a room"""
        if room_name not in self.rooms:
            self.rooms[room_name] = set()
        self.rooms[room_name].add(websocket)
    
    async def leave_room(self, websocket: WebSocket, room_name: str):
        """Remove connection from a room"""
        if room_name in self.rooms:
            self.rooms[room_name].discard(websocket)
            if not self.rooms[room_name]:
                del self.rooms[room_name]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific WebSocket connection"""
        try:
            if websocket.client_state.value == 1:  # Check if connection is still open
                await websocket.send_text(json.dumps(message, default=str))
            else:
                print(f"⚠️ WebSocket connection is closed, removing from manager")
                await self.disconnect(websocket)
        except Exception as e:
            print(f"❌ Error sending message to WebSocket: {e}")
            await self.disconnect(websocket)
    
    async def send_to_user(self, message: dict, user_id: int):
        """Send message to all connections of a specific user"""
        if user_id in self.active_connections:
            disconnected_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    if connection.client_state.value == 1:  # Check if connection is still open
                        await connection.send_text(json.dumps(message, default=str))
                    else:
                        disconnected_connections.append(connection)
                except Exception as e:
                    print(f"❌ Error sending to user {user_id}: {e}")
                    disconnected_connections.append(connection)
            
            # Clean up disconnected connections
            for connection in disconnected_connections:
                await self.disconnect(connection)
    
    async def send_to_room(self, message: dict, room_name: str):
        """Send message to all connections in a room"""
        if room_name in self.rooms:
            disconnected_connections = []
            for connection in self.rooms[room_name].copy():
                try:
                    if connection.client_state.value == 1:  # Check if connection is still open
                        await connection.send_text(json.dumps(message, default=str))
                    else:
                        disconnected_connections.append(connection)
                except Exception as e:
                    print(f"❌ Error sending to room {room_name}: {e}")
                    disconnected_connections.append(connection)
            
            # Clean up disconnected connections
            for connection in disconnected_connections:
                await self.disconnect(connection)
    
    async def broadcast_to_role(self, message: dict, role: str):
        """Send message to all users with specific role"""
        await self.send_to_room(message, f"role_{role.lower()}")
    
    async def broadcast_to_all(self, message: dict):
        """Send message to all connected users"""
        all_connections = []
        for connections in self.active_connections.values():
            all_connections.extend(connections)
        
        disconnected_connections = []
        for connection in all_connections:
            try:
                if connection.client_state.value == 1:  # Check if connection is still open
                    await connection.send_text(json.dumps(message, default=str))
                else:
                    disconnected_connections.append(connection)
            except Exception as e:
                print(f"❌ Error broadcasting: {e}")
                disconnected_connections.append(connection)
        
        # Clean up disconnected connections
        for connection in disconnected_connections:
            await self.disconnect(connection)
    
    def get_user_connections(self, user_id: int) -> List[WebSocket]:
        """Get all connections for a user"""
        return self.active_connections.get(user_id, [])
    
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(len(connections) for connections in self.active_connections.values())
    
    def get_user_count(self) -> int:
        """Get number of unique connected users"""
        return len(self.active_connections)
    
    def is_user_connected(self, user_id: int) -> bool:
        """Check if user has any active connections"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0
    
    async def send_heartbeat(self):
        """Send heartbeat to all connections"""
        heartbeat_message = {
            "type": MessageType.HEARTBEAT,
            "data": {
                "timestamp": datetime.utcnow().isoformat(),
                "server_time": datetime.utcnow().isoformat()
            }
        }
        await self.broadcast_to_all(heartbeat_message)
    
    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_connections": self.get_connection_count(),
            "unique_users": self.get_user_count(),
            "rooms": len(self.rooms),
            "connections_by_role": {
                room.replace("role_", ""): len(connections) 
                for room, connections in self.rooms.items() 
                if room.startswith("role_")
            }
        }

# Global connection manager instance
connection_manager = ConnectionManager()

class WebSocketNotifier:
    """High-level notification service using WebSocket manager"""
    
    @staticmethod
    async def notify_upload_progress(user_id: int, batch_id: str, progress: int, message: str = ""):
        """Send upload progress notification"""
        notification = {
            "type": MessageType.UPLOAD_PROGRESS,
            "data": {
                "batch_id": batch_id,
                "progress": progress,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await connection_manager.send_to_user(notification, user_id)
    
    @staticmethod
    async def notify_upload_complete(user_id: int, batch_id: str, total_records: int, successful: int, failed: int):
        """Send upload completion notification"""
        notification = {
            "type": MessageType.UPLOAD_COMPLETE,
            "data": {
                "batch_id": batch_id,
                "total_records": total_records,
                "successful_records": successful,
                "failed_records": failed,
                "success_rate": round((successful / total_records * 100), 1) if total_records > 0 else 0,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await connection_manager.send_to_user(notification, user_id)
    
    @staticmethod
    async def notify_upload_error(user_id: int, batch_id: str, error_message: str):
        """Send upload error notification"""
        notification = {
            "type": MessageType.UPLOAD_ERROR,
            "data": {
                "batch_id": batch_id,
                "error": error_message,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await connection_manager.send_to_user(notification, user_id)
    
    @staticmethod
    async def notify_patient_created(user_id: int, patient_id: str, patient_name: str):
        """Send patient creation notification"""
        notification = {
            "type": MessageType.PATIENT_CREATED,
            "data": {
                "patient_id": patient_id,
                "patient_name": patient_name,
                "message": f"New patient {patient_name} added successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await connection_manager.send_to_user(notification, user_id)
    
    @staticmethod
    async def notify_patient_updated(user_id: int, patient_id: str, patient_name: str):
        """Send patient update notification"""
        notification = {
            "type": MessageType.PATIENT_UPDATED,
            "data": {
                "patient_id": patient_id,
                "patient_name": patient_name,
                "message": f"Patient {patient_name} updated successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await connection_manager.send_to_user(notification, user_id)
    
    @staticmethod
    async def notify_patient_deleted(user_id: int, patient_id: str, patient_name: str):
        """Send patient deletion notification"""
        notification = {
            "type": MessageType.PATIENT_DELETED,
            "data": {
                "patient_id": patient_id,
                "patient_name": patient_name,
                "message": f"Patient {patient_name} deleted successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await connection_manager.send_to_user(notification, user_id)
    
    @staticmethod
    async def notify_audit_event(event_type: str, user_id: int, details: dict):
        """Send audit event notification to admins"""
        notification = {
            "type": MessageType.AUDIT_LOG,
            "data": {
                "event_type": event_type,
                "user_id": user_id,
                "details": details,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        # Send to admins only
        await connection_manager.broadcast_to_role(notification, "Admin")
    
    @staticmethod
    async def notify_system_health(health_data: dict):
        """Send system health update to admins"""
        notification = {
            "type": MessageType.SYSTEM_HEALTH,
            "data": {
                "health_status": health_data,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        # Send to admins only
        await connection_manager.broadcast_to_role(notification, "Admin")
    
    @staticmethod
    async def send_custom_notification(user_id: int, message: str, notification_type: str = "info"):
        """Send custom notification to user"""
        notification = {
            "type": MessageType.NOTIFICATION,
            "data": {
                "message": message,
                "notification_type": notification_type,  # info, success, warning, error
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await connection_manager.send_to_user(notification, user_id)

# Export notifier instance
websocket_notifier = WebSocketNotifier()