"use client"

import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"

function UserDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h2>
        <p className="text-slate-600">Welcome back, {user?.first_name}!</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-600">My Profile</h3>
          </div>
          <div className="text-2xl font-bold text-slate-900">Active</div>
          <p className="text-xs text-slate-500">Account status</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-600">Recent Activity</h3>
          </div>
          <div className="text-2xl font-bold text-slate-900">5</div>
          <p className="text-xs text-slate-500">Actions this week</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-600">Notifications</h3>
          </div>
          <div className="text-2xl font-bold text-slate-900">2</div>
          <p className="text-xs text-slate-500">Unread messages</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-600">Last Login</h3>
          </div>
          <div className="text-2xl font-bold text-slate-900">Today</div>
          <p className="text-xs text-slate-500">10:30 AM</p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Manager", "User"]}>
      <AppLayout>
        <UserDashboard />
      </AppLayout>
    </ProtectedRoute>
  )
} 