"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast"
import { ProfileAPI } from "@/lib/profile-api"
import type { ChangePasswordRequest } from "@/lib/profile-types"
import { PasswordStrengthIndicator } from "./password-strength-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChangePasswordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  current_password: string
  new_password: string
  confirm_password: string
}

interface ValidationErrors {
  [key: string]: string
}

export function ChangePasswordForm({ open, onOpenChange }: ChangePasswordFormProps) {
  const { token } = useAuth()
  const { addToast } = useToast()

  const [formData, setFormData] = useState<FormData>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!formData.current_password) {
      newErrors.current_password = "Current password is required"
    }

    if (!formData.new_password) {
      newErrors.new_password = "New password is required"
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = "Password must be at least 8 characters"
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = "Please confirm your new password"
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match"
    }

    if (formData.current_password === formData.new_password) {
      newErrors.new_password = "New password must be different from current password"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !token) return

    setIsSubmitting(true)

    try {
      const passwordData: ChangePasswordRequest = {
        current_password: formData.current_password,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password,
      }

      await ProfileAPI.changePassword(token, passwordData)

      addToast({
        type: "success",
        title: "Password Changed",
        description: "Your password has been updated successfully",
      })

      onOpenChange(false)
      resetForm()
    } catch (error) {
      addToast({
        type: "error",
        title: "Password Change Failed",
        description: error instanceof Error ? error.message : "Failed to change password",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      current_password: "",
      new_password: "",
      confirm_password: "",
    })
    setErrors({})
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    })
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

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>Update your account password for security</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password *</Label>
            <div className="relative">
              <Input
                id="current_password"
                type={showPasswords.current ? "text" : "password"}
                value={formData.current_password}
                onChange={(e) => handleInputChange("current_password", e.target.value)}
                className={cn("pr-10", errors.current_password && "border-red-300 focus:border-red-500")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility("current")}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {errors.current_password && <p className="text-xs text-red-600">{errors.current_password}</p>}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new_password">New Password *</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPasswords.new ? "text" : "password"}
                value={formData.new_password}
                onChange={(e) => handleInputChange("new_password", e.target.value)}
                className={cn("pr-10", errors.new_password && "border-red-300 focus:border-red-500")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility("new")}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {errors.new_password && <p className="text-xs text-red-600">{errors.new_password}</p>}
            <PasswordStrengthIndicator password={formData.new_password} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirm_password}
                onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                className={cn("pr-10", errors.confirm_password && "border-red-300 focus:border-red-500")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility("confirm")}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {errors.confirm_password && <p className="text-xs text-red-600">{errors.confirm_password}</p>}
          </div>

          {/* Password Requirements */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Password Requirements:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
                <li>Contains at least one special character</li>
              </ul>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Changing Password...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
