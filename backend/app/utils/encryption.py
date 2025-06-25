# Enhanced encryption utils with audit logging
# File: app/utils/encryption.py

from cryptography.fernet import Fernet
import base64
import os
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import EncryptionAuditLog
from datetime import datetime
import logging

# Set up logging
logger = logging.getLogger(__name__)

class EncryptionService:
    """Enhanced encryption service with audit logging"""
    
    def __init__(self):
        self.current_key_version = "v1.0"
        self._cipher = None
    
    def _get_cipher(self):
        """Get or create cipher instance"""
        if self._cipher is None:
            key = self._load_active_key()
            key_bytes = base64.urlsafe_b64encode(key.encode()[:32])
            self._cipher = Fernet(key_bytes)
        return self._cipher
    
    def _load_active_key(self) -> str:
        """Load active encryption key"""
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            raise ValueError("Missing ENCRYPTION_KEY in environment")
        return key
    
    def _log_encryption_operation(
        self,
        db: Session,
        operation: str,
        field_name: str,
        success: bool,
        patient_id: Optional[str] = None,
        user_id: Optional[int] = None,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log encryption/decryption operations"""
        try:
            audit_log = EncryptionAuditLog(
                user_id=user_id,
                patient_id=patient_id,
                operation=operation,
                field_name=field_name,
                key_version=self.current_key_version,
                success=success,
                error_message=error_message,
                ip_address=ip_address,
                user_agent=user_agent,
                timestamp=datetime.utcnow()
            )
            db.add(audit_log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log encryption operation: {str(e)}")
            # Don't fail the main operation if audit logging fails
            db.rollback()
    
    def encrypt_field(
        self,
        value: str,
        field_name: str,
        db: Optional[Session] = None,
        patient_id: Optional[str] = None,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Encrypt a field value with audit logging"""
        try:
            encrypted_value = self._get_cipher().encrypt(value.encode()).decode()
            
            # Log successful encryption
            if db:
                self._log_encryption_operation(
                    db=db,
                    operation="encrypt",
                    field_name=field_name,
                    success=True,
                    patient_id=patient_id,
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
            
            return encrypted_value
            
        except Exception as e:
            error_msg = f"Encryption failed: {str(e)}"
            logger.error(error_msg)
            
            # Log failed encryption
            if db:
                self._log_encryption_operation(
                    db=db,
                    operation="encrypt",
                    field_name=field_name,
                    success=False,
                    patient_id=patient_id,
                    user_id=user_id,
                    error_message=error_msg,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
            
            raise Exception(error_msg)
    
    def decrypt_field(
        self,
        encrypted_value: str,
        field_name: str,
        db: Optional[Session] = None,
        patient_id: Optional[str] = None,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Decrypt a field value with audit logging"""
        try:
            decrypted_value = self._get_cipher().decrypt(encrypted_value.encode()).decode()
            
            # Log successful decryption
            if db:
                self._log_encryption_operation(
                    db=db,
                    operation="decrypt",
                    field_name=field_name,
                    success=True,
                    patient_id=patient_id,
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
            
            return decrypted_value
            
        except Exception as e:
            error_msg = f"Decryption failed: {str(e)}"
            logger.error(error_msg)
            
            # Log failed decryption
            if db:
                self._log_encryption_operation(
                    db=db,
                    operation="decrypt",
                    field_name=field_name,
                    success=False,
                    patient_id=patient_id,
                    user_id=user_id,
                    error_message=error_msg,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
            
            raise Exception(error_msg)
    
    def bulk_encrypt_patient_data(
        self,
        patient_data: dict,
        db: Optional[Session] = None,
        patient_id: Optional[str] = None,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> dict:
        """Encrypt multiple patient fields at once"""
        encrypted_data = {}
        
        fields_to_encrypt = ['first_name', 'last_name', 'date_of_birth', 'gender']
        
        for field in fields_to_encrypt:
            if field in patient_data:
                encrypted_data[f"{field}_encrypted"] = self.encrypt_field(
                    value=patient_data[field],
                    field_name=field,
                    db=db,
                    patient_id=patient_id,
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
        
        return encrypted_data
    
    def bulk_decrypt_patient_data(
        self,
        encrypted_patient_data: dict,
        db: Optional[Session] = None,
        patient_id: Optional[str] = None,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> dict:
        """Decrypt multiple patient fields at once"""
        decrypted_data = {}
        
        field_mappings = {
            'first_name_encrypted': 'first_name',
            'last_name_encrypted': 'last_name',
            'date_of_birth_encrypted': 'date_of_birth',
            'gender_encrypted': 'gender'
        }
        
        for encrypted_field, plain_field in field_mappings.items():
            if encrypted_field in encrypted_patient_data:
                decrypted_data[plain_field] = self.decrypt_field(
                    encrypted_value=encrypted_patient_data[encrypted_field],
                    field_name=plain_field,
                    db=db,
                    patient_id=patient_id,
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
        
        return decrypted_data

# Global encryption service instance
encryption_service = EncryptionService()

# Backward compatibility functions
def encrypt_field(value: str) -> str:
    """Legacy function for backward compatibility"""
    return encryption_service.encrypt_field(value, field_name="legacy")

def decrypt_field(encrypted_value: str) -> str:
    """Legacy function for backward compatibility"""
    return encryption_service.decrypt_field(encrypted_value, field_name="legacy")

# Enhanced functions for new code
def encrypt_field_with_audit(
    value: str,
    field_name: str,
    db: Session,
    patient_id: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> str:
    """Encrypt field with audit logging"""
    return encryption_service.encrypt_field(
        value=value,
        field_name=field_name,
        db=db,
        patient_id=patient_id,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent
    )

def decrypt_field_with_audit(
    encrypted_value: str,
    field_name: str,
    db: Session,
    patient_id: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> str:
    """Decrypt field with audit logging"""
    return encryption_service.decrypt_field(
        encrypted_value=encrypted_value,
        field_name=field_name,
        db=db,
        patient_id=patient_id,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent
    )