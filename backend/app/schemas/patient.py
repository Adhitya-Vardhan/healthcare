# Updated patient schemas
# File: app/schemas/patient.py

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class PatientUploadResponse(BaseModel):
    batch_id: str
    filename: str
    total_records: int
    status: str
    uploaded_at: datetime

class UploadStatus(BaseModel):
    batch_id: str
    status: str
    total_records: int
    successful_records: int
    failed_records: int
    uploaded_at: datetime

    class Config:
        from_attributes = True

class PatientRow(BaseModel):
    id: int
    patient_id: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    uploaded_by: str
    uploaded_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PatientListResponse(BaseModel):
    patients: list[PatientRow]
    page: int
    limit: int
    total: int
    pages: int

class PatientDetail(BaseModel):
    id: int
    patient_id: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    uploaded_by: str
    uploaded_at: datetime
    updated_at: datetime
    batch_id: str

    class Config:
        from_attributes = True

class UpdatePatientRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: str = Field(..., description="Date in YYYY-MM-DD format")
    gender: str = Field(..., min_length=1, max_length=50)

class PatientSearchRequest(BaseModel):
    patient_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    date_range: Optional[Dict[str, str]] = None  # {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}

class CreatePatientRequest(BaseModel):
    patient_id: str = Field(..., min_length=1, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: str = Field(..., description="Date in YYYY-MM-DD format")
    gender: str = Field(..., min_length=1, max_length=50)