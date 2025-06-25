"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast"
import { useAdminWebSocket } from "@/hooks/use-admin-websocket"
import { AuditAPI } from "@/lib/audit-api"
import type { AuditLog, AuditStats, AuditFilters, SystemHealth, SecurityReport } from "@/lib/audit-types"
import { AuditLogsTable } from "./audit-logs-table"
import { SystemHealthDashboard } from "./system-health-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Activity, Shield, Users, AlertTriangle, Wifi, WifiOff, RefreshCw, BarChart3, Monitor } from "lucide-react"

export function AuditDashboard() {
  const { token } = useAuth()
  const { addToast } = useToast()
  const { isConnected, newAuditLog, healthUpdate } = useAdminWebSocket()

  const [activeTab, setActiveTab] = useState<"logs" | "health">("logs")
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<AuditFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newLogId, setNewLogId] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Handle new audit log from WebSocket
  useEffect(() => {
    if (newAuditLog) {
      setAuditLogs((prev) => [newAuditLog, ...prev.slice(0, pagination.limit - 1)])
      setNewLogId(newAuditLog.id)
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }))

      // Clear highlight after 3 seconds
      setTimeout(() => setNewLogId(null), 3000)

      // Refresh stats
      fetchAuditStats()
    }
  }, [newAuditLog, pagination.limit])

  // Handle health updates from WebSocket
  useEffect(() => {
    if (healthUpdate) {
      setSystemHealth(healthUpdate)
      setLastUpdated(new Date())
    }
  }, [healthUpdate])

  const fetchAuditLogs = useCallback(
    async (page = 1, currentFilters: AuditFilters = {}) => {
      if (!token) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await AuditAPI.getAuditLogs(token, page, pagination.limit, currentFilters)

        setAuditLogs(response.logs || [])
        setPagination({
          total: response.total || 0,
          page: response.page || 1,
          limit: response.limit || 20,
          total_pages: response.total_pages || 0,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch audit logs")
        setAuditLogs([]) // Ensure we always have an array
      } finally {
        setIsLoading(false)
      }
    },
    [token, pagination.limit],
  )

  const fetchAuditStats = useCallback(async () => {
    if (!token) return

    try {
      const stats = await AuditAPI.getAuditStats(token)
      setAuditStats(stats)
    } catch (err) {
      console.error("Failed to fetch audit stats:", err)
    }
  }, [token])

  const fetchSystemHealth = useCallback(async () => {
    if (!token) return

    try {
      const health = await AuditAPI.getSystemHealth(token)
      setSystemHealth(health)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch system health:", err)
    }
  }, [token])

  const fetchSecurityReport = useCallback(async () => {
    if (!token) return

    try {
      const report = await AuditAPI.getSecurityReport(token)
      setSecurityReport(report)
    } catch (err) {
      console.error("Failed to fetch security report:", err)
    }
  }, [token])

  useEffect(() => {
    if (activeTab === "logs") {
      fetchAuditLogs(1, filters)
      fetchAuditStats()
    } else {
      fetchSystemHealth()
      fetchSecurityReport()
    }
  }, [activeTab, filters, fetchAuditLogs, fetchAuditStats, fetchSystemHealth, fetchSecurityReport])

  const handleFiltersChange = (newFilters: AuditFilters) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    fetchAuditLogs(page, filters)
  }

  const handleExportLogs = async () => {
    if (!token) return

    try {
      const blob = await AuditAPI.exportAuditLogs(token, filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addToast({
        type: "success",
        title: "Export Complete",
        description: "Audit logs have been exported successfully",
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export audit logs",
      })
    }
  }

  const handleRefresh = () => {
    if (activeTab === "logs") {
      fetchAuditLogs(pagination.page, filters)
      fetchAuditStats()
    } else {
      fetchSystemHealth()
      fetchSecurityReport()
    }
    setLastUpdated(new Date())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">System Monitoring</h1>
          <p className="text-slate-600">Monitor system health and audit user activities</p>
        </div>

        <div className="flex items-center gap-4">
          {/* WebSocket Status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Live Updates</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">Disconnected</span>
              </>
            )}
          </div>

          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4">
        <Button
          variant={activeTab === "logs" ? "default" : "outline"}
          onClick={() => setActiveTab("logs")}
          className={activeTab === "logs" ? "bg-slate-900 hover:bg-slate-800" : ""}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Audit Logs
        </Button>
        <Button
          variant={activeTab === "health" ? "default" : "outline"}
          onClick={() => setActiveTab("health")}
          className={activeTab === "health" ? "bg-slate-900 hover:bg-slate-800" : ""}
        >
          <Monitor className="h-4 w-4 mr-2" />
          System Health
        </Button>
      </div>

      {activeTab === "logs" && (
        <>
          {/* Audit Stats Cards */}
          {auditStats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Activities (24h)</CardTitle>
                  <Activity className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{auditStats.total_activities_24h}</div>
                  <p className="text-xs text-slate-500">Total user actions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Failed Logins</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{auditStats.failed_login_attempts}</div>
                  <p className="text-xs text-slate-500">Security incidents</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{auditStats.active_users_online}</div>
                  <p className="text-xs text-slate-500">Currently online</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Encryption Ops</CardTitle>
                  <Shield className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{auditStats.encryption_operations}</div>
                  <p className="text-xs text-slate-500">Security operations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Unique IPs</CardTitle>
                  <Activity className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{auditStats.unique_ips_24h}</div>
                  <p className="text-xs text-slate-500">Different sources</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Critical Actions</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{auditStats.critical_actions_24h}</div>
                  <p className="text-xs text-slate-500">High-priority events</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Audit Logs Table */}
          <AuditLogsTable
            logs={auditLogs}
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
            totalPages={pagination.total_pages}
            isLoading={isLoading}
            filters={filters}
            onPageChange={handlePageChange}
            onFiltersChange={handleFiltersChange}
            onExport={handleExportLogs}
            newLogId={newLogId}
          />
        </>
      )}

      {activeTab === "health" && (
        <SystemHealthDashboard
          health={systemHealth}
          securityReport={securityReport}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
        />
      )}
    </div>
  )
}
