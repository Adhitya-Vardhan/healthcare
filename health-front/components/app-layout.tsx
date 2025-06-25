"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { getNavigationForRole } from "@/lib/navigation"
import { UserProfileDropdown } from "./user-profile-dropdown"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Shield } from "lucide-react"
import Link from "next/link"
import { NotificationBell } from "./notification-bell"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth()

  if (!user) return null

  const navigationItems = getNavigationForRole(user.role)

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-slate-200">
        <SidebarHeader className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">Healthcare Portal</span>
              <span className="text-xs text-slate-500">Patient Management</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-600">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-200 p-4">
          <div className="text-xs text-slate-500">Logged in as {user.role}</div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Welcome, {user.first_name}</h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-slate-50">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
