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
