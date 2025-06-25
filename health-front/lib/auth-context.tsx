"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  role: "Admin" | "Manager" | "User"
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem("auth_token")
    if (savedToken) {
      setToken(savedToken)
      fetchUserProfile(savedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Handle redirects when user state changes
  useEffect(() => {
    if (user && !isLoading) {
      const currentPath = window.location.pathname
      console.log("[Auth] User state changed - Current path:", currentPath, "User role:", user.role)
      
      // Only redirect if we're on the root page or login page
      if (currentPath === "/" || currentPath === "/login") {
        let targetPath = "/dashboard"
        if (user.role === "Admin") {
          targetPath = "/admin"
        } else if (user.role === "Manager") {
          targetPath = "/manager"
        }
        
        console.log("[Auth] Redirecting to:", targetPath)
        router.push(targetPath)
      }
    }
  }, [user, isLoading, router])

  const fetchUserProfile = async (authToken: string) => {
    try {
      console.log("[Auth] Fetching user profile...")
      const response = await fetch("http://localhost:8000/api/users/profile", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const userData = await response.json()
        console.log("[Auth] User profile loaded:", userData)
        setUser(userData)
      } else {
        // Token might be invalid
        console.log("[Auth] Invalid token, clearing auth data")
        localStorage.removeItem("auth_token")
        setToken(null)
        setUser(null)
      }
    } catch (err) {
      console.error("[Auth] Failed to fetch user profile:", err)
      localStorage.removeItem("auth_token")
      setToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        const { access_token, user: userData } = data

        localStorage.setItem("auth_token", access_token)
        setToken(access_token)
        setUser(userData)
        
        // Redirect to appropriate dashboard based on user role
        if (userData.role === "Admin") {
          router.push("/admin")
        } else if (userData.role === "Manager") {
          router.push("/manager")
        } else {
          router.push("/dashboard")
        }
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Login failed")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    setToken(null)
    setUser(null)
    setError(null)
    router.push("/")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, error }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
