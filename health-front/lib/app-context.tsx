"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { useAuth } from "./auth-context"

interface AppState {
  isLoading: boolean
  currentRoute: string
  permissions: string[]
  preferences: {
    theme: "light" | "dark"
    notifications: boolean
    autoRefresh: boolean
  }
  connectionStatus: "connected" | "disconnected" | "reconnecting"
  lastActivity: Date
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ROUTE"; payload: string }
  | { type: "SET_PERMISSIONS"; payload: string[] }
  | { type: "UPDATE_PREFERENCES"; payload: Partial<AppState["preferences"]> }
  | { type: "SET_CONNECTION_STATUS"; payload: AppState["connectionStatus"] }
  | { type: "UPDATE_ACTIVITY" }
  | { type: "RESET_STATE" }

const initialState: AppState = {
  isLoading: false,
  currentRoute: "/",
  permissions: [],
  preferences: {
    theme: "light",
    notifications: true,
    autoRefresh: true,
  },
  connectionStatus: "disconnected",
  lastActivity: new Date(),
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_ROUTE":
      return { ...state, currentRoute: action.payload }
    case "SET_PERMISSIONS":
      return { ...state, permissions: action.payload }
    case "UPDATE_PREFERENCES":
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      }
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload }
    case "UPDATE_ACTIVITY":
      return { ...state, lastActivity: new Date() }
    case "RESET_STATE":
      return initialState
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  setLoading: (loading: boolean) => void
  setRoute: (route: string) => void
  updatePreferences: (preferences: Partial<AppState["preferences"]>) => void
  setConnectionStatus: (status: AppState["connectionStatus"]) => void
  updateActivity: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const { user, logout } = useAuth()

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem("app_preferences")
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences)
        dispatch({ type: "UPDATE_PREFERENCES", payload: preferences })
      } catch (error) {
        console.error("Failed to load preferences:", error)
      }
    }
  }, [])

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("app_preferences", JSON.stringify(state.preferences))
  }, [state.preferences])

  // Set permissions based on user role
  useEffect(() => {
    if (user) {
      const permissions = getRolePermissions(user.role)
      dispatch({ type: "SET_PERMISSIONS", payload: permissions })
    } else {
      dispatch({ type: "SET_PERMISSIONS", payload: [] })
    }
  }, [user])

  // Session timeout handling
  useEffect(() => {
    const checkSessionTimeout = () => {
      const now = new Date()
      const timeSinceActivity = now.getTime() - state.lastActivity.getTime()
      const timeoutDuration = 30 * 60 * 1000 // 30 minutes

      if (timeSinceActivity > timeoutDuration && user) {
        logout()
        // Show session expired message
      }
    }

    const interval = setInterval(checkSessionTimeout, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [state.lastActivity, user, logout])

  // Activity tracking
  useEffect(() => {
    const handleActivity = () => {
      dispatch({ type: "UPDATE_ACTIVITY" })
    }

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"]
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [])

  const setLoading = (loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading })
  }

  const setRoute = (route: string) => {
    dispatch({ type: "SET_ROUTE", payload: route })
  }

  const updatePreferences = (preferences: Partial<AppState["preferences"]>) => {
    dispatch({ type: "UPDATE_PREFERENCES", payload: preferences })
  }

  const setConnectionStatus = (status: AppState["connectionStatus"]) => {
    dispatch({ type: "SET_CONNECTION_STATUS", payload: status })
  }

  const updateActivity = () => {
    dispatch({ type: "UPDATE_ACTIVITY" })
  }

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        setLoading,
        setRoute,
        updatePreferences,
        setConnectionStatus,
        updateActivity,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

function getRolePermissions(role: string): string[] {
  switch (role) {
    case "Admin":
      return [
        "user.create",
        "user.read",
        "user.update",
        "user.delete",
        "patient.create",
        "patient.read",
        "patient.update",
        "patient.delete",
        "file.upload",
        "file.export",
        "audit.read",
        "system.monitor",
      ]
    case "Manager":
      return ["patient.create", "patient.read", "patient.update", "patient.delete", "file.upload", "file.export"]
    case "User":
      return ["patient.read", "profile.update"]
    default:
      return []
  }
}
