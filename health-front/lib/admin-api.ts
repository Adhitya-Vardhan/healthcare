import type { User, UsersResponse, CreateUserRequest, AvailabilityResponse, ConfigOption } from "./user-types"

const API_BASE = "http://localhost:8000/api"

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

export interface UserFilters {
  search?: string
  role?: string
  location?: string
  team?: string
  status?: "active" | "inactive" | "all"
}

export interface SortConfig {
  field: keyof User
  direction: "asc" | "desc"
}

export class AdminAPI {
  static async getUsers(
    token: string,
    page = 1,
    limit = 10,
    filters?: UserFilters,
    sort?: SortConfig,
  ): Promise<UsersResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (filters?.search) params.append("search", filters.search)
    if (filters?.role) params.append("role", filters.role)
    if (filters?.location) params.append("location", filters.location)
    if (filters?.team) params.append("team", filters.team)
    if (filters?.status && filters.status !== "all") params.append("status", filters.status)

    if (sort) {
      params.append("sort_by", sort.field)
      params.append("sort_order", sort.direction)
    }

    const response = await fetch(`${API_BASE}/admin/users?${params}`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`)
    }

    return response.json()
  }

  static async createUser(token: string, userData: CreateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`)
    }

    return response.json()
  }

  static async checkAvailability(
    token: string,
    field: "username" | "email",
    value: string,
  ): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({ [field]: value })

    const response = await fetch(`${API_BASE}/admin/users/check-availability?${params}`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to check availability: ${response.statusText}`)
    }

    return response.json()
  }

  static async updateUserStatus(token: string, userId: number, isActive: boolean): Promise<User> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ is_active: isActive }),
    })

    if (!response.ok) {
      throw new Error(`Failed to update user status: ${response.statusText}`)
    }

    return response.json()
  }

  static async getRoles(token: string): Promise<ConfigOption[]> {
    const response = await fetch(`${API_BASE}/config/roles`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.statusText}`)
    }

    return response.json()
  }

  static async getLocations(token: string): Promise<ConfigOption[]> {
    const response = await fetch(`${API_BASE}/config/locations`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.statusText}`)
    }

    return response.json()
  }

  static async getTeams(token: string): Promise<ConfigOption[]> {
    const response = await fetch(`${API_BASE}/config/teams`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`)
    }

    return response.json()
  }
}
