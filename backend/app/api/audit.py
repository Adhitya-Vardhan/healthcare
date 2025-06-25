# Enhanced audit API with encryption logging
# File: app/api/audit.py

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, text
from app.core.deps import get_db, get_current_user
from app.models.models import UserAuditLog, User, EncryptionAuditLog, Patient
from app.schemas.audit import (
    AuditLogResponse, 
    AuditEntry, 
    EncryptionAuditResponse,
    EncryptionAuditEntry,
    AuditStatsResponse,
    SecurityReportResponse
)
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()

def require_admin_access(current_user: User = Depends(get_current_user)):
    """Ensure user has Admin role for audit access"""
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return current_user

@router.get("/audit/user-activity", response_model=AuditLogResponse)
def get_user_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get user activity audit logs with filtering"""
    try:
        # Build query with filters
        query = db.query(UserAuditLog).join(User, User.id == UserAuditLog.user_id)
        
        if user_id:
            query = query.filter(UserAuditLog.user_id == user_id)
        
        if action:
            query = query.filter(UserAuditLog.action.ilike(f"%{action}%"))
        
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(UserAuditLog.timestamp >= start_dt)
        
        if end_date:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(UserAuditLog.timestamp <= end_dt)
        
        # Order by most recent first
        query = query.order_by(desc(UserAuditLog.timestamp))
        
        total = query.count()
        entries = query.offset((page - 1) * limit).limit(limit).all()
        
        result = [
            AuditEntry(
                id=e.id,
                user_id=e.user_id,
                username=e.user.username,
                action=e.action,
                resource_type=e.resource_type or "",
                resource_id=e.resource_id or "",
                ip_address=e.ip_address or "",
                timestamp=e.timestamp,
                details=e.details or {}
            )
            for e in entries
        ]
        
        pages = (total + limit - 1) // limit
        
        return AuditLogResponse(
            activities=result, 
            page=page, 
            limit=limit, 
            total=total, 
            pages=pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching audit logs: {str(e)}")

@router.get("/audit/encryption-activity", response_model=EncryptionAuditResponse)
def get_encryption_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    operation: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    patient_id: Optional[str] = Query(None),
    success_only: Optional[bool] = Query(None)
):
    """Get encryption/decryption audit logs"""
    try:
        # Build query with filters
        query = db.query(EncryptionAuditLog).outerjoin(User, User.id == EncryptionAuditLog.user_id)
        
        if operation:
            query = query.filter(EncryptionAuditLog.operation == operation)
        
        if user_id:
            query = query.filter(EncryptionAuditLog.user_id == user_id)
        
        if patient_id:
            query = query.filter(EncryptionAuditLog.patient_id == patient_id)
        
        if success_only is not None:
            query = query.filter(EncryptionAuditLog.success == success_only)
        
        # Order by most recent first
        query = query.order_by(desc(EncryptionAuditLog.timestamp))
        
        total = query.count()
        entries = query.offset((page - 1) * limit).limit(limit).all()
        
        result = [
            EncryptionAuditEntry(
                id=e.id,
                user_id=e.user_id,
                username=e.user.username if e.user else "System",
                patient_id=e.patient_id or "",
                operation=e.operation,
                field_name=e.field_name,
                key_version=e.key_version,
                success=e.success,
                error_message=e.error_message or "",
                ip_address=e.ip_address or "",
                timestamp=e.timestamp
            )
            for e in entries
        ]
        
        pages = (total + limit - 1) // limit
        
        return EncryptionAuditResponse(
            activities=result,
            page=page,
            limit=limit,
            total=total,
            pages=pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching encryption logs: {str(e)}")

@router.get("/audit/stats", response_model=AuditStatsResponse)
def get_audit_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access),
    days: int = Query(7, ge=1, le=365)
):
    """Get audit statistics for the last N days"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # User activity stats
        user_activities = db.query(
            func.count(UserAuditLog.id).label('count'),
            UserAuditLog.action
        ).filter(
            UserAuditLog.timestamp >= cutoff_date
        ).group_by(UserAuditLog.action).all()
        
        # Encryption operation stats
        encryption_stats = db.query(
            func.count(EncryptionAuditLog.id).label('count'),
            EncryptionAuditLog.operation,
            EncryptionAuditLog.success
        ).filter(
            EncryptionAuditLog.timestamp >= cutoff_date
        ).group_by(
            EncryptionAuditLog.operation, 
            EncryptionAuditLog.success
        ).all()
        
        # Failed login attempts
        failed_logins = db.query(func.count(UserAuditLog.id)).filter(
            and_(
                UserAuditLog.action == "login_failed",
                UserAuditLog.timestamp >= cutoff_date
            )
        ).scalar() or 0
        
        # Unique active users
        active_users = db.query(func.count(func.distinct(UserAuditLog.user_id))).filter(
            UserAuditLog.timestamp >= cutoff_date
        ).scalar() or 0
        
        # Encryption failures
        encryption_failures = db.query(func.count(EncryptionAuditLog.id)).filter(
            and_(
                EncryptionAuditLog.success == False,
                EncryptionAuditLog.timestamp >= cutoff_date
            )
        ).scalar() or 0
        
        return AuditStatsResponse(
            period_days=days,
            total_user_activities=sum(activity.count for activity in user_activities),
            failed_login_attempts=failed_logins,
            active_users=active_users,
            encryption_operations=sum(stat.count for stat in encryption_stats),
            encryption_failures=encryption_failures,
            user_activity_breakdown={activity.action: activity.count for activity in user_activities},
            encryption_breakdown={
                f"{stat.operation}_{'success' if stat.success else 'failure'}": stat.count 
                for stat in encryption_stats
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching statistics: {str(e)}")

@router.get("/audit/security-report", response_model=SecurityReportResponse)
def get_security_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access)
):
    """Generate comprehensive security report"""
    try:
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        # Recent suspicious activities
        suspicious_activities = []
        
        # Multiple failed logins from same IP
        failed_login_ips = db.execute(text("""
            SELECT ip_address, COUNT(*) as failure_count
            FROM user_audit_log 
            WHERE action = 'login_failed' 
            AND timestamp >= :cutoff
            GROUP BY ip_address 
            HAVING COUNT(*) >= 5
            ORDER BY failure_count DESC
        """), {"cutoff": last_24h}).fetchall()
        
        for ip_record in failed_login_ips:
            suspicious_activities.append({
                "type": "multiple_failed_logins",
                "details": f"IP {ip_record.ip_address} had {ip_record.failure_count} failed login attempts",
                "severity": "high" if ip_record.failure_count >= 10 else "medium"
            })
        
        # Encryption failures
        encryption_failures = db.query(func.count(EncryptionAuditLog.id)).filter(
            and_(
                EncryptionAuditLog.success == False,
                EncryptionAuditLog.timestamp >= last_24h
            )
        ).scalar() or 0
        
        if encryption_failures > 10:
            suspicious_activities.append({
                "type": "high_encryption_failures",
                "details": f"{encryption_failures} encryption failures in last 24 hours",
                "severity": "high"
            })
        
        # Users with unusual activity patterns
        high_activity_users = db.execute(text("""
            SELECT u.username, COUNT(*) as activity_count
            FROM user_audit_log ual
            JOIN users u ON ual.user_id = u.id
            WHERE ual.timestamp >= :cutoff
            GROUP BY u.username
            HAVING COUNT(*) >= 100
            ORDER BY activity_count DESC
        """), {"cutoff": last_24h}).fetchall()
        
        for user_record in high_activity_users:
            suspicious_activities.append({
                "type": "high_user_activity",
                "details": f"User {user_record.username} had {user_record.activity_count} activities in 24h",
                "severity": "medium"
            })
        
        # Security metrics
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users_24h = db.query(func.count(func.distinct(UserAuditLog.user_id))).filter(
            UserAuditLog.timestamp >= last_24h
        ).scalar() or 0
        
        total_patients = db.query(func.count(Patient.id)).scalar() or 0
        
        return SecurityReportResponse(
            generated_at=now,
            period_start=last_7d,
            period_end=now,
            suspicious_activities=suspicious_activities,
            security_metrics={
                "total_users": total_users,
                "active_users_24h": active_users_24h,
                "total_patients": total_patients,
                "failed_logins_24h": db.query(func.count(UserAuditLog.id)).filter(
                    and_(
                        UserAuditLog.action == "login_failed",
                        UserAuditLog.timestamp >= last_24h
                    )
                ).scalar() or 0,
                "encryption_operations_24h": db.query(func.count(EncryptionAuditLog.id)).filter(
                    EncryptionAuditLog.timestamp >= last_24h
                ).scalar() or 0
            },
            recommendations=[
                "Monitor IPs with multiple failed login attempts",
                "Review high-activity user accounts",
                "Check encryption key integrity if failures persist",
                "Consider implementing account lockout policies",
                "Regular security audits recommended"
            ]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating security report: {str(e)}")

@router.delete("/audit/cleanup")
def cleanup_old_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access),
    days_to_keep: int = Query(365, ge=30, le=2555)  # Min 30 days, max 7 years
):
    """Clean up old audit logs (Admin only)"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Delete old user audit logs
        deleted_user_logs = db.query(UserAuditLog).filter(
            UserAuditLog.timestamp < cutoff_date
        ).delete()
        
        # Delete old encryption audit logs
        deleted_encryption_logs = db.query(EncryptionAuditLog).filter(
            EncryptionAuditLog.timestamp < cutoff_date
        ).delete()
        
        db.commit()
        
        return {
            "message": "Audit log cleanup completed",
            "deleted_user_logs": deleted_user_logs,
            "deleted_encryption_logs": deleted_encryption_logs,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")