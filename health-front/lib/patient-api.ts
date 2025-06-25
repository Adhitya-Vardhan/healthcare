import type { Patient, PatientsResponse, PatientFilters } from "./types"

const API_BASE = "http://localhost:8000/api"

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

export interface SortConfig {
  field: keyof Patient
  direction: "asc" | "desc"
}

export class PatientAPI {
  static async getPatients(
    token: string,
    page = 1,
    limit = 10,
    filters?: PatientFilters,
    sort?: SortConfig,
  ): Promise<PatientsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (filters?.search) params.append("search", filters.search)
    if (filters?.gender) params.append("gender", filters.gender)
    if (filters?.uploaded_by) params.append("uploaded_by", filters.uploaded_by)
    if (filters?.date_from) params.append("date_from", filters.date_from)
    if (filters?.date_to) params.append("date_to", filters.date_to)

    if (sort) {
      params.append("sort_by", sort.field)
      params.append("sort_order", sort.direction)
    }

    const response = await fetch(`${API_BASE}/patients?${params}`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch patients: ${response.statusText}`)
    }

    return response.json()
  }

  static async searchPatients(token: string, filters: PatientFilters, page = 1, limit = 10): Promise<PatientsResponse> {
    const response = await fetch(`${API_BASE}/patients/search`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        ...filters,
        page,
        limit,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to search patients: ${response.statusText}`)
    }

    return response.json()
  }

  static async updatePatient(token: string, patientId: number, updates: Partial<Patient>): Promise<Patient> {
    const response = await fetch(`${API_BASE}/patients/${patientId}`, {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error(`Failed to update patient: ${response.statusText}`)
    }

    return response.json()
  }

  static async deletePatient(token: string, patientId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/patients/${patientId}`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete patient: ${response.statusText}`)
    }
  }
}
