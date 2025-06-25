import type { AuditStats, AuditFilters, AuditResponse, SystemHealth, SecurityReport } from "./audit-types"

const API_BASE = "http://localhost:8000/api"

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

export class AuditAPI {
  static async getAuditLogs(token: string, page = 1, limit = 20, filters?: AuditFilters): Promise<AuditResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (filters?.user_id) params.append("user_id", filters.user_id.toString())
    if (filters?.action) params.append("action", filters.action)
    if (filters?.resource_type) params.append("resource_type", filters.resource_type)
    if (filters?.ip_address) params.append("ip_address", filters.ip_address)
    if (filters?.start_date) params.append("start_date", filters.start_date)
    if (filters?.end_date) params.append("end_date", filters.end_date)

    const response = await fetch(`${API_BASE}/audit/user-activity?${params}`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Validate and ensure the response has the expected structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid audit logs response: expected object')
    }
    
    // Return a valid response with defaults for missing properties
    return {
      logs: Array.isArray(data.logs) ? data.logs : [],
      total: Number(data.total) || 0,
      page: Number(data.page) || 1,
      limit: Number(data.limit) || 20,
      total_pages: Number(data.total_pages) || 0,
    }
  }

  static async getAuditStats(token: string): Promise<AuditStats> {
    const response = await fetch(`${API_BASE}/audit/stats`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch audit stats: ${response.statusText}`)
    }

    return response.json()
  }

  static async exportAuditLogs(token: string, filters?: AuditFilters): Promise<Blob> {
    const params = new URLSearchParams()

    if (filters?.user_id) params.append("user_id", filters.user_id.toString())
    if (filters?.action) params.append("action", filters.action)
    if (filters?.resource_type) params.append("resource_type", filters.resource_type)
    if (filters?.ip_address) params.append("ip_address", filters.ip_address)
    if (filters?.start_date) params.append("start_date", filters.start_date)
    if (filters?.end_date) params.append("end_date", filters.end_date)

    const response = await fetch(`${API_BASE}/audit/export?${params}`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to export audit logs: ${response.statusText}`)
    }

    return response.blob()
  }

  static async getSystemHealth(token: string): Promise<SystemHealth> {
    const response = await fetch(`${API_BASE}/health`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch system health: ${response.statusText}`)
    }

    return response.json()
  }

  static async getSystemMetrics(token: string): Promise<SystemHealth["system"]> {
    const response = await fetch(`${API_BASE}/metrics`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch system metrics: ${response.statusText}`)
    }

    return response.json()
  }

  static async getSecurityReport(token: string): Promise<SecurityReport> {
    const response = await fetch(`${API_BASE}/audit/security-report`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch security report: ${response.statusText}`)
    }

    return response.json()
  }
}
