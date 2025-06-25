export interface UserProfile {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: {
    id: number
    name: string
    description: string
  }
  location: {
    id: number
    code: string
    name: string
  }
  team: {
    id: number
    code: string
    name: string
  }
  is_active: boolean
  created_at: string
  last_login?: string
}

export interface UpdateProfileRequest {
  first_name: string
  last_name: string
  email: string
  phone?: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface ExportOptions {
  format: "xlsx" | "csv" | "json"
  start_date?: string
  end_date?: string
  include_metadata: boolean
  batch_id?: string
}

export interface ExportJob {
  id: string
  format: string
  status: "pending" | "processing" | "completed" | "failed"
  file_url?: string
  file_size?: number
  record_count?: number
  created_at: string
  completed_at?: string
  error_message?: string
}

export interface UploadHistory {
  batch_id: string
  original_filename: string
  file_size: number
  total_records: number
  successful_records: number
  failed_records: number
  status: "completed" | "partial" | "failed"
  processing_started_at: string
  processing_completed_at?: string
  success_rate: number
  download_url?: string
}

export interface TemplateInfo {
  id: string
  name: string
  description: string
  file_size: number
  download_url: string
  sample_records?: number
}
