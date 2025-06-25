"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { websocketManager, WebSocketMessage as BaseWebSocketMessage } from "@/lib/websocket-manager"

export interface UploadWebSocketMessage extends BaseWebSocketMessage {
  type: "upload_progress" | "upload_complete" | "error"
}

export interface UploadProgress {
  batch_id: string
  progress: number
  message: string
}

export interface UploadComplete {
  batch_id: string
  total_records: number
  successful_records: number
  failed_records: number
  success_rate: number
  error_details?: Array<{
    row: number
    errors: string[]
  }>
}

export function useWebSocket() {
  const { token } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<UploadWebSocketMessage | null>(null)
  const componentMountedRef = useRef(true)

  const handleMessage = useCallback((message: BaseWebSocketMessage) => {
    console.log(`[useWebSocket] Received message:`, message.type)
    if (componentMountedRef.current) {
      // Only handle messages that are relevant to this hook
      if (message.type === "upload_progress" || message.type === "upload_complete" || message.type === "error") {
        console.log(`[useWebSocket] Processing message:`, message.type)
        setLastMessage(message as UploadWebSocketMessage)
      }
    }
  }, [])

  const handleConnectionState = useCallback((connected: boolean) => {
    console.log(`[useWebSocket] Connection state changed:`, connected)
    if (componentMountedRef.current) {
      setIsConnected(connected)
    }
  }, [])

  useEffect(() => {
    componentMountedRef.current = true
    
    // Register handlers with the manager
    websocketManager.addMessageHandler(handleMessage)
    websocketManager.addConnectionStateHandler(handleConnectionState)

    return () => {
      componentMountedRef.current = false
      
      // Remove handlers from the manager
      websocketManager.removeMessageHandler(handleMessage)
      websocketManager.removeConnectionStateHandler(handleConnectionState)
    }
  }, [handleMessage, handleConnectionState])

  return {
    isConnected,
    lastMessage,
    connect: () => {}, // No-op since we don't manage connections
    disconnect: () => {}, // No-op since we don't manage connections
  }
}
