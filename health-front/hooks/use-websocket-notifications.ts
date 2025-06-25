"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast"
import { websocketManager, WebSocketMessage as BaseWebSocketMessage } from "@/lib/websocket-manager"

export interface WebSocketNotification extends BaseWebSocketMessage {
  type: "connection_ack" | "upload_progress" | "patient_created" | "notification" | "admin_dashboard" | "error"
}

export interface NotificationItem {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  message: string
  timestamp: Date
  read: boolean
}

export function useWebSocketNotifications() {
  const { token, user } = useAuth()
  const { addToast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const messageQueueRef = useRef<WebSocketNotification[]>([])
  const componentMountedRef = useRef(true)

  const addNotification = useCallback(
    (notification: Omit<NotificationItem, "id" | "timestamp" | "read">) => {
      const newNotification: NotificationItem = {
        ...notification,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        read: false,
      }

      setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]) // Keep last 50 notifications
      setUnreadCount((prev) => prev + 1)

      // Show toast for important notifications
      if (notification.type === "error" || notification.type === "warning") {
        addToast({
          type: notification.type,
          title: notification.title,
          description: notification.message,
          duration: notification.type === "error" ? 8000 : 5000,
        })
      }
    },
    [addToast],
  )

  const processMessage = useCallback(
    (message: WebSocketNotification, isQueuedMessage = false) => {
      switch (message.type) {
        case "connection_ack":
          console.log("WebSocket connected:", message.data.message)
          setIsConnected(true)

          // Process queued messages without recursion
          if (!isQueuedMessage) {
            messageQueueRef.current.forEach((queuedMessage) => {
              // Process queued messages directly without calling processMessage recursively
              switch (queuedMessage.type) {
                case "upload_progress":
                  addToast({
                    type: "info",
                    title: "Upload Progress",
                    description: queuedMessage.data.message,
                    duration: 3000,
                  })
                  break

                case "patient_created":
                  addNotification({
                    type: "success",
                    title: "Patient Added",
                    message: `${queuedMessage.data.patient_name} (${queuedMessage.data.patient_id}) has been added successfully`,
                  })
                  break

                case "notification":
                  const notificationType = queuedMessage.data.notification_type || "info"
                  addNotification({
                    type: notificationType,
                    title: "System Notification",
                    message: queuedMessage.data.message,
                  })
                  break

                case "admin_dashboard":
                  if (user?.role === "Admin") {
                    addNotification({
                      type: "info",
                      title: "Dashboard Update",
                      message: `${queuedMessage.data.activity_summary.user_activities_24h} user activities in last 24h`,
                    })
                  }
                  break

                case "error":
                  addNotification({
                    type: "error",
                    title: "System Error",
                    message: queuedMessage.data.message || "An error occurred",
                  })
                  break

                default:
                  console.log("Unknown queued message type:", queuedMessage.type)
              }
            })
            messageQueueRef.current = []
          }
          break

        case "upload_progress":
          // Don't add to notifications, just show toast
          addToast({
            type: "info",
            title: "Upload Progress",
            description: message.data.message,
            duration: 3000,
          })
          break

        case "patient_created":
          addNotification({
            type: "success",
            title: "Patient Added",
            message: `${message.data.patient_name} (${message.data.patient_id}) has been added successfully`,
          })
          break

        case "notification":
          const notificationType = message.data.notification_type || "info"
          addNotification({
            type: notificationType,
            title: "System Notification",
            message: message.data.message,
          })
          break

        case "admin_dashboard":
          if (user?.role === "Admin") {
            addNotification({
              type: "info",
              title: "Dashboard Update",
              message: `${message.data.activity_summary.user_activities_24h} user activities in last 24h`,
            })
          }
          break

        case "error":
          addNotification({
            type: "error",
            title: "System Error",
            message: message.data.message || "An error occurred",
          })
          break

        default:
          console.log("Unknown message type:", message.type)
      }
    },
    [addNotification, addToast, user?.role],
  )

  const handleMessage = useCallback((message: BaseWebSocketMessage) => {
    console.log(`[useWebSocketNotifications] Received message:`, message.type)
    if (componentMountedRef.current) {
      if (isConnected) {
        processMessage(message as WebSocketNotification)
      } else {
        // Queue messages until connection is acknowledged
        console.log(`[useWebSocketNotifications] Queueing message:`, message.type)
        messageQueueRef.current.push(message as WebSocketNotification)
      }
    }
  }, [isConnected, processMessage])

  const handleConnectionState = useCallback((connected: boolean) => {
    console.log(`[useWebSocketNotifications] Connection state changed:`, connected)
    if (componentMountedRef.current) {
      setIsConnected(connected)
    }
  }, [])

  const connect = useCallback(() => {
    if (!token || !user) return

    console.log(`[useWebSocketNotifications] Connecting - User role:`, user.role)
    // Connect using the centralized manager
    websocketManager.connect(token, user.role === "Admin")
  }, [token, user])

  const disconnect = useCallback(() => {
    // The manager will handle disconnection when no more components are using it
  }, [])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
    setUnreadCount(0)
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    componentMountedRef.current = true
    
    if (token && user) {
      connect()
    }

    // Register handlers with the manager
    websocketManager.addMessageHandler(handleMessage)
    websocketManager.addConnectionStateHandler(handleConnectionState)

    return () => {
      componentMountedRef.current = false
      
      // Remove handlers from the manager
      websocketManager.removeMessageHandler(handleMessage)
      websocketManager.removeConnectionStateHandler(handleConnectionState)
    }
  }, [token, user, connect, handleMessage, handleConnectionState])

  return {
    isConnected,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  }
}
