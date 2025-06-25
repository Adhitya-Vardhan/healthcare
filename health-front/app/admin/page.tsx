"use client"

import { AdminDashboard } from "@/components/admin-dashboard"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin"]}>
      <AppLayout>
        <AdminDashboard />
      </AppLayout>
    </ProtectedRoute>
  )
} 