"use client"

import { useState } from "react"
import { Bell, Check, Trash2, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWebSocketNotifications } from "@/hooks/use-websocket-notifications"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const { isConnected, notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } =
    useWebSocketNotifications()

  const [isOpen, setIsOpen] = useState(false)

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅"
      case "error":
        return "❌"
      case "warning":
        return "⚠️"
      default:
        return "ℹ️"
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-600" title="Connected" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" title="Disconnected" />
        )}
        <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
      </div>

      {/* Notification Bell */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between p-2">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 px-2 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearNotifications} className="h-6 px-2 text-xs">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No notifications yet</div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 hover:bg-slate-50 cursor-pointer border-l-4 transition-colors",
                      notification.read ? "opacity-60" : "bg-blue-50/50",
                      {
                        "border-l-green-500": notification.type === "success",
                        "border-l-red-500": notification.type === "error",
                        "border-l-yellow-500": notification.type === "warning",
                        "border-l-blue-500": notification.type === "info",
                      },
                    )}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900 truncate">{notification.title}</p>
                          <span className="text-xs text-slate-500 ml-2">{formatTime(notification.timestamp)}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notification.message}</p>
                        {!notification.read && <div className="h-2 w-2 bg-blue-500 rounded-full mt-2" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
