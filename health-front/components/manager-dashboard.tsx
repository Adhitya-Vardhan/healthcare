"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import type { Patient, PatientsResponse, PatientFilters } from "@/lib/types"
import { PatientAPI } from "@/lib/patient-api"
import { PatientFiltersComponent } from "./patient-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, FileText, TrendingUp } from "lucide-react"
import { EnhancedPatientTable } from "./enhanced-patient-table"
import type { SortConfig } from "@/lib/patient-api"
import { FileUploadInterface } from "./file-upload-interface"
import { Button } from "@/components/ui/button"
import { FileExportManager } from "./file-export-manager"

export function ManagerDashboard() {
  const { token } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<PatientFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "patient_id", direction: "asc" })
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"dashboard" | "upload" | "files">("dashboard")

  const fetchPatients = useCallback(
    async (page = 1, currentFilters: PatientFilters = {}, currentSort?: SortConfig, search?: string) => {
      if (!token) return

      setIsLoading(true)
      setError(null)

      try {
        const searchFilters = search ? { ...currentFilters, search } : currentFilters
        let response: PatientsResponse

        if (Object.keys(searchFilters).some((key) => searchFilters[key as keyof PatientFilters])) {
          response = await PatientAPI.searchPatients(token, searchFilters, page, pagination.limit)
        } else {
          response = await PatientAPI.getPatients(token, page, pagination.limit, searchFilters, currentSort)
        }

        setPatients(response.patients)
        setPagination({
          total: response.total,
          page: response.page,
          limit: response.limit,
          total_pages: response.total_pages,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch patients")
      } finally {
        setIsLoading(false)
      }
    },
    [token, pagination.limit],
  )

  useEffect(() => {
    fetchPatients(1, filters, sortConfig, searchQuery)
  }, [fetchPatients, filters, sortConfig, searchQuery])

  const handleFiltersChange = (newFilters: PatientFilters) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    fetchPatients(page, filters, sortConfig, searchQuery)
  }

  const handleUpdatePatient = async (patientId: number, updates: Partial<Patient>) => {
    if (!token) return

    try {
      const updatedPatient = await PatientAPI.updatePatient(token, patientId, updates)
      setPatients((prev) =>
        prev.map((patient) => (patient.id === patientId ? { ...patient, ...updatedPatient } : patient)),
      )
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to update patient")
    }
  }

  const handleDeletePatient = async (patientId: number) => {
    if (!token) return

    try {
      await PatientAPI.deletePatient(token, patientId)
      setPatients((prev) => prev.filter((patient) => patient.id !== patientId))
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete patient")
    }
  }

  const handleSortChange = (newSort: SortConfig) => {
    setSortConfig(newSort)
    fetchPatients(1, filters, newSort, searchQuery)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    fetchPatients(1, filters, sortConfig, query)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }))
    fetchPatients(1, filters, sortConfig, searchQuery)
  }

  // Calculate stats
  const stats = {
    totalPatients: pagination.total,
    malePatients: patients.filter((p) => p.gender === "Male").length,
    femalePatients: patients.filter((p) => p.gender === "Female").length,
    recentUploads: patients.filter((p) => {
      const uploadDate = new Date(p.uploaded_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return uploadDate > weekAgo
    }).length,
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Manager Dashboard</h1>
        <div className="flex gap-4 mt-4">
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveTab("dashboard")}
            className={activeTab === "dashboard" ? "bg-slate-900 hover:bg-slate-800" : ""}
          >
            Patient Management
          </Button>
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            className={activeTab === "upload" ? "bg-slate-900 hover:bg-slate-800" : ""}
          >
            File Upload
          </Button>
          <Button
            variant={activeTab === "files" ? "default" : "outline"}
            onClick={() => setActiveTab("files")}
            className={activeTab === "files" ? "bg-slate-900 hover:bg-slate-800" : ""}
          >
            File Management
          </Button>
        </div>
      </div>

      {activeTab === "dashboard" && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Patients</CardTitle>
                <Users className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stats.totalPatients}</div>
                <p className="text-xs text-slate-500">Active patient records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Male Patients</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stats.malePatients}</div>
                <p className="text-xs text-slate-500">Current page</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Female Patients</CardTitle>
                <FileText className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stats.femalePatients}</div>
                <p className="text-xs text-slate-500">Current page</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Recent Uploads</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stats.recentUploads}</div>
                <p className="text-xs text-slate-500">Last 7 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search and Filters */}
          <PatientFiltersComponent onFiltersChange={handleFiltersChange} isLoading={isLoading} />

          {/* Patient Data Table */}
          <EnhancedPatientTable
            patients={patients}
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
            totalPages={pagination.total_pages}
            isLoading={isLoading}
            sortConfig={sortConfig}
            searchQuery={searchQuery}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
            onSearchChange={handleSearchChange}
            onUpdatePatient={handleUpdatePatient}
            onDeletePatient={handleDeletePatient}
          />
        </>
      )}

      {activeTab === "upload" && <FileUploadInterface />}
      {activeTab === "files" && <FileExportManager />}
    </div>
  )
}
