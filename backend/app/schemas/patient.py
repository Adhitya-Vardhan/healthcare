# STEP 24: Create schema for upload response
# File: app/schemas/patient.py

from pydantic import BaseModel
from datetime import datetime

class PatientUploadResponse(BaseModel):
    batch_id: str
    filename: str
    total_records: int
    status: str
    uploaded_at: datetime

# STEP 28: Upload status schema
# File: app/schemas/patient.py (extend)

class UploadStatus(BaseModel):
    batch_id: str
    status: str
    total_records: int
    successful_records: int
    failed_records: int
    uploaded_at: datetime

    class Config:
        orm_mode = True

# STEP 30: Add schema to return decrypted patient data
# File: app/schemas/patient.py

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
        orm_mode = True

class PatientListResponse(BaseModel):
    patients: list[PatientRow]
    page: int
    limit: int
    total: int
    pages: int

# STEP 32: Add schema for patient details and editing
# File: app/schemas/patient.py

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
        orm_mode = True

class UpdatePatientRequest(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str

# STEP 36: Add advanced search schema
# File: app/schemas/patient.py

class PatientSearchRequest(BaseModel):
    patient_id: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    date_range: dict | None = None  # {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}




