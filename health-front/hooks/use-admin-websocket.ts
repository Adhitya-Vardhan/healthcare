"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { websocketManager, WebSocketMessage as BaseWebSocketMessage } from "@/lib/websocket-manager"
import type { AuditLog, SystemHealth } from "@/lib/audit-types"

export interface AdminWebSocketMessage extends BaseWebSocketMessage {
  type: "audit_log" | "system_health" | "security_alert" | "user_activity"
}

export function useAdminWebSocket() {
  const { token } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<AdminWebSocketMessage | null>(null)
  const [newAuditLog, setNewAuditLog] = useState<AuditLog | null>(null)
  const [healthUpdate, setHealthUpdate] = useState<SystemHealth | null>(null)
  const componentMountedRef = useRef(true)

  const handleMessage = useCallback((message: BaseWebSocketMessage) => {
    console.log(`[useAdminWebSocket] Received message:`, message.type)
    if (componentMountedRef.current) {
      // Only handle admin-specific messages
      if (message.type === "audit_log" || message.type === "system_health" || 
          message.type === "security_alert" || message.type === "user_activity") {
        console.log(`[useAdminWebSocket] Processing message:`, message.type)
        setLastMessage(message as AdminWebSocketMessage)

        // Handle specific message types
        switch (message.type) {
          case "audit_log":
            setNewAuditLog(message.data as AuditLog)
            break
          case "system_health":
            setHealthUpdate(message.data as SystemHealth)
            break
        }
      }
    }
  }, [])

  const handleConnectionState = useCallback((connected: boolean) => {
    console.log(`[useAdminWebSocket] Connection state changed:`, connected)
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
    newAuditLog,
    healthUpdate,
    connect: () => {}, // No-op since we don't manage connections
    disconnect: () => {}, // No-op since we don't manage connections
  }
}
