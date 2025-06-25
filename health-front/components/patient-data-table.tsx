"use client"
import { useState } from "react"
import type { Patient } from "@/lib/types"
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
import { Edit2, Save, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

interface PatientDataTableProps {
  patients: Patient[]
  total: number
  page: number
  limit: number
  totalPages: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onUpdatePatient: (patientId: number, updates: Partial<Patient>) => Promise<void>
  onDeletePatient: (patientId: number) => Promise<void>
}

export function PatientDataTable({
  patients,
  total,
  page,
  limit,
  totalPages,
  isLoading,
  onPageChange,
  onUpdatePatient,
  onDeletePatient,
}: PatientDataTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<Partial<Patient>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const handleEdit = (patient: Patient) => {
    setEditingId(patient.id)
    setEditingData({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
    })
  }

  const handleSave = async (patientId: number) => {
    setSavingId(patientId)
    try {
      await onUpdatePatient(patientId, editingData)
      setEditingId(null)
      setEditingData({})
    } catch (error) {
      console.error("Failed to save patient:", error)
    } finally {
      setSavingId(null)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleDelete = async (patientId: number) => {
    try {
      await onDeletePatient(patientId)
    } catch (error) {
      console.error("Failed to delete patient:", error)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy")
    } catch {
      return dateString
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">Patient Records ({total} total)</CardTitle>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            Page {page} of {totalPages}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-700">Patient ID</TableHead>
                <TableHead className="font-semibold text-slate-700">Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Date of Birth</TableHead>
                <TableHead className="font-semibold text-slate-700">Gender</TableHead>
                <TableHead className="font-semibold text-slate-700">Uploaded By</TableHead>
                <TableHead className="font-semibold text-slate-700">Last Updated</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Loading patients...
                  </TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No patients found
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">{patient.patient_id}</TableCell>
                    <TableCell>
                      {editingId === patient.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingData.first_name || ""}
                            onChange={(e) => setEditingData({ ...editingData, first_name: e.target.value })}
                            placeholder="First name"
                            className="h-8"
                          />
                          <Input
                            value={editingData.last_name || ""}
                            onChange={(e) => setEditingData({ ...editingData, last_name: e.target.value })}
                            placeholder="Last name"
                            className="h-8"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-900">
                          {patient.first_name} {patient.last_name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === patient.id ? (
                        <Input
                          type="date"
                          value={editingData.date_of_birth || ""}
                          onChange={(e) => setEditingData({ ...editingData, date_of_birth: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        <span className="text-slate-700">{formatDate(patient.date_of_birth)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === patient.id ? (
                        <Select
                          value={editingData.gender || ""}
                          onValueChange={(value) =>
                            setEditingData({ ...editingData, gender: value as Patient["gender"] })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className={
                            patient.gender === "Male"
                              ? "border-blue-200 text-blue-700"
                              : patient.gender === "Female"
                                ? "border-pink-200 text-pink-700"
                                : "border-slate-200 text-slate-700"
                          }
                        >
                          {patient.gender}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{patient.uploaded_by}</TableCell>
                    <TableCell className="text-slate-600">{formatDate(patient.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      {editingId === patient.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(patient.id)}
                            disabled={savingId === patient.id}
                            className="h-8 bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(patient)} className="h-8">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
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

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
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
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    disabled={isLoading}
                    className={pageNum === page ? "bg-slate-900 hover:bg-slate-800" : "border-slate-300"}
                  >
                    {pageNum}
                  </Button>
                )
              })}
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
