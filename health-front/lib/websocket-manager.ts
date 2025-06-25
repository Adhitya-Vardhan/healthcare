// WebSocket Manager - Centralized WebSocket connection management
// This prevents multiple WebSocket connections and handles reconnection logic

export interface WebSocketMessage {
  type: string
  data: any
  timestamp?: string
}

type MessageHandler = (message: WebSocketMessage) => void
type ConnectionStateHandler = (isConnected: boolean) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string | null = null
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null
  private messageHandlers: Set<MessageHandler> = new Set()
  private connectionStateHandlers: Set<ConnectionStateHandler> = new Set()
  private isConnecting = false
  private connectionTimeout: NodeJS.Timeout | null = null
  private connectionId = 0

  connect(token: string, isAdmin: boolean = false) {
    const currentConnectionId = ++this.connectionId
    
    console.log(`[WebSocket Manager] Connection attempt ${currentConnectionId} - Admin: ${isAdmin}`)
    
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log(`[WebSocket Manager] Already connecting, skipping attempt ${currentConnectionId}`)
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[WebSocket Manager] Already connected, skipping attempt ${currentConnectionId}`)
      return
    }

    this.token = token
    this.url = isAdmin 
      ? `ws://localhost:8000/api/ws/admin?token=${token}`
      : `ws://localhost:8000/api/ws?token=${token}`

    console.log(`[WebSocket Manager] Creating new connection ${currentConnectionId} to: ${this.url}`)
    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)

      // Set up connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log(`[WebSocket Manager] Connection ${currentConnectionId} timeout`)
          this.ws.close()
        }
      }, 10000) // 10 second timeout

      this.ws.onopen = () => {
        console.log(`[WebSocket Manager] Connection ${currentConnectionId} opened successfully`)
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.notifyConnectionState(true)
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log(`[WebSocket Manager] Received message:`, message.type, message.data)
          this.notifyMessageHandlers(message)
        } catch (error) {
          console.error("[WebSocket Manager] Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onclose = (event) => {
        console.log(`[WebSocket Manager] Connection ${currentConnectionId} closed - Code: ${event.code}, Reason: ${event.reason}`)
        this.isConnecting = false
        this.notifyConnectionState(false)
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }

        // Only attempt to reconnect if it wasn't a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log("[WebSocket Manager] Max reconnection attempts reached")
        }
      }

      this.ws.onerror = (error) => {
        console.error(`[WebSocket Manager] Connection ${currentConnectionId} error:`, error)
        this.isConnecting = false
        this.notifyConnectionState(false)
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }
      }

    } catch (error) {
      console.error(`[WebSocket Manager] Failed to create connection ${currentConnectionId}:`, error)
      this.isConnecting = false
      this.notifyConnectionState(false)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000) // Max 30 second delay
    console.log(`[WebSocket Manager] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++
      if (this.token) {
        this.connect(this.token, this.url?.includes('/admin') || false)
      }
    }, delay)
  }

  disconnect() {
    console.log("[WebSocket Manager] Disconnecting")
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnecting = false
    this.notifyConnectionState(false)
  }

  addMessageHandler(handler: MessageHandler) {
    console.log("[WebSocket Manager] Adding message handler")
    this.messageHandlers.add(handler)
  }

  removeMessageHandler(handler: MessageHandler) {
    console.log("[WebSocket Manager] Removing message handler")
    this.messageHandlers.delete(handler)
  }

  addConnectionStateHandler(handler: ConnectionStateHandler) {
    console.log("[WebSocket Manager] Adding connection state handler")
    this.connectionStateHandlers.add(handler)
  }

  removeConnectionStateHandler(handler: ConnectionStateHandler) {
    console.log("[WebSocket Manager] Removing connection state handler")
    this.connectionStateHandlers.delete(handler)
  }

  private notifyMessageHandlers(message: WebSocketMessage) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error("[WebSocket Manager] Error in message handler:", error)
      }
    })
  }

  private notifyConnectionState(isConnected: boolean) {
    console.log(`[WebSocket Manager] Notifying connection state: ${isConnected}`)
    this.connectionStateHandlers.forEach(handler => {
      try {
        handler(isConnected)
      } catch (error) {
        console.error("[WebSocket Manager] Error in connection state handler:", error)
      }
    })
  }

  getConnectionState(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("[WebSocket Manager] Sending message:", message)
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("[WebSocket Manager] Cannot send message: WebSocket is not connected")
    }
  }
}

// Create a singleton instance
export const websocketManager = new WebSocketManager() 