"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, X } from "lucide-react"
import type { UploadProgress, UploadComplete } from "@/hooks/use-websocket"

interface UploadProgressTrackerProps {
  batchId: string | null
  progress: UploadProgress | null
  complete: UploadComplete | null
  onCancel: () => void
  isUploading: boolean
}

export function UploadProgressTracker({
  batchId,
  progress,
  complete,
  onCancel,
  isUploading,
}: UploadProgressTrackerProps) {
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)

  useEffect(() => {
    if (isUploading && !startTime) {
      setStartTime(Date.now())
      setTimeElapsed(0)
    } else if (!isUploading) {
      setStartTime(null)
    }
  }, [isUploading, startTime])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isUploading && startTime) {
      interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isUploading, startTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!isUploading && !complete) {
    return null
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {complete ? (
              complete.failed_records === 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Upload Complete
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-yellow-600" />
                  Upload Complete with Errors
                </>
              )
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Uploading Patient Data
              </>
            )}
          </CardTitle>
          {!complete && (
            <Button variant="outline" size="sm" onClick={onCancel} className="border-red-200 text-red-600">
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {!complete && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{progress?.message || "Preparing upload..."}</span>
              <span className="font-medium">{progress?.progress || 0}%</span>
            </div>
            <Progress value={progress?.progress || 0} className="h-2" />
          </div>
        )}

        {/* Upload Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{complete?.total_records || 0}</p>
            <p className="text-xs text-slate-500">Total Records</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{complete?.successful_records || 0}</p>
            <p className="text-xs text-slate-500">Successful</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{complete?.failed_records || 0}</p>
            <p className="text-xs text-slate-500">Failed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{formatTime(timeElapsed)}</p>
            <p className="text-xs text-slate-500">Time Elapsed</p>
          </div>
        </div>

        {/* Success Rate */}
        {complete && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-slate-600">Success Rate:</span>
            <Badge
              variant={
                complete.success_rate >= 95 ? "default" : complete.success_rate >= 80 ? "secondary" : "destructive"
              }
              className="font-medium"
            >
              {complete.success_rate.toFixed(1)}%
            </Badge>
          </div>
        )}

        {/* Batch ID */}
        {batchId && (
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Batch ID: <code className="bg-slate-100 px-1 rounded text-slate-700">{batchId}</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
