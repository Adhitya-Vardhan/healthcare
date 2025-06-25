"use client"
import { useState, useMemo } from "react"
import type { Patient, SortConfig } from "@/lib/types"
import { validatePatientData, type ValidationError } from "@/lib/validation"
import { useToast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Edit2,
  Save,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Search,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface EnhancedPatientTableProps {
  patients: Patient[]
  total: number
  page: number
  limit: number
  totalPages: number
  isLoading?: boolean
  sortConfig?: SortConfig
  searchQuery?: string
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onSortChange: (sort: SortConfig) => void
  onSearchChange: (query: string) => void
  onUpdatePatient: (patientId: number, updates: Partial<Patient>) => Promise<void>
  onDeletePatient: (patientId: number) => Promise<void>
}

interface EditingState {
  id: number | null
  data: Partial<Patient>
  errors: ValidationError[]
  isSaving: boolean
}

export function EnhancedPatientTable({
  patients,
  total,
  page,
  limit,
  totalPages,
  isLoading,
  sortConfig,
  searchQuery = "",
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  onUpdatePatient,
  onDeletePatient,
}: EnhancedPatientTableProps) {
  const { addToast } = useToast()
  const [editing, setEditing] = useState<EditingState>({
    id: null,
    data: {},
    errors: [],
    isSaving: false,
  })
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleSort = (field: keyof Patient) => {
    const direction = sortConfig?.field === field && sortConfig.direction === "asc" ? "desc" : "asc"
    onSortChange({ field, direction })
  }

  const getSortIcon = (field: keyof Patient) => {
    if (sortConfig?.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-slate-400" />
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-4 w-4 text-slate-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-slate-600" />
    )
  }

  const handleEdit = (patient: Patient) => {
    setEditing({
      id: patient.id,
      data: {
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
      },
      errors: [],
      isSaving: false,
    })
  }

  const handleEditChange = (field: keyof Patient, value: string) => {
    setEditing((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      errors: prev.errors.filter((error) => error.field !== field),
    }))
  }

  const handleSave = async (patientId: number) => {
    const validationErrors = validatePatientData(editing.data)

    if (validationErrors.length > 0) {
      setEditing((prev) => ({ ...prev, errors: validationErrors }))
      addToast({
        type: "error",
        title: "Validation Error",
        description: "Please fix the errors before saving.",
      })
      return
    }

    setEditing((prev) => ({ ...prev, isSaving: true }))

    try {
      await onUpdatePatient(patientId, editing.data)
      setEditing({ id: null, data: {}, errors: [], isSaving: false })
      addToast({
        type: "success",
        title: "Patient Updated",
        description: "Patient record has been successfully updated.",
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update patient",
      })
      setEditing((prev) => ({ ...prev, isSaving: false }))
    }
  }

  const handleCancel = () => {
    setEditing({ id: null, data: {}, errors: [], isSaving: false })
  }

  const handleDelete = async (patientId: number) => {
    setDeletingId(patientId)
    try {
      await onDeletePatient(patientId)
      addToast({
        type: "success",
        title: "Patient Deleted",
        description: "Patient record has been successfully deleted.",
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete patient",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getFieldError = (field: string) => {
    return editing.errors.find((error) => error.field === field)?.message
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy")
    } catch {
      return dateString
    }
  }

  const pageNumbers = useMemo(() => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i)
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (page + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }, [page, totalPages])

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Patient Records ({total} total)</CardTitle>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="pageSize" className="text-sm text-slate-600 whitespace-nowrap">
                Show:
              </Label>
              <Select value={(limit || 10).toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("patient_id")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Patient ID
                      {getSortIcon("patient_id")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("first_name")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Name
                      {getSortIcon("first_name")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("date_of_birth")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Date of Birth
                      {getSortIcon("date_of_birth")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("gender")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Gender
                      {getSortIcon("gender")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">Uploaded By</TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("uploaded_at")}
                      className="h-auto p-0 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Upload Date
                      {getSortIcon("uploaded_at")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-slate-500">Loading patients...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !patients || patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-slate-50 transition-colors">
                      {/* Patient ID - Read Only */}
                      <TableCell className="font-medium text-slate-900">{patient.patient_id}</TableCell>

                      {/* Name - Editable */}
                      <TableCell>
                        {editing.id === patient.id ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  value={editing.data.first_name || ""}
                                  onChange={(e) => handleEditChange("first_name", e.target.value)}
                                  placeholder="First name"
                                  className={cn(
                                    "h-8",
                                    getFieldError("first_name") && "border-red-300 focus:border-red-500",
                                  )}
                                />
                                {getFieldError("first_name") && (
                                  <p className="text-xs text-red-600 mt-1">{getFieldError("first_name")}</p>
                                )}
                              </div>
                              <div className="flex-1">
                                <Input
                                  value={editing.data.last_name || ""}
                                  onChange={(e) => handleEditChange("last_name", e.target.value)}
                                  placeholder="Last name"
                                  className={cn(
                                    "h-8",
                                    getFieldError("last_name") && "border-red-300 focus:border-red-500",
                                  )}
                                />
                                {getFieldError("last_name") && (
                                  <p className="text-xs text-red-600 mt-1">{getFieldError("last_name")}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-900">
                            {patient.first_name} {patient.last_name}
                          </span>
                        )}
                      </TableCell>

                      {/* Date of Birth - Editable */}
                      <TableCell>
                        {editing.id === patient.id ? (
                          <div>
                            <Input
                              type="date"
                              value={editing.data.date_of_birth || ""}
                              onChange={(e) => handleEditChange("date_of_birth", e.target.value)}
                              className={cn(
                                "h-8",
                                getFieldError("date_of_birth") && "border-red-300 focus:border-red-500",
                              )}
                            />
                            {getFieldError("date_of_birth") && (
                              <p className="text-xs text-red-600 mt-1">{getFieldError("date_of_birth")}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-700">{formatDate(patient.date_of_birth)}</span>
                        )}
                      </TableCell>

                      {/* Gender - Editable */}
                      <TableCell>
                        {editing.id === patient.id ? (
                          <div>
                            <Select
                              value={editing.data.gender || ""}
                              onValueChange={(value) => handleEditChange("gender", value)}
                            >
                              <SelectTrigger
                                className={cn("h-8", getFieldError("gender") && "border-red-300 focus:border-red-500")}
                              >
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            {getFieldError("gender") && (
                              <p className="text-xs text-red-600 mt-1">{getFieldError("gender")}</p>
                            )}
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className={
                              patient.gender === "Male"
                                ? "border-blue-200 text-blue-700 bg-blue-50"
                                : patient.gender === "Female"
                                  ? "border-pink-200 text-pink-700 bg-pink-50"
                                  : "border-slate-200 text-slate-700 bg-slate-50"
                            }
                          >
                            {patient.gender}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Uploaded By - Read Only */}
                      <TableCell className="text-slate-600">{patient.uploaded_by}</TableCell>

                      {/* Upload Date - Read Only */}
                      <TableCell className="text-slate-600">{formatDate(patient.uploaded_at)}</TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {editing.id === patient.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(patient.id)}
                              disabled={editing.isSaving}
                              className="h-8 bg-green-600 hover:bg-green-700"
                            >
                              {editing.isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              className="h-8"
                              disabled={editing.isSaving}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(patient)}
                              className="h-8 hover:bg-slate-50"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                                  disabled={deletingId === patient.id}
                                >
                                  {deletingId === patient.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Patient Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the record for{" "}
                                    <strong>
                                      {patient.first_name} {patient.last_name}
                                    </strong>
                                    ? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(patient.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Enhanced Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
          <div className="text-sm text-slate-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} patients
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="border-slate-300"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNum, index) =>
                pageNum === "..." ? (
                  <span key={index} className="px-2 text-slate-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(Number(pageNum))}
                    disabled={isLoading}
                    className={cn(
                      "w-8 h-8 p-0",
                      pageNum === page ? "bg-slate-900 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    {pageNum}
                  </Button>
                ),
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="border-slate-300"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
