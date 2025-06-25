"use client"

import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle } from "lucide-react"

interface PasswordStrengthIndicatorProps {
  password: string
}

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains number", test: (p) => /\d/.test(p) },
  { label: "Contains special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const metRequirements = requirements.filter((req) => req.test(password))
  const strength = (metRequirements.length / requirements.length) * 100

  const getStrengthLabel = () => {
    if (strength === 0) return ""
    if (strength < 40) return "Weak"
    if (strength < 80) return "Medium"
    return "Strong"
  }

  const getStrengthColor = () => {
    if (strength < 40) return "bg-red-500"
    if (strength < 80) return "bg-yellow-500"
    return "bg-green-500"
  }

  if (!password) return null

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Password Strength</span>
          <span className="font-medium text-slate-900">{getStrengthLabel()}</span>
        </div>
        <Progress value={strength} className="h-2" />
      </div>

      <div className="space-y-1">
        {requirements.map((requirement, index) => {
          const isMet = requirement.test(password)
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              {isMet ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <XCircle className="h-3 w-3 text-slate-400" />
              )}
              <span className={isMet ? "text-green-600" : "text-slate-500"}>{requirement.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
