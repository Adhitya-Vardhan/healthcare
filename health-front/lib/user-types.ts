export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  location: string
  team: string
  is_active: boolean
  created_at: string
  last_login?: string
}

export interface UsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  location: string
  team: string
}

export interface AvailabilityResponse {
  available: boolean
  message?: string
}

export interface ConfigOption {
  id: string
  name: string
  description?: string
}

export interface UserFilters {
  status?: "all" | "active" | "inactive"
  role?: string
  search?: string
}

export interface SortConfig {
  field: string
  direction: "asc" | "desc"
}
