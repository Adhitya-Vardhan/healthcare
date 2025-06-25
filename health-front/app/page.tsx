"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  Users, 
  FileText, 
  BarChart3, 
  Lock, 
  ArrowRight,
  Heart,
  Activity,
  Database,
  CheckCircle
} from "lucide-react"

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLoginClick = () => {
    setIsLoading(true)
    // Navigate to login page
    window.location.href = "/login"
  }

  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Patient Management",
      description: "Comprehensive patient data management with secure access controls"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Data Analytics",
      description: "Advanced analytics and reporting for healthcare insights"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Real-time Monitoring",
      description: "Live system health monitoring and performance tracking"
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Secure Access",
      description: "Role-based access control with audit logging"
    }
  ]

  const stats = [
    { label: "Active Users", value: "500+", icon: <Users className="h-4 w-4" /> },
    { label: "Patients Managed", value: "10K+", icon: <Heart className="h-4 w-4" /> },
    { label: "Data Points", value: "1M+", icon: <Database className="h-4 w-4" /> },
    { label: "Uptime", value: "99.9%", icon: <Activity className="h-4 w-4" /> }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">HealthCare Portal</span>
            </div>
            <Button 
              onClick={handleLoginClick}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
            >
              {isLoading ? "Loading..." : "Sign In"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
              <CheckCircle className="mr-1 h-3 w-3" />
              HIPAA Compliant
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Modern Healthcare
              <span className="block text-blue-600">Management System</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 max-w-3xl mx-auto">
              Streamline your healthcare operations with our comprehensive patient management platform. 
              Secure, efficient, and designed for modern healthcare professionals.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button 
                onClick={handleLoginClick}
                disabled={isLoading}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg"
              >
                {isLoading ? "Loading..." : "Get Started"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3 rounded-lg font-medium"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need for modern healthcare
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Comprehensive tools designed to enhance patient care and streamline operations
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-slate-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your healthcare operations?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Join thousands of healthcare professionals who trust our platform
          </p>
          <div className="mt-10">
            <Button 
              onClick={handleLoginClick}
              disabled={isLoading}
              size="lg"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105"
            >
              {isLoading ? "Loading..." : "Start Today"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">HealthCare Portal</span>
            </div>
            <p className="text-slate-400">
              © 2024 HealthCare Portal. All rights reserved. HIPAA compliant and secure.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
