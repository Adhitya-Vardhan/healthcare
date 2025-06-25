"use client"

import type React from "react"

import { useState, useMemo } from "react"
import type { AuditLog, AuditFilters } from "@/lib/audit-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  User,
  FileText,
  Shield,
  Database,
  Upload,
  Download,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface AuditLogsTableProps {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
  isLoading?: boolean
  filters: AuditFilters
  onPageChange: (page: number) => void
  onFiltersChange: (filters: AuditFilters) => void
  onExport: () => void
  newLogId?: number | null
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  login: User,
  logout: User,
  patient_created: FileText,
  patient_updated: FileText,
  patient_deleted: FileText,
  user_created: User,
  user_updated: User,
  user_deleted: User,
  file_upload: Upload,
  file_download: Download,
  security_event: Shield,
  database_query: Database,
  system_access: Activity,
}

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-100 text-green-800 border-green-200",
  logout: "bg-slate-100 text-slate-800 border-slate-200",
  patient_created: "bg-blue-100 text-blue-800 border-blue-200",
  patient_updated: "bg-yellow-100 text-yellow-800 border-yellow-200",
  patient_deleted: "bg-red-100 text-red-800 border-red-200",
  user_created: "bg-purple-100 text-purple-800 border-purple-200",
  user_updated: "bg-orange-100 text-orange-800 border-orange-200",
  user_deleted: "bg-red-100 text-red-800 border-red-200",
  file_upload: "bg-indigo-100 text-indigo-800 border-indigo-200",
  file_download: "bg-cyan-100 text-cyan-800 border-cyan-200",
  security_event: "bg-red-100 text-red-800 border-red-200",
  database_query: "bg-emerald-100 text-emerald-800 border-emerald-200",
  system_access: "bg-slate-100 text-slate-800 border-slate-200",
}

export function AuditLogsTable({
  logs,
  total,
  page,
  limit,
  totalPages,
  isLoading,
  filters,
  onPageChange,
  onFiltersChange,
  onExport,
  newLogId,
}: AuditLogsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggleRowExpansion = (logId: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedRows(newExpanded)
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM dd, yyyy HH:mm:ss")
    } catch {
      return timestamp
    }
  }

  const getActionIcon = (action: string) => {
    const IconComponent = ACTION_ICONS[action] || Activity
    return IconComponent
  }

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || "bg-slate-100 text-slate-800 border-slate-200"
  }

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase()
  }

  const pageNumbers = useMemo(() => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i)
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (page + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }, [page, totalPages])

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Audit Logs ({total} total)
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button onClick={onExport} variant="outline" size="sm" className="border-slate-300">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search logs..."
              value={filters.ip_address || ""}
              onChange={(e) => onFiltersChange({ ...filters, ip_address: e.target.value })}
              className="pl-10"
            />
          </div>

          <Select
            value={filters.action || "all"}
            onValueChange={(value) => onFiltersChange({ ...filters, action: value === "all" ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="patient_created">Patient Created</SelectItem>
              <SelectItem value="patient_updated">Patient Updated</SelectItem>
              <SelectItem value="patient_deleted">Patient Deleted</SelectItem>
              <SelectItem value="user_created">User Created</SelectItem>
              <SelectItem value="file_upload">File Upload</SelectItem>
              <SelectItem value="security_event">Security Event</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.resource_type || "all"}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, resource_type: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="patient">Patient</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="file">File</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="date"
              value={filters.start_date || ""}
              onChange={(e) => onFiltersChange({ ...filters, start_date: e.target.value })}
              className="flex-1"
            />
            <Input
              type="date"
              value={filters.end_date || ""}
              onChange={(e) => onFiltersChange({ ...filters, end_date: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">User</TableHead>
                  <TableHead className="font-semibold text-slate-700">Action</TableHead>
                  <TableHead className="font-semibold text-slate-700">Resource</TableHead>
                  <TableHead className="font-semibold text-slate-700">IP Address</TableHead>
                  <TableHead className="font-semibold text-slate-700">Timestamp</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : !logs || logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const ActionIcon = getActionIcon(log.action)
                    const isExpanded = expandedRows.has(log.id)
                    const isNew = newLogId === log.id

                    return (
                      <Collapsible key={log.id} open={isExpanded} onOpenChange={() => toggleRowExpansion(log.id)}>
                        <TableRow
                          className={cn(
                            "hover:bg-slate-50 transition-colors",
                            isNew && "bg-blue-50 border-l-4 border-l-blue-500",
                          )}
                        >
                          {/* User */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-slate-100 text-slate-700 text-xs">
                                  {getUserInitials(log.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900">{log.username}</p>
                                <p className="text-xs text-slate-500">ID: {log.user_id}</p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Action */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("flex items-center gap-1", getActionColor(log.action))}
                            >
                              <ActionIcon className="h-3 w-3" />
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>

                          {/* Resource */}
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{log.resource_type}</p>
                              <p className="text-xs text-slate-500">{log.resource_id}</p>
                            </div>
                          </TableCell>

                          {/* IP Address */}
                          <TableCell className="font-mono text-sm text-slate-700">{log.ip_address}</TableCell>

                          {/* Timestamp */}
                          <TableCell className="text-slate-600">{formatTimestamp(log.timestamp)}</TableCell>

                          {/* Details Toggle */}
                          <TableCell className="text-right">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ChevronDown
                                  className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                                />
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Details */}
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={6} className="bg-slate-50 p-4">
                              <div className="space-y-2">
                                <h4 className="font-medium text-slate-900">Activity Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-slate-600">
                                      <strong>Log ID:</strong> {log.id}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      <strong>User ID:</strong> {log.user_id}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      <strong>Resource Type:</strong> {log.resource_type}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      <strong>Resource ID:</strong> {log.resource_id}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-slate-600">
                                      <strong>IP Address:</strong> {log.ip_address}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      <strong>Timestamp:</strong> {formatTimestamp(log.timestamp)}
                                    </p>
                                  </div>
                                </div>
                                {Object.keys(log.details).length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-slate-900 mb-2">Additional Details</h5>
                                    <div className="bg-white rounded border p-3">
                                      <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
          <div className="text-sm text-slate-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} logs
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="border-slate-300"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNum, index) =>
                pageNum === "..." ? (
                  <span key={index} className="px-2 text-slate-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(Number(pageNum))}
                    disabled={isLoading}
                    className={cn(
                      "w-8 h-8 p-0",
                      pageNum === page ? "bg-slate-900 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    {pageNum}
                  </Button>
                ),
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="border-slate-300"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
