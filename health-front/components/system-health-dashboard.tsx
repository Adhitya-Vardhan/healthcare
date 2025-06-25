"use client"

import { useState } from "react"
import type { SystemHealth, SecurityReport } from "@/lib/audit-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Database,
  Shield,
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SystemHealthDashboardProps {
  health: SystemHealth | null
  securityReport: SecurityReport | null
  isLoading?: boolean
  lastUpdated?: Date
}

export function SystemHealthDashboard({ health, securityReport, isLoading, lastUpdated }: SystemHealthDashboardProps) {
  const [trends, setTrends] = useState<{
    cpu: "up" | "down" | "stable"
    memory: "up" | "down" | "stable"
  }>({
    cpu: "stable",
    memory: "stable",
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "operational":
        return "text-green-600"
      case "warning":
      case "slow":
      case "degraded":
        return "text-yellow-600"
      case "critical":
      case "disconnected":
      case "failed":
        return "text-red-600"
      default:
        return "text-slate-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "operational":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "warning":
      case "slow":
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "critical":
      case "disconnected":
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-slate-600" />
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-red-500" />
      case "down":
        return <TrendingDown className="h-3 w-3 text-green-500" />
      default:
        return <Minus className="h-3 w-3 text-slate-400" />
    }
  }

  const formatUptime = (hours: number) => {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours.toFixed(1)}h`
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-slate-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-3 bg-slate-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!health) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>Failed to load system health data</AlertDescription>
      </Alert>
    )
  }

  // Add safety checks for health properties
  const status = health.status || "unknown"
  const system = health.system || {
    cpu_percent: 0,
    memory_percent: 0,
    memory_used_gb: 0,
    disk_usage_percent: 0,
    uptime_hours: 0
  }
  const database = health.database || {
    status: "unknown",
    total_users: 0,
    total_patients: 0,
    response_time_ms: 0
  }
  const encryption = health.encryption || {
    status: "unknown",
    active_key_version: "N/A",
    operations_per_minute: 0
  }
  const websocket = health.websocket || {
    active_connections: 0,
    total_messages_24h: 0
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={cn("border-2", status === "healthy" ? "border-green-200" : "border-yellow-200")}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(status)}
              <span>System Status</span>
            </div>
            <Badge
              variant={status === "healthy" ? "default" : "secondary"}
              className={cn(
                status === "healthy"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : status === "warning"
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                    : "bg-red-100 text-red-800 border-red-200",
              )}
            >
              {status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CPU Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Usage
            </CardTitle>
            {getTrendIcon(trends.cpu)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{system.cpu_percent.toFixed(1)}%</div>
            <Progress value={system.cpu_percent} className="mt-2 h-2" />
            <p className="text-xs text-slate-500 mt-1">System processor load</p>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              Memory Usage
            </CardTitle>
            {getTrendIcon(trends.memory)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{system.memory_percent.toFixed(1)}%</div>
            <Progress value={system.memory_percent} className="mt-2 h-2" />
            <p className="text-xs text-slate-500 mt-1">{system.memory_used_gb.toFixed(1)} GB used</p>
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Disk Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{system.disk_usage_percent.toFixed(1)}%</div>
            <Progress value={system.disk_usage_percent} className="mt-2 h-2" />
            <p className="text-xs text-slate-500 mt-1">Storage utilization</p>
          </CardContent>
        </Card>

        {/* System Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              System Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatUptime(system.uptime_hours)}</div>
            <p className="text-xs text-slate-500 mt-1">Continuous operation</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Database Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </CardTitle>
            {getStatusIcon(database.status)}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Users:</span>
                <span className="font-medium">{database.total_users}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Patients:</span>
                <span className="font-medium">{database.total_patients}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Response:</span>
                <span className="font-medium">{database.response_time_ms}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Encryption Service */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Encryption
            </CardTitle>
            {getStatusIcon(encryption.status)}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Key Version:</span>
                <span className="font-medium">{encryption.active_key_version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Operations/min:</span>
                <span className="font-medium">{encryption.operations_per_minute}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WebSocket Connections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              WebSocket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Active:</span>
                <span className="font-medium">{websocket.active_connections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Messages (24h):</span>
                <span className="font-medium">{websocket.total_messages_24h}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Report */}
      {securityReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{securityReport.failed_logins_24h || 0}</div>
                <p className="text-xs text-slate-500">Failed Logins (24h)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{(securityReport.suspicious_ips || []).length}</div>
                <p className="text-xs text-slate-500">Suspicious IPs</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{securityReport.blocked_attempts || 0}</div>
                <p className="text-xs text-slate-500">Blocked Attempts</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{(securityReport.security_events || []).length}</div>
                <p className="text-xs text-slate-500">Security Events</p>
              </div>
            </div>

            {(securityReport.security_events || []).length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-slate-900 mb-2">Recent Security Events</h4>
                <div className="space-y-2">
                  {(securityReport.security_events || []).slice(0, 3).map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            (event.severity || "low") === "high"
                              ? "border-red-200 text-red-700"
                              : (event.severity || "low") === "medium"
                                ? "border-yellow-200 text-yellow-700"
                                : "border-slate-200 text-slate-700"
                          }
                        >
                          {event.severity || "low"}
                        </Badge>
                        <span className="text-sm text-slate-700">{event.type || "Unknown"}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">{event.count || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
