#!/usr/bin/env python3
"""
Simple WebSocket test script to verify connection functionality
"""

import asyncio
import websockets
import json
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_websocket_connection():
    """Test WebSocket connection and basic functionality"""
    
    # You'll need to get a valid JWT token first
    # This is just a test - replace with actual token
    test_token = "your_jwt_token_here"
    
    uri = f"ws://localhost:8000/ws?token={test_token}"
    
    try:
        print("🔗 Attempting to connect to WebSocket...")
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Wait for connection acknowledgment
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📨 Received: {data}")
            
            # Send a ping message
            ping_message = {
                "type": "ping",
                "data": {}
            }
            await websocket.send(json.dumps(ping_message))
            print("📤 Sent ping message")
            
            # Wait for pong response
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📨 Received pong: {data}")
            
            # Test subscription (if admin)
            subscribe_message = {
                "type": "subscribe_health",
                "data": {}
            }
            await websocket.send(json.dumps(subscribe_message))
            print("📤 Sent health subscription request")
            
            # Wait for subscription response
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📨 Received subscription response: {data}")
            
            # Keep connection alive for a few seconds
            print("⏳ Keeping connection alive for 5 seconds...")
            await asyncio.sleep(5)
            
            print("✅ WebSocket test completed successfully!")
            
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ WebSocket connection failed with status code: {e.status_code}")
        if e.status_code == 4001:
            print("   This indicates an authentication error - check your JWT token")
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")

if __name__ == "__main__":
    print("🧪 Starting WebSocket connection test...")
    asyncio.run(test_websocket_connection()) 