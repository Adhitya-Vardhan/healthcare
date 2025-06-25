"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, AlertTriangle, FileSpreadsheet } from "lucide-react"
import type { FileValidationResult } from "@/lib/upload-api"

interface FileValidationPreviewProps {
  validation: FileValidationResult
  fileName: string
}

const REQUIRED_COLUMNS = ["Patient ID", "First Name", "Last Name", "Date of Birth", "Gender"]

export function FileValidationPreview({ validation, fileName }: FileValidationPreviewProps) {
  const hasErrors = !validation.is_valid || validation.errors.length > 0
  
  // Add safety checks for potentially undefined properties
  const columns = validation.columns || []
  const missingColumns = validation.missing_columns || []
  const extraColumns = validation.extra_columns || []
  const sampleData = validation.sample_data || []
  const errors = validation.errors || []
  const totalRows = validation.total_rows || 0

  return (
    <div className="space-y-4">
      {/* File Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-slate-600" />
            File Validation Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">{fileName}</p>
              <p className="text-sm text-slate-500">{totalRows} rows detected</p>
            </div>
            <Badge variant={hasErrors ? "destructive" : "default"} className="flex items-center gap-1">
              {hasErrors ? (
                <>
                  <XCircle className="h-3 w-3" />
                  Validation Failed
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Valid File
                </>
              )}
            </Badge>
          </div>

          {/* Column Validation */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900">Column Validation</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Required Columns</p>
                <div className="space-y-1">
                  {REQUIRED_COLUMNS.map((column) => {
                    const isPresent = columns.includes(column)
                    return (
                      <div key={column} className="flex items-center gap-2 text-sm">
                        {isPresent ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={isPresent ? "text-slate-700" : "text-red-600"}>{column}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Detected Columns</p>
                <div className="space-y-1">
                  {columns.length > 0 ? (
                    columns.map((column) => (
                      <div key={column} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-slate-700">{column}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No columns detected</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Missing Columns Alert */}
          {missingColumns.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Missing required columns:</strong> {missingColumns.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {/* Extra Columns Alert */}
          {extraColumns.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Extra columns detected:</strong> {extraColumns.join(", ")}. These will be ignored
                during upload.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Preview */}
      {sampleData.length > 0 && columns.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Data Preview (First 5 rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column} className="font-semibold text-slate-700">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {columns.map((column) => (
                        <TableCell key={column} className="text-slate-700">
                          {row[column] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Validation Errors ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {errors.slice(0, 10).map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertDescription>
                    <strong>
                      Row {error.row}, Column "{error.column}":
                    </strong>{" "}
                    {error.error}
                  </AlertDescription>
                </Alert>
              ))}
              {errors.length > 10 && (
                <p className="text-sm text-slate-500 text-center pt-2">
                  ... and {errors.length - 10} more errors
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
