"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast"
import { AdminAPI } from "@/lib/admin-api"
import type { User, UserFilters, SortConfig } from "@/lib/user-types"
import { UserManagementTable } from "./user-management-table"
import { CreateUserForm } from "./create-user-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, UserPlus, Shield, Activity } from "lucide-react"
import { AuditDashboard } from "./audit-dashboard"

export function AdminDashboard() {
  const { token } = useAuth()
  const { addToast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<UserFilters>({ status: "all" })
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "username", direction: "asc" })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users")

  const fetchUsers = useCallback(
    async (page = 1, currentFilters: UserFilters = {}, currentSort?: SortConfig) => {
      if (!token) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await AdminAPI.getUsers(token, page, pagination.limit, currentFilters, currentSort)

        setUsers(response.users)
        setPagination({
          total: response.total,
          page: response.page,
          limit: response.limit,
          total_pages: response.total_pages,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch users")
      } finally {
        setIsLoading(false)
      }
    },
    [token, pagination.limit],
  )

  useEffect(() => {
    fetchUsers(1, filters, sortConfig)
  }, [fetchUsers, filters, sortConfig])

  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    fetchUsers(page, filters, sortConfig)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }))
    fetchUsers(1, filters, sortConfig)
  }

  const handleSortChange = (newSort: SortConfig) => {
    setSortConfig(newSort)
    fetchUsers(1, filters, newSort)
  }

  const handleStatusToggle = async (userId: number, isActive: boolean) => {
    if (!token) return

    try {
      const updatedUser = await AdminAPI.updateUserStatus(token, userId, isActive)
      setUsers((prev) => prev.map((user) => (user.id === userId ? updatedUser : user)))

      addToast({
        type: "success",
        title: "Status Updated",
        description: `User has been ${isActive ? "activated" : "deactivated"} successfully`,
      })
    } catch (err) {
      addToast({
        type: "error",
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update user status",
      })
      throw err
    }
  }

  const handleUserCreated = () => {
    fetchUsers(1, filters, sortConfig)
  }

  // Calculate stats
  const stats = {
    totalUsers: pagination.total,
    activeUsers: users?.filter((u) => u.is_active).length || 0,
    inactiveUsers: users?.filter((u) => !u.is_active).length || 0,
    adminUsers: users?.filter((u) => u.role === "Admin").length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <div className="flex gap-4 mt-4">
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            className={activeTab === "users" ? "bg-slate-900 hover:bg-slate-800" : ""}
          >
            <Users className="h-4 w-4 mr-2" />
            User Management
          </Button>
          <Button
            variant={activeTab === "audit" ? "default" : "outline"}
            onClick={() => setActiveTab("audit")}
            className={activeTab === "audit" ? "bg-slate-900 hover:bg-slate-800" : ""}
          >
            <Activity className="h-4 w-4 mr-2" />
            System Monitoring
          </Button>
        </div>
      </div>

      {activeTab === "users" && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
                <Users className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : stats.totalUsers}</div>
                <p className="text-xs text-slate-500">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : stats.activeUsers}</div>
                <p className="text-xs text-slate-500">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Inactive Users</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : stats.inactiveUsers}</div>
                <p className="text-xs text-slate-500">Deactivated accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Admin Users</CardTitle>
                <Shield className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : stats.adminUsers}</div>
                <p className="text-xs text-slate-500">Administrator accounts</p>
              </CardContent>
            </Card>
          </div>

          {/* Create User Button */}
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateForm(true)} className="bg-slate-900 hover:bg-slate-800">
              <UserPlus className="h-4 w-4 mr-2" />
              Create New User
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Management Table */}
          <UserManagementTable
            users={users}
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
            totalPages={pagination.total_pages}
            isLoading={isLoading}
            sortConfig={sortConfig}
            filters={filters}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
            onFiltersChange={handleFiltersChange}
            onStatusToggle={handleStatusToggle}
          />

          {/* Create User Form */}
          <CreateUserForm open={showCreateForm} onOpenChange={setShowCreateForm} onUserCreated={handleUserCreated} />
        </>
      )}

      {activeTab === "audit" && <AuditDashboard />}
    </div>
  )
}
