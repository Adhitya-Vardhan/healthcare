import type React from "react"
import { LayoutDashboard, Users, FileText, Upload, BarChart3, Shield, Activity, User } from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: ("Admin" | "Manager" | "User")[]
}

export const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["Admin", "Manager", "User"],
  },
  {
    title: "User Management",
    href: "/users",
    icon: Users,
    roles: ["Admin"],
  },
  {
    title: "Patient Management",
    href: "/patients",
    icon: FileText,
    roles: ["Manager"],
  },
  {
    title: "File Upload",
    href: "/upload",
    icon: Upload,
    roles: ["Manager"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["Manager"],
  },
  {
    title: "Audit Logs",
    href: "/audit",
    icon: Shield,
    roles: ["Admin"],
  },
  {
    title: "System Health",
    href: "/health",
    icon: Activity,
    roles: ["Admin"],
  },
  {
    title: "My Profile",
    href: "/profile",
    icon: User,
    roles: ["Admin", "Manager", "User"],
  },
]

export function getNavigationForRole(role: "Admin" | "Manager" | "User"): NavItem[] {
  return navigationItems.filter((item) => item.roles.includes(role))
}
