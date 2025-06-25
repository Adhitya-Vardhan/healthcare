"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast"
import { AdminAPI } from "@/lib/admin-api"
import type { CreateUserRequest, ConfigOption } from "@/lib/user-types"
import { PasswordStrengthIndicator } from "./password-strength-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateUserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

interface FormData {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
  role: string
  location: string
  team: string
}

interface ValidationErrors {
  [key: string]: string
}

interface AvailabilityStatus {
  username: "checking" | "available" | "unavailable" | null
  email: "checking" | "available" | "unavailable" | null
}

export function CreateUserForm({ open, onOpenChange, onUserCreated }: CreateUserFormProps) {
  const { token } = useAuth()
  const { addToast } = useToast()

  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "",
    location: "",
    team: "",
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityStatus>({
    username: null,
    email: null,
  })

  const [config, setConfig] = useState<{
    roles: ConfigOption[]
    locations: ConfigOption[]
    teams: ConfigOption[]
  }>({
    roles: [],
    locations: [],
    teams: [],
  })

  const [configLoading, setConfigLoading] = useState(true)

  // Load configuration data
  useEffect(() => {
    if (open && token) {
      loadConfigData()
    }
  }, [open, token])

  const loadConfigData = async () => {
    if (!token) return

    setConfigLoading(true)
    try {
      const [roles, locations, teams] = await Promise.all([
        AdminAPI.getRoles(token),
        AdminAPI.getLocations(token),
        AdminAPI.getTeams(token),
      ])

      setConfig({ roles, locations, teams })
    } catch (error) {
      addToast({
        type: "error",
        title: "Configuration Error",
        description: "Failed to load form configuration",
      })
    } finally {
      setConfigLoading(false)
    }
  }

  // Check availability with debouncing
  useEffect(() => {
    const checkAvailability = async (field: "username" | "email", value: string) => {
      if (!token || !value || value.length < 3) return

      setAvailability((prev) => ({ ...prev, [field]: "checking" }))

      try {
        const result = await AdminAPI.checkAvailability(token, field, value)
        setAvailability((prev) => ({ ...prev, [field]: result.available ? "available" : "unavailable" }))

        if (!result.available) {
          setErrors((prev) => ({ ...prev, [field]: result.message || `${field} is not available` }))
        } else {
          setErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[field]
            return newErrors
          })
        }
      } catch (error) {
        setAvailability((prev) => ({ ...prev, [field]: null }))
      }
    }

    const timeouts: { [key: string]: NodeJS.Timeout } = {}

    if (formData.username) {
      timeouts.username = setTimeout(() => checkAvailability("username", formData.username), 500)
    }

    if (formData.email) {
      timeouts.email = setTimeout(() => checkAvailability("email", formData.email), 500)
    }

    return () => {
      Object.values(timeouts).forEach(clearTimeout)
    }
  }, [formData.username, formData.email, token])

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!formData.username.trim()) newErrors.username = "Username is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.password) newErrors.password = "Password is required"
    if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters"
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required"
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required"
    if (!formData.role) newErrors.role = "Role is required"
    if (!formData.location) newErrors.location = "Location is required"
    if (!formData.team) newErrors.team = "Team is required"

    // Email format validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Phone format validation (optional)
    if (formData.phone && !/^\+?[\d\s\-$$$$]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number"
    }

    // Check availability
    if (availability.username === "unavailable") {
      newErrors.username = "Username is not available"
    }
    if (availability.email === "unavailable") {
      newErrors.email = "Email is not available"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !token) return

    setIsSubmitting(true)

    try {
      const userData: CreateUserRequest = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        location: formData.location,
        team: formData.team,
      }

      await AdminAPI.createUser(token, userData)

      addToast({
        type: "success",
        title: "User Created",
        description: `User ${userData.username} has been created successfully`,
      })

      onUserCreated()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      addToast({
        type: "error",
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create user",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "",
      location: "",
      team: "",
    })
    setErrors({})
    setAvailability({ username: null, email: null })
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const getAvailabilityIcon = (field: "username" | "email") => {
    const status = availability[field]
    if (status === "checking") return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    if (status === "available") return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === "unavailable") return <XCircle className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>Add a new user to the healthcare management system</DialogDescription>
        </DialogHeader>

        {configLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">Loading form configuration...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    className={cn(errors.first_name && "border-red-300 focus:border-red-500")}
                  />
                  {errors.first_name && <p className="text-xs text-red-600">{errors.first_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                    className={cn(errors.last_name && "border-red-300 focus:border-red-500")}
                  />
                  {errors.last_name && <p className="text-xs text-red-600">{errors.last_name}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className={cn(errors.phone && "border-red-300 focus:border-red-500")}
                />
                {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Account Information</h3>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className={cn(
                      "pr-10",
                      errors.username && "border-red-300 focus:border-red-500",
                      availability.username === "available" && "border-green-300 focus:border-green-500",
                    )}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getAvailabilityIcon("username")}
                  </div>
                </div>
                {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={cn(
                      "pr-10",
                      errors.email && "border-red-300 focus:border-red-500",
                      availability.email === "available" && "border-green-300 focus:border-green-500",
                    )}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getAvailabilityIcon("email")}
                  </div>
                </div>
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={cn(errors.password && "border-red-300 focus:border-red-500")}
                />
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                <PasswordStrengthIndicator password={formData.password} />
              </div>
            </div>

            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Organization Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                    <SelectTrigger className={cn(errors.role && "border-red-300 focus:border-red-500")}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select value={formData.location} onValueChange={(value) => handleInputChange("location", value)}>
                    <SelectTrigger className={cn(errors.location && "border-red-300 focus:border-red-500")}>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.location && <p className="text-xs text-red-600">{errors.location}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Team *</Label>
                  <Select value={formData.team} onValueChange={(value) => handleInputChange("team", value)}>
                    <SelectTrigger className={cn(errors.team && "border-red-300 focus:border-red-500")}>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.team && <p className="text-xs text-red-600">{errors.team}</p>}
                </div>
              </div>
            </div>

            {/* Availability checking alert */}
            {(availability.username === "checking" || availability.email === "checking") && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Checking availability...</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  availability.username === "checking" ||
                  availability.email === "checking" ||
                  availability.username === "unavailable" ||
                  availability.email === "unavailable"
                }
                className="bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating User...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
