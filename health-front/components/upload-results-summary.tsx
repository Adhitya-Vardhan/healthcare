"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, Download, RefreshCw } from "lucide-react"
import type { UploadComplete } from "@/hooks/use-websocket"

interface UploadResultsSummaryProps {
  results: UploadComplete
  onNewUpload: () => void
  onDownloadErrorReport?: () => void
}

export function UploadResultsSummary({ results, onNewUpload, onDownloadErrorReport }: UploadResultsSummaryProps) {
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  const successRate = results.success_rate
  const hasErrors = results.failed_records > 0

  const getStatusIcon = () => {
    if (successRate >= 95) return <CheckCircle className="h-6 w-6 text-green-600" />
    if (successRate >= 80) return <AlertTriangle className="h-6 w-6 text-yellow-600" />
    return <XCircle className="h-6 w-6 text-red-600" />
  }

  const getStatusColor = () => {
    if (successRate >= 95) return "text-green-600"
    if (successRate >= 80) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusMessage = () => {
    if (successRate === 100) return "All records uploaded successfully!"
    if (successRate >= 95) return "Upload completed with minimal errors"
    if (successRate >= 80) return "Upload completed with some errors"
    return "Upload completed with significant errors"
  }

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Upload Results</h3>
            <p className={`text-sm ${getStatusColor()}`}>{getStatusMessage()}</p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{results.total_records}</p>
            <p className="text-sm text-slate-600">Total Records</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{results.successful_records}</p>
            <p className="text-sm text-slate-600">Successful</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{results.failed_records}</p>
            <p className="text-sm text-slate-600">Failed</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{successRate.toFixed(1)}%</p>
            <p className="text-sm text-slate-600">Success Rate</p>
          </div>
        </div>

        {/* Success Message */}
        {!hasErrors && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Congratulations! All {results.total_records} patient records have been successfully uploaded to the
              system.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Summary */}
        {hasErrors && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {results.failed_records} out of {results.total_records} records failed to upload. Please review the
                errors below and correct the data before re-uploading.
              </AlertDescription>
            </Alert>

            {/* Error Details */}
            {results.error_details && results.error_details.length > 0 && (
              <Collapsible open={showErrorDetails} onOpenChange={setShowErrorDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>View Error Details ({results.error_details.length} errors)</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showErrorDetails ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-4">
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {results.error_details.slice(0, 20).map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription>
                          <strong>Row {error.row}:</strong> {error.errors.join(", ")}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {results.error_details.length > 20 && (
                      <p className="text-sm text-slate-500 text-center pt-2">
                        ... and {results.error_details.length - 20} more errors
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onNewUpload} className="flex-1 bg-slate-900 hover:bg-slate-800">
            <RefreshCw className="h-4 w-4 mr-2" />
            Upload Another File
          </Button>
          {hasErrors && onDownloadErrorReport && (
            <Button variant="outline" onClick={onDownloadErrorReport} className="flex-1 border-red-200 text-red-600">
              <Download className="h-4 w-4 mr-2" />
              Download Error Report
            </Button>
          )}
        </div>

        {/* Batch Information */}
        <div className="text-center pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Batch ID: <code className="bg-slate-100 px-2 py-1 rounded text-slate-700">{results.batch_id}</code>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
