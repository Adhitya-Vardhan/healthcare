"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileSpreadsheet, X, Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadAreaProps {
  onFileSelect: (file: File) => void
  onTemplateDownload: () => void
  selectedFile: File | null
  onFileRemove: () => void
  isLoading?: boolean
  disabled?: boolean
}

export function FileUploadArea({
  onFileSelect,
  onTemplateDownload,
  selectedFile,
  onFileRemove,
  isLoading = false,
  disabled = false,
}: FileUploadAreaProps) {
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && !disabled) {
        onFileSelect(acceptedFiles[0])
      }
      setDragActive(false)
    },
    [onFileSelect, disabled],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled: disabled || isLoading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (selectedFile) {
    return (
      <Card className="border-2 border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onFileRemove}
              disabled={isLoading}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragActive || dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <CardContent className="p-8">
          <input {...getInputProps()} />
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <Upload className={cn("h-6 w-6", isDragActive ? "text-blue-600" : "text-slate-600")} />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-900">
                {isDragActive ? "Drop your Excel file here" : "Upload Patient Data"}
              </p>
              <p className="text-sm text-slate-500 mt-1">Drag and drop your Excel file here, or click to browse</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span>Supported formats: .xlsx, .xls</span>
              <span>•</span>
              <span>Max size: 10MB</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={disabled || isLoading}
              onClick={(e) => e.stopPropagation()}
            >
              Choose File
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onTemplateDownload}
          disabled={isLoading}
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Excel Template
        </Button>
      </div>
    </div>
  )
}
