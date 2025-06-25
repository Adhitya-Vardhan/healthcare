"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast"
import { ProfileAPI } from "@/lib/profile-api"
import type { ExportOptions, ExportJob, UploadHistory, TemplateInfo } from "@/lib/profile-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { format } from "date-fns"

export function FileExportManager() {
  const { token } = useAuth()
  const { addToast } = useToast()

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "xlsx",
    include_metadata: false,
  })

  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([])
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const [templatesData, historyData] = await Promise.all([
        ProfileAPI.getTemplates(token),
        ProfileAPI.getUploadHistory(token),
      ])

      setTemplates(templatesData)
      setUploadHistory(historyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    if (!token) return

    setIsExporting(true)

    try {
      const exportJob = await ProfileAPI.exportData(token, exportOptions)
      setExportJobs((prev) => [exportJob, ...prev])

      addToast({
        type: "success",
        title: "Export Started",
        description: "Your data export has been queued for processing",
      })

      // Poll for export status
      pollExportStatus(exportJob.id)
    } catch (error) {
      addToast({
        type: "error",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to start export",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const pollExportStatus = async (exportId: string) => {
    if (!token) return

    const pollInterval = setInterval(async () => {
      try {
        const status = await ProfileAPI.getExportStatus(token, exportId)
        setExportJobs((prev) => prev.map((job) => (job.id === exportId ? status : job)))

        if (status.status === "completed" || status.status === "failed") {
          clearInterval(pollInterval)

          if (status.status === "completed") {
            addToast({
              type: "success",
              title: "Export Complete",
              description: "Your data export is ready for download",
            })
          } else {
            addToast({
              type: "error",
              title: "Export Failed",
              description: status.error_message || "Export processing failed",
            })
          }
        }
      } catch (error) {
        clearInterval(pollInterval)
        console.error("Failed to poll export status:", error)
      }
    }, 3000)

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000)
  }

  const handleDownloadTemplate = async (templateId: string, templateName: string) => {
    if (!token) return

    try {
      const blob = await ProfileAPI.downloadTemplate(token, templateId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${templateName.toLowerCase().replace(/\s+/g, "_")}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addToast({
        type: "success",
        title: "Template Downloaded",
        description: `${templateName} template has been downloaded`,
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download template",
      })
    }
  }

  const handleDownloadExport = async (exportId: string, format: string) => {
    if (!token) return

    try {
      const blob = await ProfileAPI.downloadExport(token, exportId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `patient_export_${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addToast({
        type: "success",
        title: "Export Downloaded",
        description: "Export file has been downloaded successfully",
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download export",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm")
    } catch {
      return dateString
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "partial":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "failed":
        return "bg-red-100 text-red-800 border-red-200"
      case "partial":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-slate-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-4 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">File Management</h2>
          <p className="text-slate-600">Export patient data and download templates</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Export Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Patient Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={exportOptions.format}
              onValueChange={(value) => setExportOptions((prev) => ({ ...prev, format: value as any }))}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  CSV (.csv)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-600" />
                  JSON (.json)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={exportOptions.start_date || ""}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={exportOptions.end_date || ""}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include_metadata"
                checked={exportOptions.include_metadata}
                onCheckedChange={(checked) =>
                  setExportOptions((prev) => ({ ...prev, include_metadata: checked as boolean }))
                }
              />
              <Label htmlFor="include_metadata" className="text-sm">
                Include metadata (upload timestamps, user information)
              </Label>
            </div>
          </div>

          {/* Export Button */}
          <Button onClick={handleExport} disabled={isExporting} className="bg-slate-900 hover:bg-slate-800">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Starting Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Start Export
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="border border-slate-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-slate-900">{template.name}</h4>
                      <p className="text-sm text-slate-600">{template.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{formatFileSize(template.file_size)}</span>
                      {template.sample_records && <span>{template.sample_records} sample records</span>}
                    </div>
                    <Button
                      onClick={() => handleDownloadTemplate(template.id, template.name)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Jobs */}
      {exportJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Export Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exportJobs.map((job) => (
                <div key={job.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(job.status)}>
                        {getStatusIcon(job.status)}
                        {job.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-slate-600">{job.format.toUpperCase()} Export</span>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(job.created_at)}</span>
                  </div>

                  {job.status === "processing" && (
                    <div className="mb-2">
                      <Progress value={50} className="h-2" />
                      <p className="text-xs text-slate-500 mt-1">Processing...</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      {job.record_count && <span>{job.record_count} records</span>}
                      {job.file_size && <span> • {formatFileSize(job.file_size)}</span>}
                    </div>
                    {job.status === "completed" && job.file_url && (
                      <Button onClick={() => handleDownloadExport(job.id, job.format)} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>

                  {job.error_message && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription className="text-sm">{job.error_message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No upload history found
                    </TableCell>
                  </TableRow>
                ) : (
                  uploadHistory.map((upload) => (
                    <TableRow key={upload.batch_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{upload.original_filename}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(upload.file_size)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-slate-900">{upload.total_records} total</p>
                          <p className="text-xs text-slate-500">
                            {upload.successful_records} success, {upload.failed_records} failed
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={upload.success_rate} className="h-2 w-16" />
                          <span className="text-sm text-slate-700">{upload.success_rate.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(upload.status)}>
                          {getStatusIcon(upload.status)}
                          {upload.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{formatDate(upload.processing_started_at)}</TableCell>
                      <TableCell className="text-right">
                        {upload.download_url && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
