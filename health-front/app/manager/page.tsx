"use client"

import { ManagerDashboard } from "@/components/manager-dashboard"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function ManagerPage() {
  return (
    <ProtectedRoute allowedRoles={["Manager"]}>
      <AppLayout>
        <ManagerDashboard />
      </AppLayout>
    </ProtectedRoute>
  )
} 