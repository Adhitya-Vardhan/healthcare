"use client"

import React from "react"

import { useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast"
import { useWebSocket } from "@/hooks/use-websocket"
import { UploadAPI, type FileValidationResult } from "@/lib/upload-api"
import { FileUploadArea } from "./file-upload-area"
import { FileValidationPreview } from "./file-validation-preview"
import { UploadProgressTracker } from "./upload-progress-tracker"
import { UploadResultsSummary } from "./upload-results-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Upload } from "lucide-react"
import type { UploadProgress, UploadComplete } from "@/hooks/use-websocket"

type UploadStep = "select" | "validate" | "upload" | "complete"

export function FileUploadInterface() {
  const { token } = useAuth()
  const { addToast } = useToast()
  const { lastMessage, isConnected } = useWebSocket()

  const [currentStep, setCurrentStep] = useState<UploadStep>("select")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<FileValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadComplete, setUploadComplete] = useState<UploadComplete | null>(null)

  // Handle WebSocket messages
  React.useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case "upload_progress":
        const progressData = lastMessage.data as UploadProgress
        if (progressData.batch_id === batchId) {
          setUploadProgress(progressData)
        }
        break

      case "upload_complete":
        const completeData = lastMessage.data as UploadComplete
        if (completeData.batch_id === batchId) {
          setUploadComplete(completeData)
          setIsUploading(false)
          setCurrentStep("complete")
          addToast({
            type: completeData.failed_records === 0 ? "success" : "warning",
            title: "Upload Complete",
            description: `${completeData.successful_records} of ${completeData.total_records} records uploaded successfully`,
          })
        }
        break

      case "error":
        setIsUploading(false)
        addToast({
          type: "error",
          title: "Upload Error",
          description: lastMessage.data.message || "An error occurred during upload",
        })
        break
    }
  }, [lastMessage, batchId, addToast])

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!token) return

      setSelectedFile(file)
      setIsValidating(true)
      setValidation(null)

      try {
        const validationResult = await UploadAPI.validateFile(token, file)
        setValidation(validationResult)
        setCurrentStep("validate")

        if (!validationResult.is_valid) {
          addToast({
            type: "error",
            title: "File Validation Failed",
            description: "Please fix the errors in your file before uploading",
          })
        }
      } catch (error) {
        addToast({
          type: "error",
          title: "Validation Error",
          description: error instanceof Error ? error.message : "Failed to validate file",
        })
      } finally {
        setIsValidating(false)
      }
    },
    [token, addToast],
  )

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null)
    setValidation(null)
    setCurrentStep("select")
  }, [])

  const handleTemplateDownload = useCallback(async () => {
    if (!token) return

    try {
      const blob = await UploadAPI.downloadTemplate(token)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "patient_data_template.xlsx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addToast({
        type: "success",
        title: "Template Downloaded",
        description: "Excel template has been downloaded successfully",
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download template",
      })
    }
  }, [token, addToast])

  const handleUpload = useCallback(async () => {
    if (!token || !selectedFile || !validation?.is_valid) return

    setIsUploading(true)
    setCurrentStep("upload")
    setUploadProgress(null)
    setUploadComplete(null)

    try {
      const response = await UploadAPI.uploadFile(token, selectedFile)
      setBatchId(response.batch_id)

      addToast({
        type: "info",
        title: "Upload Started",
        description: `Processing ${response.total_records} records...`,
      })
    } catch (error) {
      setIsUploading(false)
      setCurrentStep("validate")
      addToast({
        type: "error",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to start upload",
      })
    }
  }, [token, selectedFile, validation, addToast])

  const handleCancelUpload = useCallback(() => {
    setIsUploading(false)
    setCurrentStep("validate")
    setBatchId(null)
    setUploadProgress(null)
    addToast({
      type: "info",
      title: "Upload Cancelled",
      description: "File upload has been cancelled",
    })
  }, [addToast])

  const handleNewUpload = useCallback(() => {
    setCurrentStep("select")
    setSelectedFile(null)
    setValidation(null)
    setBatchId(null)
    setUploadProgress(null)
    setUploadComplete(null)
  }, [])

  const handleDownloadErrorReport = useCallback(() => {
    // Implementation for downloading error report
    addToast({
      type: "info",
      title: "Feature Coming Soon",
      description: "Error report download will be available soon",
    })
  }, [addToast])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Patient Data Upload</h2>
        <p className="text-slate-600">Upload Excel files containing patient information</p>
      </div>

      {/* WebSocket Connection Status */}
      {!isConnected && currentStep === "upload" && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-yellow-800 text-sm">
              Real-time updates unavailable. Upload will continue, but progress may not be visible.
            </p>
          </CardContent>
        </Card>
      )}

      {/* File Upload Area */}
      {currentStep === "select" && (
        <FileUploadArea
          onFileSelect={handleFileSelect}
          onTemplateDownload={handleTemplateDownload}
          selectedFile={selectedFile}
          onFileRemove={handleFileRemove}
          isLoading={isValidating}
        />
      )}

      {/* Validation Loading */}
      {isValidating && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-lg font-medium text-slate-900">Validating File...</p>
            <p className="text-sm text-slate-500">Checking columns and data format</p>
          </CardContent>
        </Card>
      )}

      {/* File Validation Preview */}
      {currentStep === "validate" && validation && selectedFile && (
        <div className="space-y-6">
          <FileValidationPreview validation={validation} fileName={selectedFile.name} />

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleFileRemove}>
              Choose Different File
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!validation.is_valid || isUploading}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Upload className="h-4 w-4 mr-2" />
              Start Upload
            </Button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {(currentStep === "upload" || currentStep === "complete") && (
        <UploadProgressTracker
          batchId={batchId}
          progress={uploadProgress}
          complete={uploadComplete}
          onCancel={handleCancelUpload}
          isUploading={isUploading}
        />
      )}

      {/* Upload Results */}
      {currentStep === "complete" && uploadComplete && (
        <UploadResultsSummary
          results={uploadComplete}
          onNewUpload={handleNewUpload}
          onDownloadErrorReport={handleDownloadErrorReport}
        />
      )}
    </div>
  )
}
