# WebSocket client examples and testing utilities
# File: websocket_client_examples.py

import asyncio
import websockets
import json
import requests
from datetime import datetime

class HealthcareWebSocketClient:
    """WebSocket client for Healthcare API"""
    
    def __init__(self, base_url="ws://localhost:8000", jwt_token=None):
        self.base_url = base_url
        self.jwt_token = jwt_token
        self.websocket = None
        self.is_connected = False
        
    async def connect(self, endpoint="/api/ws"):
        """Connect to WebSocket endpoint"""
        try:
            uri = f"{self.base_url}{endpoint}?token={self.jwt_token}"
            self.websocket = await websockets.connect(uri)
            self.is_connected = True
            print(f"✅ Connected to {endpoint}")
            
            # Start listening for messages
            asyncio.create_task(self.listen_for_messages())
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            self.is_connected = False
    
    async def disconnect(self):
        """Disconnect from WebSocket"""
        if self.websocket:
            await self.websocket.close()
            self.is_connected = False
            print("🔌 Disconnected from WebSocket")
    
    async def listen_for_messages(self):
        """Listen for incoming messages"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                await self.handle_message(data)
                
        except websockets.exceptions.ConnectionClosed:
            print("🔌 WebSocket connection closed")
            self.is_connected = False
        except Exception as e:
            print(f"❌ Error listening for messages: {e}")
    
    async def handle_message(self, message):
        """Handle incoming WebSocket messages"""
        msg_type = message.get("type")
        data = message.get("data", {})
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        if msg_type == "connection_ack":
            print(f"[{timestamp}] 🔗 Connection acknowledged: {data.get('message')}")
            
        elif msg_type == "upload_progress":
            progress = data.get("progress", 0)
            batch_id = data.get("batch_id", "")[:8]
            msg = data.get("message", "")
            print(f"[{timestamp}] 📤 Upload Progress ({batch_id}): {progress}% - {msg}")
            
        elif msg_type == "upload_complete":
            batch_id = data.get("batch_id", "")[:8]
            total = data.get("total_records", 0)
            successful = data.get("successful_records", 0)
            failed = data.get("failed_records", 0)
            print(f"[{timestamp}] ✅ Upload Complete ({batch_id}): {successful}/{total} successful, {failed} failed")
            
        elif msg_type == "upload_error":
            batch_id = data.get("batch_id", "")[:8]
            error = data.get("error", "")
            print(f"[{timestamp}] ❌ Upload Error ({batch_id}): {error}")
            
        elif msg_type == "patient_created":
            patient_name = data.get("patient_name", "")
            patient_id = data.get("patient_id", "")
            print(f"[{timestamp}] 👤 Patient Created: {patient_name} ({patient_id})")
            
        elif msg_type == "patient_updated":
            patient_name = data.get("patient_name", "")
            patient_id = data.get("patient_id", "")
            print(f"[{timestamp}] ✏️ Patient Updated: {patient_name} ({patient_id})")
            
        elif msg_type == "patient_deleted":
            patient_name = data.get("patient_name", "")
            patient_id = data.get("patient_id", "")
            print(f"[{timestamp}] 🗑️ Patient Deleted: {patient_name} ({patient_id})")
            
        elif msg_type == "audit_log":
            event_type = data.get("event_type", "")
            user_id = data.get("user_id", "")
            print(f"[{timestamp}] 📋 Audit Event: {event_type} by user {user_id}")
            
        elif msg_type == "system_health":
            health_status = data.get("health_status", {})
            overall_status = health_status.get("overall_status", "unknown")
            print(f"[{timestamp}] 🏥 System Health: {overall_status}")
            
        elif msg_type == "notification":
            message_text = data.get("message", "")
            notification_type = data.get("notification_type", "info")
            print(f"[{timestamp}] 🔔 Notification ({notification_type}): {message_text}")
            
        elif msg_type == "heartbeat":
            print(f"[{timestamp}] 💓 Heartbeat received")
            
        elif msg_type == "admin_dashboard":
            activity_summary = data.get("activity_summary", {})
            system_status = data.get("system_status", {})
            alerts = data.get("alerts", [])
            print(f"[{timestamp}] 📊 Admin Dashboard Update:")
            print(f"  - User activities (24h): {activity_summary.get('user_activities_24h', 0)}")
            print(f"  - Memory usage: {system_status.get('memory_percent', 0)}%")
            print(f"  - Active connections: {system_status.get('total_connections', 0)}")
            if alerts:
                print(f"  - Alerts: {len(alerts)} active")
            
        else:
            print(f"[{timestamp}] 📨 Unknown message type: {msg_type}")
    
    async def send_message(self, message):
        """Send message to WebSocket"""
        if self.is_connected and self.websocket:
            await self.websocket.send(json.dumps(message))
        else:
            print("❌ Not connected to WebSocket")
    
    async def ping(self):
        """Send ping message"""
        await self.send_message({"type": "ping"})
    
    async def subscribe_to_audit(self):
        """Subscribe to audit logs (Admin only)"""
        await self.send_message({"type": "subscribe_audit"})
    
    async def subscribe_to_health(self):
        """Subscribe to health updates (Admin only)"""
        await self.send_message({"type": "subscribe_health"})
    
    async def get_patient_count(self):
        """Get current patient count"""
        await self.send_message({"type": "get_patient_count"})
    
    async def get_connection_stats(self):
        """Get connection statistics (Admin only)"""
        await self.send_message({"type": "get_connection_stats"})

def get_jwt_token(username="admin", password="AdminPass123!", base_url="http://localhost:8000"):
    """Get JWT token by logging in"""
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json={"username": username, "password": password}
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"✅ Got JWT token for {username}")
            return token
        else:
            print(f"❌ Login failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting token: {e}")
        return None

# Example usage functions

async def test_manager_websocket():
    """Test WebSocket as a Manager user"""
    print("🧪 Testing Manager WebSocket Connection")
    
    # Get JWT token for manager
    token = get_jwt_token("manager", "Manager123!")
    if not token:
        print("❌ Could not get manager token")
        return
    
    # Connect to WebSocket
    client = HealthcareWebSocketClient(jwt_token=token)
    await client.connect("/api/ws")
    
    if client.is_connected:
        # Send some test messages
        await asyncio.sleep(2)
        await client.ping()
        
        await asyncio.sleep(2)
        await client.get_patient_count()
        
        # Keep connection alive for a while
        print("⏳ Keeping connection alive for 30 seconds...")
        await asyncio.sleep(30)
    
    await client.disconnect()

async def test_admin_websocket():
    """Test WebSocket as an Admin user"""
    print("🧪 Testing Admin WebSocket Connection")
    
    # Get JWT token for admin
    token = get_jwt_token("admin", "AdminPass123!")
    if not token:
        print("❌ Could not get admin token")
        return
    
    # Connect to admin WebSocket
    client = HealthcareWebSocketClient(jwt_token=token)
    await client.connect("/api/ws/admin")
    
    if client.is_connected:
        # Subscribe to admin feeds
        await asyncio.sleep(2)
        await client.subscribe_to_audit()
        
        await asyncio.sleep(2)
        await client.subscribe_to_health()
        
        await asyncio.sleep(2)
        await client.get_connection_stats()
        
        # Keep connection alive for monitoring
        print("⏳ Monitoring admin feed for 60 seconds...")
        await asyncio.sleep(60)
    
    await client.disconnect()

async def test_multiple_connections():
    """Test multiple simultaneous connections"""
    print("🧪 Testing Multiple WebSocket Connections")
    
    # Get tokens
    admin_token = get_jwt_token("admin", "AdminPass123!")
    manager_token = get_jwt_token("manager", "Manager123!")
    
    if not admin_token or not manager_token:
        print("❌ Could not get required tokens")
        return
    
    # Create multiple clients
    admin_client = HealthcareWebSocketClient(jwt_token=admin_token)
    manager_client = HealthcareWebSocketClient(jwt_token=manager_token)
    
    # Connect both
    await admin_client.connect("/api/ws/admin")
    await manager_client.connect("/api/ws")
    
    # Test interactions
    if admin_client.is_connected and manager_client.is_connected:
        print("✅ Both connections established")
        
        # Admin subscribes to monitoring
        await admin_client.subscribe_to_audit()
        await admin_client.subscribe_to_health()
        
        # Manager gets patient count
        await manager_client.get_patient_count()
        
        # Keep both connections alive
        print("⏳ Testing concurrent connections for 30 seconds...")
        await asyncio.sleep(30)
    
    # Disconnect both
    await admin_client.disconnect()
    await manager_client.disconnect()

# Main test runner
async def main():
    """Run WebSocket tests"""
    print("🚀 Starting WebSocket Client Tests")
    print("=" * 50)
    
    # Test individual connections
    await test_manager_websocket()
    print("\n" + "=" * 50)
    
    await test_admin_websocket()
    print("\n" + "=" * 50)
    
    # Test multiple connections
    await test_multiple_connections()
    
    print("\n✅ All WebSocket tests completed!")

if __name__ == "__main__":
    # Run the tests
    asyncio.run(main())

# Frontend JavaScript Example
FRONTEND_JS_EXAMPLE = """
// Frontend JavaScript WebSocket integration example

class HealthcareWebSocketManager {
    constructor(jwtToken) {
        this.jwtToken = jwtToken;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageHandlers = {};
    }
    
    connect() {
        const wsUrl = `ws://localhost:8000/api/ws?token=${this.jwtToken}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = (event) => {
            console.log('✅ WebSocket connected');
            this.reconnectAttempts = 0;
            this.onConnectionOpen(event);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        };
        
        this.ws.onclose = (event) => {
            console.log('🔌 WebSocket disconnected');
            this.onConnectionClose(event);
            this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('⚠️ WebSocket not connected');
        }
    }
    
    handleMessage(message) {
        const { type, data } = message;
        
        // Call registered handlers
        if (this.messageHandlers[type]) {
            this.messageHandlers[type](data);
        }
        
        // Default handlers
        switch (type) {
            case 'upload_progress':
                this.updateUploadProgress(data);
                break;
            case 'upload_complete':
                this.showUploadComplete(data);
                break;
            case 'upload_error':
                this.showUploadError(data);
                break;
            case 'patient_created':
                this.showPatientNotification('created', data);
                break;
            case 'patient_updated':
                this.showPatientNotification('updated', data);
                break;
            case 'patient_deleted':
                this.showPatientNotification('deleted', data);
                break;
            case 'notification':
                this.showNotification(data);
                break;
        }
    }
    
    // Register custom message handlers
    onMessage(type, handler) {
        this.messageHandlers[type] = handler;
    }
    
    // UI update methods
    updateUploadProgress(data) {
        const progressBar = document.getElementById('upload-progress');
        const progressText = document.getElementById('upload-text');
        
        if (progressBar) {
            progressBar.style.width = `${data.progress}%`;
            progressBar.setAttribute('aria-valuenow', data.progress);
        }
        
        if (progressText) {
            progressText.textContent = data.message || `${data.progress}% complete`;
        }
    }
    
    showUploadComplete(data) {
        this.showNotification({
            message: `Upload completed: ${data.successful_records}/${data.total_records} records processed`,
            notification_type: 'success'
        });
        
        // Hide progress bar
        const progressContainer = document.getElementById('upload-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // Refresh patient list
        if (window.refreshPatientList) {
            window.refreshPatientList();
        }
    }
    
    showUploadError(data) {
        this.showNotification({
            message: `Upload failed: ${data.error}`,
            notification_type: 'error'
        });
    }
    
    showPatientNotification(action, data) {
        const message = `Patient ${action}: ${data.patient_name}`;
        this.showNotification({
            message: message,
            notification_type: 'info'
        });
        
        // Refresh patient list
        if (window.refreshPatientList) {
            window.refreshPatientList();
        }
    }
    
    showNotification(data) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${data.notification_type}`;
        notification.textContent = data.message;
        
        // Add to notification container
        const container = document.getElementById('notifications') || document.body;
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`⏳ Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }
    
    onConnectionOpen(event) {
        // Connection established - can send initial messages
        this.send({ type: 'ping' });
    }
    
    onConnectionClose(event) {
        // Handle connection close
        if (event.code !== 1000) {
            console.warn('⚠️ WebSocket closed unexpectedly:', event.code, event.reason);
        }
    }
}

// Usage example:
// const wsManager = new HealthcareWebSocketManager(jwtToken);
// wsManager.connect();
//
// // Custom message handler
// wsManager.onMessage('custom_event', (data) => {
//     console.log('Custom event received:', data);
// });
"""

# Save frontend example to file
with open("frontend_websocket_example.js", "w", encoding='utf-8') as f:
    f.write(FRONTEND_JS_EXAMPLE)

print("Frontend WebSocket example saved to 'frontend_websocket_example.js'")