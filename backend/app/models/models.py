# STEP 2: Define SQLAlchemy Models based on healthcare_db_schema.sql
# File: app/models/models.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, TIMESTAMP, JSON
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from sqlalchemy import Enum as SQLAEnum
import enum
from datetime import datetime
from sqlalchemy import BigInteger, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    level = Column(Integer, nullable=False, default=0)
    permissions = Column(JSON)
    is_active = Column(Boolean, default=True)

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    country = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    salt = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))

    role_id = Column(Integer, ForeignKey("roles.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    team_id = Column(Integer, ForeignKey("teams.id"))

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Add missing fields
    must_change_password = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    last_login = Column(TIMESTAMP, nullable=True)

    role = relationship("Role")
    location = relationship("Location")
    team = relationship("Team")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), unique=True, nullable=False)

    first_name_encrypted = Column(Text, nullable=False)
    last_name_encrypted = Column(Text, nullable=False)
    date_of_birth_encrypted = Column(Text, nullable=False)
    gender_encrypted = Column(Text, nullable=False)

    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    encryption_key_version = Column(String(50), nullable=False)
    file_upload_batch_id = Column(String(255), nullable=True)

    data_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

class FileUpload(Base):
    __tablename__ = "file_uploads"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(255), unique=True, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    total_records = Column(Integer, nullable=False)
    successful_records = Column(Integer, nullable=False)
    failed_records = Column(Integer, nullable=False)

    status = Column(SQLAEnum("processing", "completed", "failed", "partial", name="upload_status_enum"), default="processing")
    processing_started_at = Column(TIMESTAMP, default=datetime.utcnow)
    processing_completed_at = Column(TIMESTAMP, nullable=True)

class UserAuditLog(Base):
    __tablename__ = "user_audit_log"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(255))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    details = Column(JSON)
    timestamp = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", backref="audit_logs")


class EncryptionKey(Base):
    __tablename__ = "encryption_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_version = Column(String(50), unique=True, nullable=False)
    key_hash = Column(String(255), nullable=False)
    algorithm = Column(String(50), default='AES-256', nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    rotated_at = Column(TIMESTAMP, nullable=True)