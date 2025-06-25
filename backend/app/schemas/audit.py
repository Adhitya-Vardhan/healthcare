# Enhanced audit schemas
# File: app/schemas/audit.py

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, List, Any

class AuditEntry(BaseModel):
    id: int
    user_id: int
    username: str
    action: str
    resource_type: str
    resource_id: str
    ip_address: str
    timestamp: datetime
    details: Dict[str, Any] = {}

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    activities: List[AuditEntry]
    page: int
    limit: int
    total: int
    pages: int

# NEW: Encryption audit schemas
class EncryptionAuditEntry(BaseModel):
    id: int
    user_id: Optional[int]
    username: str
    patient_id: str
    operation: str  # 'encrypt' or 'decrypt'
    field_name: str
    key_version: str
    success: bool
    error_message: str
    ip_address: str
    timestamp: datetime

    class Config:
        from_attributes = True

class EncryptionAuditResponse(BaseModel):
    activities: List[EncryptionAuditEntry]
    page: int
    limit: int
    total: int
    pages: int

# NEW: Audit statistics
class AuditStatsResponse(BaseModel):
    period_days: int
    total_user_activities: int
    failed_login_attempts: int
    active_users: int
    encryption_operations: int
    encryption_failures: int
    user_activity_breakdown: Dict[str, int]
    encryption_breakdown: Dict[str, int]

# NEW: Security report
class SecurityReportResponse(BaseModel):
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    suspicious_activities: List[Dict[str, Any]]
    security_metrics: Dict[str, int]
    recommendations: List[str]

# NEW: Key management schemas
class EncryptionKeyInfo(BaseModel):
    id: int
    key_version: str
    algorithm: str
    is_active: bool
    created_at: datetime
    rotated_at: Optional[datetime]

    class Config:
        from_attributes = True

class EncryptionKeyListResponse(BaseModel):
    keys: List[EncryptionKeyInfo]
    active_key_version: str
    total_keys: int

class KeyRotationRequest(BaseModel):
    new_key_version: str = Field(..., min_length=1, max_length=50)
    algorithm: str = Field(default="AES-256", max_length=50)

class KeyRotationResponse(BaseModel):
    success: bool
    old_key_version: str
    new_key_version: str
    rotated_at: datetime
    affected_records: int

# NEW: File validation schemas
class FileValidationResult(BaseModel):
    is_valid: bool
    file_name: str
    file_size: int
    mime_type: str
    detected_type: str
    security_threats: List[str]
    column_validation: Dict[str, Any]
    row_count: int
    sample_data: List[Dict[str, Any]]

class FileSecurityScanRequest(BaseModel):
    check_macros: bool = True
    check_external_links: bool = True
    check_suspicious_content: bool = True
    max_file_size_mb: int = Field(default=10, ge=1, le=50)

# NEW: Performance monitoring schemas
class PerformanceMetrics(BaseModel):
    endpoint: str
    avg_response_time_ms: float
    total_requests: int
    error_rate_percent: float
    last_24h_requests: int

class SystemPerformanceResponse(BaseModel):
    generated_at: datetime
    encryption_performance: Dict[str, float]  # avg time for encrypt/decrypt operations
    database_performance: Dict[str, float]
    api_performance: List[PerformanceMetrics]
    memory_usage_mb: float
    cpu_usage_percent: float

# NEW: Compliance report schemas
class ComplianceCheckResult(BaseModel):
    check_name: str
    status: str  # 'pass', 'fail', 'warning'
    description: str
    details: Dict[str, Any]

class ComplianceReportResponse(BaseModel):
    generated_at: datetime
    compliance_framework: str  # 'HIPAA', 'GDPR', etc.
    overall_status: str  # 'compliant', 'non_compliant', 'partial'
    checks: List[ComplianceCheckResult]
    recommendations: List[str]
    next_review_date: datetime