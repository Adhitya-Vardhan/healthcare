"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast"
import { ProfileAPI } from "@/lib/profile-api"
import type { UserProfile, UpdateProfileRequest } from "@/lib/profile-types"
import { ChangePasswordForm } from "./change-password-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  Calendar,
  Edit2,
  Save,
  X,
  Lock,
  Shield,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface ValidationErrors {
  [key: string]: string
}

function UserProfileComponent() {
  const { token, user: authUser } = useAuth()
  const { addToast } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editData, setEditData] = useState<UpdateProfileRequest>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  })

  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const profileData = await ProfileAPI.getUserProfile(token)
      setProfile(profileData)
      setEditData({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        phone: profileData.phone || "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!editData.first_name.trim()) {
      newErrors.first_name = "First name is required"
    } else if (!/^[a-zA-Z\s'-]+$/.test(editData.first_name)) {
      newErrors.first_name = "First name can only contain letters, spaces, hyphens, and apostrophes"
    }

    if (!editData.last_name.trim()) {
      newErrors.last_name = "Last name is required"
    } else if (!/^[a-zA-Z\s'-]+$/.test(editData.last_name)) {
      newErrors.last_name = "Last name can only contain letters, spaces, hyphens, and apostrophes"
    }

    if (!editData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (editData.phone && !/^\+?[\d\s\-()]+$/.test(editData.phone)) {
      newErrors.phone = "Please enter a valid phone number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm() || !token) return

    setIsSaving(true)

    try {
      const updatedProfile = await ProfileAPI.updateProfile(token, editData)
      setProfile(updatedProfile)
      setIsEditing(false)

      addToast({
        type: "success",
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setEditData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone || "",
      })
    }
    setErrors({})
    setIsEditing(false)
  }

  const handleInputChange = (field: keyof UpdateProfileRequest, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200"
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "user":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM dd, yyyy 'at' HH:mm")
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded animate-pulse" />
        <Card>
          <CardHeader>
            <div className="h-6 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!profile) {
    return (
      <Alert>
        <AlertDescription>Profile not found</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Profile</h1>
          <p className="text-slate-600">Manage your account information and settings</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowPasswordForm(true)} variant="outline" size="sm">
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>

          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="bg-slate-900 hover:bg-slate-800">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-slate-100 text-slate-700 text-lg font-semibold">
                {getInitials(profile.first_name, profile.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  {profile.first_name} {profile.last_name}
                </h2>
                <Badge variant="outline" className={getRoleBadgeColor(profile.role.name)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {profile.role.name}
                </Badge>
                {profile.is_active && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-slate-600">@{profile.username}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="first_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  First Name *
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="first_name"
                      value={editData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      className={cn(errors.first_name && "border-red-300 focus:border-red-500")}
                    />
                    {errors.first_name && <p className="text-xs text-red-600">{errors.first_name}</p>}
                  </div>
                ) : (
                  <p className="text-slate-900 font-medium">{profile.first_name}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="last_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Last Name *
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="last_name"
                      value={editData.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      className={cn(errors.last_name && "border-red-300 focus:border-red-500")}
                    />
                    {errors.last_name && <p className="text-xs text-red-600">{errors.last_name}</p>}
                  </div>
                ) : (
                  <p className="text-slate-900 font-medium">{profile.last_name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="email"
                      type="email"
                      value={editData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={cn(errors.email && "border-red-300 focus:border-red-500")}
                    />
                    {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                  </div>
                ) : (
                  <p className="text-slate-900 font-medium">{profile.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="phone"
                      value={editData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className={cn(errors.phone && "border-red-300 focus:border-red-500")}
                    />
                    {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                  </div>
                ) : (
                  <p className="text-slate-900 font-medium">{profile.phone || "Not provided"}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Organization Information */}
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Organization Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Role */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <div>
                  <p className="text-slate-900 font-medium">{profile.role.name}</p>
                  <p className="text-xs text-slate-500">{profile.role.description}</p>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <div>
                  <p className="text-slate-900 font-medium">{profile.location.name}</p>
                  <p className="text-xs text-slate-500">Code: {profile.location.code}</p>
                </div>
              </div>

              {/* Team */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </Label>
                <div>
                  <p className="text-slate-900 font-medium">{profile.team.name}</p>
                  <p className="text-xs text-slate-500">Code: {profile.team.code}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Information */}
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Username
                </Label>
                <p className="text-slate-900 font-medium font-mono">@{profile.username}</p>
              </div>

              {/* Account Created */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Account Created
                </Label>
                <p className="text-slate-900 font-medium">{formatDate(profile.created_at)}</p>
              </div>

              {/* Last Login */}
              {profile.last_login && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Last Login
                  </Label>
                  <p className="text-slate-900 font-medium">{formatDate(profile.last_login)}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <ChangePasswordForm open={showPasswordForm} onOpenChange={setShowPasswordForm} />
    </div>
  )
}

export default UserProfileComponent

// Named export so consumers can do `import { UserProfile } from "@/components/user-profile"`
export { UserProfileComponent as UserProfile }
