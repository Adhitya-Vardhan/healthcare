"use client"

import type React from "react"

import { AlertTriangle, Home, RefreshCw, Shield, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorPageProps {
  title: string
  description: string
  icon: React.ReactNode
  actions?: React.ReactNode
}

function ErrorPageLayout({ title, description, icon, actions }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            {icon}
          </div>
          <CardTitle className="text-2xl font-semibold text-slate-900">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">{description}</p>
          {actions && <div className="pt-4">{actions}</div>}
        </CardContent>
      </Card>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <ErrorPageLayout
      title="Page Not Found"
      description="The page you're looking for doesn't exist or has been moved."
      icon={<AlertTriangle className="h-8 w-8 text-slate-600" />}
      actions={
        <Button onClick={() => (window.location.href = "/")} className="w-full">
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Button>
      }
    />
  )
}

export function PermissionDeniedPage() {
  return (
    <ErrorPageLayout
      title="Access Denied"
      description="You don't have permission to access this page. Please contact your administrator if you believe this is an error."
      icon={<Shield className="h-8 w-8 text-red-600" />}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
            Go Back
          </Button>
          <Button onClick={() => (window.location.href = "/")} className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
      }
    />
  )
}

export function ServerErrorPage() {
  return (
    <ErrorPageLayout
      title="Server Error"
      description="We're experiencing technical difficulties. Please try again in a few moments."
      icon={<AlertTriangle className="h-8 w-8 text-red-600" />}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={() => (window.location.href = "/")} className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
      }
    />
  )
}

export function NetworkErrorPage() {
  return (
    <ErrorPageLayout
      title="Connection Error"
      description="Unable to connect to the server. Please check your internet connection and try again."
      icon={<Wifi className="h-8 w-8 text-red-600" />}
      actions={
        <Button onClick={() => window.location.reload()} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      }
    />
  )
}

export function SessionExpiredPage() {
  return (
    <ErrorPageLayout
      title="Session Expired"
      description="Your session has expired for security reasons. Please sign in again to continue."
      icon={<Shield className="h-8 w-8 text-yellow-600" />}
      actions={
        <Button onClick={() => (window.location.href = "/")} className="w-full">
          Sign In Again
        </Button>
      }
    />
  )
}
