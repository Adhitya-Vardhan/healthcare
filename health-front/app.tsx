"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { useAuth } from "@/lib/auth-context"
import { DashboardSkeleton } from "@/components/loading-skeletons"

function DashboardContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  // If user is authenticated, show loading while redirecting
  if (user) {
    return <DashboardSkeleton />
  }

  // If no user, this will be handled by ProtectedRoute
  return null
}

export default function App() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <DashboardContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
