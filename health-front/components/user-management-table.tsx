"use client"

import { useState, useMemo } from "react"
import type { User, UserFilters, SortConfig } from "@/lib/user-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Edit,
  UserX,
  UserCheck,
  Loader2,
  Users,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface UserManagementTableProps {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
  isLoading?: boolean
  sortConfig?: SortConfig
  filters: UserFilters
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onSortChange: (sort: SortConfig) => void
  onFiltersChange: (filters: UserFilters) => void
  onStatusToggle: (userId: number, isActive: boolean) => Promise<void>
}

export function UserManagementTable({
  users,
  total,
  page,
  limit,
  totalPages,
  isLoading,
  sortConfig,
  filters,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFiltersChange,
  onStatusToggle,
}: UserManagementTableProps) {
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null)

  const handleSort = (field: keyof User) => {
    const direction = sortConfig?.field === field && sortConfig.direction === "asc" ? "desc" : "asc"
    onSortChange({ field, direction })
  }

  const getSortIcon = (field: keyof User) => {
    if (sortConfig?.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-slate-400" />
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-4 w-4 text-slate-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-slate-600" />
    )
  }

  const handleStatusToggle = async (user: User) => {
    setStatusUpdating(user.id)
    try {
      await onStatusToggle(user.id, !user.is_active)
    } catch (error) {
      console.error("Failed to update user status:", error)
    } finally {
      setStatusUpdating(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' HH:mm")
    } catch {
      return dateString
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200"
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "user":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  const pageNumbers = useMemo(() => {
    const delta = 2
    const range = []
    const rangeWithDots = []
    const currentPage = page || 1
    const currentTotalPages = totalPages || 1

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(currentTotalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < currentTotalPages - 1) {
      rangeWithDots.push("...", currentTotalPages)
    } else if (currentTotalPages > 1) {
      rangeWithDots.push(currentTotalPages)
    }

    return rangeWithDots
  }, [page, totalPages])

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management ({(total || 0)} total)
          </CardTitle>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users..."
                value={filters.search || ""}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                className="pl-10 w-64"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value as any })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Page Size */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 whitespace-nowrap">Show:</span>
              <Select value={(limit || 10).toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <TableHead className="font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("username")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Username
                      {getSortIcon("username")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("role")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Role
                      {getSortIcon("role")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("location")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Location
                      {getSortIcon("location")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">Team</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Last Login</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-slate-500">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !users || users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50 transition-colors">
                      {/* User Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-slate-100 text-slate-700 text-xs">
                              {getInitials(user.first_name, user.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Username */}
                      <TableCell className="font-medium text-slate-900">{user.username}</TableCell>

                      {/* Role */}
                      <TableCell>
                        <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="text-slate-700">{user.location}</TableCell>

                      {/* Team */}
                      <TableCell className="text-slate-700">{user.team}</TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"} className="flex items-center gap-1">
                          {user.is_active ? (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              Active
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-slate-400 rounded-full" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="text-slate-600">
                        {user.last_login ? formatDate(user.last_login) : "Never"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className={user.is_active ? "text-red-600" : "text-green-600"}
                                >
                                  {user.is_active ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{user.is_active ? "Deactivate" : "Activate"} User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to {user.is_active ? "deactivate" : "activate"}{" "}
                                    <strong>
                                      {user.first_name} {user.last_name}
                                    </strong>
                                    ?{" "}
                                    {user.is_active
                                      ? "They will lose access to the system."
                                      : "They will regain access to the system."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleStatusToggle(user)}
                                    disabled={statusUpdating === user.id}
                                    className={
                                      user.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                                    }
                                  >
                                    {statusUpdating === user.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    {user.is_active ? "Deactivate" : "Activate"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
          <div className="text-sm text-slate-600">
            Showing {((page || 1) - 1) * (limit || 10) + 1} to {Math.min((page || 1) * (limit || 10), total || 0)} of {total || 0} users
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange((page || 1) - 1)}
              disabled={(page || 1) <= 1 || isLoading}
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
                    variant={pageNum === (page || 1) ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(Number(pageNum))}
                    disabled={isLoading}
                    className={cn(
                      "w-8 h-8 p-0",
                      pageNum === (page || 1) ? "bg-slate-900 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50",
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
              onClick={() => onPageChange((page || 1) + 1)}
              disabled={(page || 1) >= (totalPages || 1) || isLoading}
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
