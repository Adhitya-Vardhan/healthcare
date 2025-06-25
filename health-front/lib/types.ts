export interface Patient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: "Male" | "Female" | "Other"
  uploaded_by: string
  uploaded_at: string
  updated_at: string
}

export interface PatientsResponse {
  patients: Patient[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface PatientFilters {
  search?: string
  gender?: string
  uploaded_by?: string
  date_from?: string
  date_to?: string
}

export interface SortConfig {
  field: keyof Patient
  direction: "asc" | "desc"
}
