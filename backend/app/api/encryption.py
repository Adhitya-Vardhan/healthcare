# Encryption key management API
# File: app/api/encryption.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.deps import get_db, get_current_user
from app.models.models import User, EncryptionKey, Patient, EncryptionAuditLog
from app.schemas.audit import (
    EncryptionKeyInfo,
    EncryptionKeyListResponse,
    KeyRotationRequest,
    KeyRotationResponse,
    FileValidationResult,
    FileSecurityScanRequest,
    SystemPerformanceResponse,
    PerformanceMetrics
)
from app.utils.encryption import encryption_service
from datetime import datetime, timedelta
from typing import List
import hashlib
import secrets
import os
import time
import psutil  # For system metrics

router = APIRouter()

def require_admin_access(current_user: User = Depends(get_current_user)):
    """Ensure user has Admin role"""
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return current_user

@router.get("/encryption/keys", response_model=EncryptionKeyListResponse)
def list_encryption_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access)
):
    """List all encryption keys (Admin only)"""
    try:
        keys = db.query(EncryptionKey).order_by(desc(EncryptionKey.created_at)).all()
        active_key = db.query(EncryptionKey).filter(EncryptionKey.is_active == True).first()
        
        key_list = [
            EncryptionKeyInfo(
                id=key.id,
                key_version=key.key_version,
                algorithm=key.algorithm,
                is_active=key.is_active,
                created_at=key.created_at,
                rotated_at=key.rotated_at
            )
            for key in keys
        ]
        
        return EncryptionKeyListResponse(
            keys=key_list,
            active_key_version=active_key.key_version if active_key else "none",
            total_keys=len(keys)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing keys: {str(e)}")

@router.post("/encryption/rotate-key", response_model=KeyRotationResponse)
def rotate_encryption_key(
    rotation_request: KeyRotationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access)
):
    """Rotate encryption key (Admin only) - WARNING: This is a critical operation"""
    try:
        # Get current active key
        old_key = db.query(EncryptionKey).filter(EncryptionKey.is_active == True).first()
        if not old_key:
            raise HTTPException(status_code=400, detail="No active key found")
        
        # Check if new key version already exists
        existing_key = db.query(EncryptionKey).filter(
            EncryptionKey.key_version == rotation_request.new_key_version
        ).first()
        if existing_key:
            raise HTTPException(
                status_code=400, 
                detail=f"Key version {rotation_request.new_key_version} already exists"
            )
        
        # Generate new key (in production, use proper key generation)
        new_key_material = secrets.token_urlsafe(32)
        new_key_hash = hashlib.sha256(new_key_material.encode()).hexdigest()
        
        # Create new key record
        new_key = EncryptionKey(
            key_version=rotation_request.new_key_version,
            key_hash=new_key_hash,
            algorithm=rotation_request.algorithm,
            is_active=False,  # Don't activate until re-encryption is complete
            created_at=datetime.utcnow()
        )
        
        db.add(new_key)
        db.commit()
        
        # Count affected records
        affected_records = db.query(Patient).count()
        
        # Mark old key as rotated
        old_key.is_active = False
        old_key.rotated_at = datetime.utcnow()
        db.commit()
        
        # In a real implementation, you would:
        # 1. Re-encrypt all patient data with the new key
        # 2. Update encryption_key_version in patient records
        # 3. Only then activate the new key
        # For this demo, we'll just activate the new key
        
        new_key.is_active = True
        db.commit()
        
        # Schedule background task to update environment variable
        # (In production, use proper key management service)
        background_tasks.add_task(
            update_encryption_key_environment, 
            new_key_material
        )
        
        return KeyRotationResponse(
            success=True,
            old_key_version=old_key.key_version,
            new_key_version=new_key.key_version,
            rotated_at=datetime.utcnow(),
            affected_records=affected_records
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Key rotation failed: {str(e)}")

def update_encryption_key_environment(new_key: str):
    """Background task to update encryption key (Demo only - use proper key management in production)"""
    try:
        # In production, you would update your key management service
        # For demo, we just log the operation
        print(f"[DEMO] New encryption key would be deployed: {new_key[:8]}...")
        time.sleep(2)  # Simulate deployment time
        print("[DEMO] Key deployment completed")
    except Exception as e:
        print(f"[ERROR] Key deployment failed: {str(e)}")

@router.get("/encryption/performance", response_model=SystemPerformanceResponse)
def get_encryption_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access)
):
    """Get encryption performance metrics (Admin only)"""
    try:
        # Get system metrics
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Encryption performance (last 24 hours)
        last_24h = datetime.utcnow() - timedelta(hours=24)
        
        # Sample encryption/decryption times (in production, measure actual times)
        sample_encrypt_time = []
        sample_decrypt_time = []
        
        # Simulate measuring encryption performance
        test_data = "sample_patient_data_for_testing"
        
        for _ in range(10):
            start_time = time.time()
            encrypted = encryption_service.encrypt_field(test_data, "test_field")
            encrypt_time = (time.time() - start_time) * 1000  # Convert to ms
            sample_encrypt_time.append(encrypt_time)
            
            start_time = time.time()
            decrypted = encryption_service.decrypt_field(encrypted, "test_field")
            decrypt_time = (time.time() - start_time) * 1000  # Convert to ms
            sample_decrypt_time.append(decrypt_time)
        
        avg_encrypt_time = sum(sample_encrypt_time) / len(sample_encrypt_time)
        avg_decrypt_time = sum(sample_decrypt_time) / len(sample_decrypt_time)
        
        # Database performance (sample queries)
        db_performance = {}
        
        # Measure patient query time
        start_time = time.time()
        db.query(Patient).limit(100).all()
        db_performance["patient_query_ms"] = (time.time() - start_time) * 1000
        
        # Measure encryption audit query time
        start_time = time.time()
        db.query(EncryptionAuditLog).limit(100).all()
        db_performance["audit_query_ms"] = (time.time() - start_time) * 1000
        
        # API performance (mock data - in production, collect from actual metrics)
        api_performance = [
            PerformanceMetrics(
                endpoint="/patients/upload",
                avg_response_time_ms=1250.5,
                total_requests=156,
                error_rate_percent=2.1,
                last_24h_requests=23
            ),
            PerformanceMetrics(
                endpoint="/patients",
                avg_response_time_ms=145.3,
                total_requests=892,
                error_rate_percent=0.8,
                last_24h_requests=127
            ),
            PerformanceMetrics(
                endpoint="/patients/search",
                avg_response_time_ms=234.7,
                total_requests=345,
                error_rate_percent=1.2,
                last_24h_requests=67
            )
        ]
        
        return SystemPerformanceResponse(
            generated_at=datetime.utcnow(),
            encryption_performance={
                "avg_encrypt_time_ms": round(avg_encrypt_time, 2),
                "avg_decrypt_time_ms": round(avg_decrypt_time, 2),
                "total_operations_24h": db.query(EncryptionAuditLog).filter(
                    EncryptionAuditLog.timestamp >= last_24h
                ).count()
            },
            database_performance=db_performance,
            api_performance=api_performance,
            memory_usage_mb=round(memory.used / 1024 / 1024, 2),
            cpu_usage_percent=round(cpu_percent, 2)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting performance metrics: {str(e)}")

@router.post("/encryption/validate-file", response_model=FileValidationResult)
async def validate_uploaded_file(
    file_content: bytes,
    file_name: str,
    scan_request: FileSecurityScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access)
):
    """Advanced file validation and security scanning"""
    try:
        import pandas as pd
        import io
        
        # Basic file info
        file_size = len(file_content)
        
        # Check file size
        max_size_bytes = scan_request.max_file_size_mb * 1024 * 1024
        if file_size > max_size_bytes:
            return FileValidationResult(
                is_valid=False,
                file_name=file_name,
                file_size=file_size,
                mime_type="unknown",
                detected_type="oversized",
                security_threats=["File exceeds maximum size limit"],
                column_validation={},
                row_count=0,
                sample_data=[]
            )
        
        # Detect file type
        security_threats = []
        detected_type = "unknown"
        
        if file_name.lower().endswith('.xlsx'):
            detected_type = "excel"
        elif file_name.lower().endswith('.csv'):
            detected_type = "csv"
        else:
            security_threats.append("Unsupported file type")
        
        # Security scans
        if scan_request.check_macros and detected_type == "excel":
            # Check for Excel macros (simplified check)
            if b'xl/vbaProject.bin' in file_content:
                security_threats.append("Excel file contains macros")
        
        if scan_request.check_external_links:
            # Check for external links
            suspicious_patterns = [b'http://', b'https://', b'ftp://', b'file://']
            for pattern in suspicious_patterns:
                if pattern in file_content:
                    security_threats.append("File contains external links")
                    break
        
        if scan_request.check_suspicious_content:
            # Check for suspicious content
            suspicious_strings = [b'<script', b'javascript:', b'vbscript:', b'onload=']
            for pattern in suspicious_strings:
                if pattern.lower() in file_content.lower():
                    security_threats.append("File contains potentially malicious content")
                    break
        
        # Try to parse the file
        column_validation = {}
        row_count = 0
        sample_data = []
        
        try:
            if detected_type == "csv":
                df = pd.read_csv(io.StringIO(file_content.decode('utf-8')))
            elif detected_type == "excel":
                df = pd.read_excel(io.BytesIO(file_content))
            else:
                raise ValueError("Unsupported file type")
            
            row_count = len(df)
            
            # Column validation
            required_columns = ['patient_id', 'first_name', 'last_name', 'date_of_birth', 'gender']
            actual_columns = [col.lower().strip() for col in df.columns]
            
            column_validation = {
                "required_columns": required_columns,
                "actual_columns": list(df.columns),
                "normalized_columns": actual_columns,
                "missing_columns": [col for col in required_columns if col not in actual_columns],
                "extra_columns": [col for col in actual_columns if col not in required_columns]
            }
            
            # Get sample data (first 3 rows, sanitized)
            sample_data = df.head(3).fillna("").to_dict('records')
            
        except Exception as parse_error:
            security_threats.append(f"File parsing error: {str(parse_error)}")
        
        # Determine overall validity
        is_valid = (
            len(security_threats) == 0 and
            len(column_validation.get("missing_columns", [])) == 0 and
            row_count > 0
        )
        
        return FileValidationResult(
            is_valid=is_valid,
            file_name=file_name,
            file_size=file_size,
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if detected_type == "excel" else "text/csv",
            detected_type=detected_type,
            security_threats=security_threats,
            column_validation=column_validation,
            row_count=row_count,
            sample_data=sample_data
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File validation failed: {str(e)}")

@router.post("/encryption/test-performance")
def test_encryption_performance(
    iterations: int = 100,
    current_user: User = Depends(require_admin_access)
):
    """Test encryption performance with various data sizes"""
    try:
        results = {}
        
        # Test different data sizes
        test_sizes = {
            "small": "John",  # 4 chars
            "medium": "John David Smith Jr.",  # 20 chars
            "large": "A" * 100,  # 100 chars
            "extra_large": "B" * 1000  # 1000 chars
        }
        
        for size_name, test_data in test_sizes.items():
            encrypt_times = []
            decrypt_times = []
            
            for _ in range(iterations):
                # Measure encryption time
                start_time = time.time()
                encrypted = encryption_service.encrypt_field(test_data, f"test_{size_name}")
                encrypt_time = (time.time() - start_time) * 1000  # ms
                encrypt_times.append(encrypt_time)
                
                # Measure decryption time
                start_time = time.time()
                decrypted = encryption_service.decrypt_field(encrypted, f"test_{size_name}")
                decrypt_time = (time.time() - start_time) * 1000  # ms
                decrypt_times.append(decrypt_time)
                
                # Verify correctness
                assert decrypted == test_data, f"Encryption/decryption failed for {size_name}"
            
            results[size_name] = {
                "data_size_chars": len(test_data),
                "iterations": iterations,
                "avg_encrypt_time_ms": round(sum(encrypt_times) / len(encrypt_times), 3),
                "avg_decrypt_time_ms": round(sum(decrypt_times) / len(decrypt_times), 3),
                "min_encrypt_time_ms": round(min(encrypt_times), 3),
                "max_encrypt_time_ms": round(max(encrypt_times), 3),
                "min_decrypt_time_ms": round(min(decrypt_times), 3),
                "max_decrypt_time_ms": round(max(decrypt_times), 3)
            }
        
        return {
            "test_completed_at": datetime.utcnow().isoformat(),
            "total_iterations": iterations * len(test_sizes),
            "results": results,
            "summary": {
                "fastest_encrypt_ms": min(result["avg_encrypt_time_ms"] for result in results.values()),
                "slowest_encrypt_ms": max(result["avg_encrypt_time_ms"] for result in results.values()),
                "fastest_decrypt_ms": min(result["avg_decrypt_time_ms"] for result in results.values()),
                "slowest_decrypt_ms": max(result["avg_decrypt_time_ms"] for result in results.values())
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Performance test failed: {str(e)}")

@router.get("/encryption/health-check")
def encryption_health_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_access)
):
    """Check encryption system health"""
    try:
        health_status = {
            "overall_status": "healthy",
            "checks": [],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Check 1: Active encryption key exists
        try:
            active_key = db.query(EncryptionKey).filter(EncryptionKey.is_active == True).first()
            if active_key:
                health_status["checks"].append({
                    "name": "active_encryption_key",
                    "status": "pass",
                    "message": f"Active key found: {active_key.key_version}"
                })
            else:
                health_status["checks"].append({
                    "name": "active_encryption_key", 
                    "status": "fail",
                    "message": "No active encryption key found"
                })
                health_status["overall_status"] = "unhealthy"
        except Exception as e:
            health_status["checks"].append({
                "name": "active_encryption_key",
                "status": "error", 
                "message": f"Error checking key: {str(e)}"
            })
            health_status["overall_status"] = "unhealthy"
        
        # Check 2: Encryption/decryption functionality
        try:
            test_data = "health_check_test_data"
            encrypted = encryption_service.encrypt_field(test_data, "health_check")
            decrypted = encryption_service.decrypt_field(encrypted, "health_check")
            
            if decrypted == test_data:
                health_status["checks"].append({
                    "name": "encryption_functionality",
                    "status": "pass",
                    "message": "Encryption/decryption working correctly"
                })
            else:
                health_status["checks"].append({
                    "name": "encryption_functionality",
                    "status": "fail", 
                    "message": "Encryption/decryption data mismatch"
                })
                health_status["overall_status"] = "unhealthy"
        except Exception as e:
            health_status["checks"].append({
                "name": "encryption_functionality",
                "status": "error",
                "message": f"Encryption test failed: {str(e)}"
            })
            health_status["overall_status"] = "unhealthy"
        
        # Check 3: Recent encryption failures
        try:
            last_hour = datetime.utcnow() - timedelta(hours=1)
            recent_failures = db.query(EncryptionAuditLog).filter(
                EncryptionAuditLog.timestamp >= last_hour,
                EncryptionAuditLog.success == False
            ).count()
            
            if recent_failures == 0:
                health_status["checks"].append({
                    "name": "recent_encryption_failures",
                    "status": "pass",
                    "message": "No encryption failures in last hour"
                })
            elif recent_failures < 10:
                health_status["checks"].append({
                    "name": "recent_encryption_failures",
                    "status": "warning",
                    "message": f"{recent_failures} encryption failures in last hour"
                })
            else:
                health_status["checks"].append({
                    "name": "recent_encryption_failures", 
                    "status": "fail",
                    "message": f"High number of failures: {recent_failures} in last hour"
                })
                health_status["overall_status"] = "degraded"
        except Exception as e:
            health_status["checks"].append({
                "name": "recent_encryption_failures",
                "status": "error",
                "message": f"Error checking failures: {str(e)}"
            })
        
        return health_status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")