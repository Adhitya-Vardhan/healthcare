const API_BASE = "http://localhost:8000/api"

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export interface FileValidationResult {
  is_valid: boolean
  columns: string[]
  missing_columns: string[]
  extra_columns: string[]
  sample_data: Record<string, any>[]
  total_rows: number
  errors: Array<{
    row: number
    column: string
    error: string
  }>
}

// Backend response format
interface BackendValidationResponse {
  file_name: string
  original_columns: string[]
  normalized_columns: string[]
  row_count: number
  sample_data: Record<string, any>[]
}

export interface UploadResponse {
  batch_id: string
  message: string
  total_records: number
}

export class UploadAPI {
  static async validateFile(token: string, file: File): Promise<FileValidationResult> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`${API_BASE}/patients/debug-columns`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`File validation failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const backendResult: BackendValidationResponse = await response.json()
    
    // Validate the response structure
    if (!backendResult || typeof backendResult !== 'object') {
      throw new Error('Invalid validation response: expected object')
    }
    
    // Define required columns
    const REQUIRED_COLUMNS = ["Patient ID", "First Name", "Last Name", "Date of Birth", "Gender"]
    
    // Perform validation logic on frontend
    const originalColumns = Array.isArray(backendResult.original_columns) ? backendResult.original_columns : []
    const sampleData = Array.isArray(backendResult.sample_data) ? backendResult.sample_data : []
    const rowCount = Number(backendResult.row_count) || 0
    
    // Check for missing columns
    const missingColumns = REQUIRED_COLUMNS.filter(col => !originalColumns.includes(col))
    
    // Check for extra columns
    const extraColumns = originalColumns.filter(col => !REQUIRED_COLUMNS.includes(col))
    
    // Validate data and collect errors
    const errors: Array<{row: number, column: string, error: string}> = []
    
    sampleData.forEach((row, index) => {
      // Check Patient ID format
      const patientId = row["Patient ID"]
      if (patientId && typeof patientId === 'string' && !patientId.match(/^PAT\d+$/)) {
        errors.push({
          row: index + 1,
          column: "Patient ID",
          error: "Patient ID must be in format PAT followed by numbers (e.g., PAT001)"
        })
      }
      
      // Check Date of Birth format
      const dateOfBirth = row["Date of Birth"]
      if (dateOfBirth && typeof dateOfBirth === 'string') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(dateOfBirth)) {
          errors.push({
            row: index + 1,
            column: "Date of Birth",
            error: "Date must be in YYYY-MM-DD format"
          })
        } else {
          const date = new Date(dateOfBirth)
          if (isNaN(date.getTime())) {
            errors.push({
              row: index + 1,
              column: "Date of Birth",
              error: "Invalid date"
            })
          }
        }
      }
      
      // Check Gender values
      const gender = row["Gender"]
      if (gender && typeof gender === 'string') {
        const validGenders = ["Male", "Female", "Other"]
        if (!validGenders.includes(gender)) {
          errors.push({
            row: index + 1,
            column: "Gender",
            error: "Gender must be one of: Male, Female, Other"
          })
        }
      }
      
      // Check for required fields
      if (!row["Patient ID"]) {
        errors.push({
          row: index + 1,
          column: "Patient ID",
          error: "Patient ID is required"
        })
      }
      if (!row["First Name"]) {
        errors.push({
          row: index + 1,
          column: "First Name",
          error: "First Name is required"
        })
      }
      if (!row["Last Name"]) {
        errors.push({
          row: index + 1,
          column: "Last Name",
          error: "Last Name is required"
        })
      }
    })
    
    // Determine if file is valid
    const isValid = missingColumns.length === 0 && errors.length === 0
    
    // Return the expected format
    const validatedResult: FileValidationResult = {
      is_valid: isValid,
      columns: originalColumns,
      missing_columns: missingColumns,
      extra_columns: extraColumns,
      sample_data: sampleData,
      total_rows: rowCount,
      errors: errors
    }
    
    return validatedResult
  }

  static async uploadFile(token: string, file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`${API_BASE}/patients/upload`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`)
    }

    return response.json()
  }

  static async downloadTemplate(token: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/files/template`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Template download failed: ${response.statusText}`)
    }

    return response.blob()
  }
}
