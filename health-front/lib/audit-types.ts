export interface AuditLog {
  id: number
  user_id: number
  username: string
  action: string
  resource_type: string
  resource_id: string
  ip_address: string
  timestamp: string
  details: Record<string, any>
}

export interface AuditStats {
  total_activities_24h: number
  failed_login_attempts: number
  active_users_online: number
  encryption_operations: number
  unique_ips_24h: number
  critical_actions_24h: number
}

export interface AuditFilters {
  user_id?: number
  action?: string
  resource_type?: string
  ip_address?: string
  start_date?: string
  end_date?: string
}

export interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface SystemHealth {
  status: "healthy" | "warning" | "critical"
  database: {
    status: "connected" | "disconnected" | "slow"
    total_users: number
    total_patients: number
    response_time_ms: number
  }
  encryption: {
    status: "operational" | "degraded" | "failed"
    active_key_version: string
    operations_per_minute: number
  }
  system: {
    cpu_percent: number
    memory_percent: number
    memory_used_gb: number
    disk_usage_percent: number
    uptime_hours: number
  }
  websocket: {
    active_connections: number
    total_messages_24h: number
  }
}

export interface SecurityReport {
  failed_logins_24h: number
  suspicious_ips: string[]
  blocked_attempts: number
  security_events: Array<{
    type: string
    count: number
    severity: "low" | "medium" | "high"
  }>
}
