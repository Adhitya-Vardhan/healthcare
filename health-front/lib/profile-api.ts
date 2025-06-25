import type {
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ExportOptions,
  ExportJob,
  UploadHistory,
  TemplateInfo,
} from "./profile-types"

const API_BASE = "http://localhost:8000/api"

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

export class ProfileAPI {
  static async getUserProfile(token: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE}/users/profile`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`)
    }

    return response.json()
  }

  static async updateProfile(token: string, profileData: UpdateProfileRequest): Promise<UserProfile> {
    const response = await fetch(`${API_BASE}/users/profile`, {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify(profileData),
    })

    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.statusText}`)
    }

    return response.json()
  }

  static async changePassword(token: string, passwordData: ChangePasswordRequest): Promise<void> {
    const response = await fetch(`${API_BASE}/users/change-password`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(passwordData),
    })

    if (!response.ok) {
      throw new Error(`Failed to change password: ${response.statusText}`)
    }
  }

  static async exportData(token: string, options: ExportOptions): Promise<ExportJob> {
    const response = await fetch(`${API_BASE}/files/export`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      throw new Error(`Failed to start export: ${response.statusText}`)
    }

    return response.json()
  }

  static async getExportStatus(token: string, exportId: string): Promise<ExportJob> {
    const response = await fetch(`${API_BASE}/files/export-status/${exportId}`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to get export status: ${response.statusText}`)
    }

    return response.json()
  }

  static async getUploadHistory(token: string): Promise<UploadHistory[]> {
    const response = await fetch(`${API_BASE}/files/upload-history`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch upload history: ${response.statusText}`)
    }

    return response.json()
  }

  static async getTemplates(token: string): Promise<TemplateInfo[]> {
    const response = await fetch(`${API_BASE}/files/templates`, {
      headers: getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`)
    }

    return response.json()
  }

  static async downloadTemplate(token: string, templateId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/files/template/${templateId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`)
    }

    return response.blob()
  }

  static async downloadExport(token: string, exportId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/files/export/${exportId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download export: ${response.statusText}`)
    }

    return response.blob()
  }
}
