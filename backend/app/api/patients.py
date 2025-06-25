# Complete patients.py with all CRUD operations
# File: backend/app/api/patients.py

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.core.deps import get_db, get_current_user
from app.models.models import User, Patient, FileUpload
from app.schemas.patient import (
    PatientListResponse, 
    PatientRow, 
    PatientDetail, 
    UpdatePatientRequest,
    PatientSearchRequest,
    PatientUploadResponse
)
from app.utils.encryption import encrypt_field, decrypt_field
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import io
import uuid
from datetime import datetime
from typing import Optional
import hashlib

router = APIRouter()

# Create limiter with IP-based rate limiting
limiter = Limiter(key_func=get_remote_address)

def require_manager_role(current_user: User = Depends(get_current_user)):
    """Ensure user has Manager role"""
    if current_user.role.name != "Manager":
        raise HTTPException(status_code=403, detail="Manager access only")
    return current_user

def normalize_column_names(df):
    """Normalize column names to handle various formats"""
    column_mapping = {
        'patient id': 'patient_id',
        'patientid': 'patient_id',
        'patient_id': 'patient_id',
        'id': 'patient_id',
        'first name': 'first_name',
        'firstname': 'first_name',
        'first_name': 'first_name',
        'fname': 'first_name',
        'last name': 'last_name',
        'lastname': 'last_name',
        'last_name': 'last_name',
        'lname': 'last_name',
        'surname': 'last_name',
        'date of birth': 'date_of_birth',
        'dateofbirth': 'date_of_birth',
        'date_of_birth': 'date_of_birth',
        'dob': 'date_of_birth',
        'birth_date': 'date_of_birth',
        'birthdate': 'date_of_birth',
        'gender': 'gender',
        'sex': 'gender',
    }
    
    new_columns = {}
    for col in df.columns:
        normalized_col = col.lower().strip()
        if normalized_col in column_mapping:
            new_columns[col] = column_mapping[normalized_col]
        else:
            new_columns[col] = col
    
    return df.rename(columns=new_columns)

def validate_required_columns(df):
    """Validate that all required columns are present"""
    required_columns = ['patient_id', 'first_name', 'last_name', 'date_of_birth', 'gender']
    actual_columns = [col.lower().strip() for col in df.columns]
    missing_columns = [req_col for req_col in required_columns if req_col not in actual_columns]
    return missing_columns

def create_data_hash(patient_id: str, first_name: str, last_name: str, date_of_birth: str, gender: str) -> str:
    """Create a hash of patient data for integrity checking"""
    data_string = f"{patient_id}|{first_name}|{last_name}|{date_of_birth}|{gender}"
    return hashlib.sha256(data_string.encode()).hexdigest()

# ===== UPLOAD ENDPOINTS =====

@router.post("/upload", response_model=PatientUploadResponse)
@limiter.limit("10/hour")
async def upload_patients(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role)
):
    """Upload patients from CSV or XLSX file"""
    try:
        # Validate file type
        allowed_extensions = ['.csv', '.xlsx', '.xls']
        file_extension = None
        for ext in allowed_extensions:
            if file.filename.lower().endswith(ext):
                file_extension = ext
                break
        
        if not file_extension:
            raise HTTPException(
                status_code=400, 
                detail="Only CSV and Excel files (.csv, .xlsx, .xls) are allowed"
            )
        
        # Generate batch ID
        batch_id = str(uuid.uuid4())
        
        # Read the file
        contents = await file.read()
        file_size = len(contents)
        
        if file_extension == '.csv':
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Normalize column names
        df = normalize_column_names(df)
        
        # Validate required columns
        missing_columns = validate_required_columns(df)
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_columns}. Required: Patient ID, First Name, Last Name, Date of Birth, Gender"
            )
        
        # Clean data
        df = df.dropna(subset=['patient_id'])
        
        # Create file upload record
        file_upload = FileUpload(
            batch_id=batch_id,
            uploaded_by=current_user.id,
            original_filename=file.filename,
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
            total_records=len(df),
            successful_records=0,
            failed_records=0,
            status="processing"
        )
        db.add(file_upload)
        db.commit()
        
        # Process patients
        successful_count = 0
        failed_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Validate row data
                patient_id = str(row['patient_id']).strip()
                first_name = str(row['first_name']).strip()
                last_name = str(row['last_name']).strip()
                date_of_birth = str(row['date_of_birth']).strip()
                gender = str(row['gender']).strip()
                
                if not all([patient_id, first_name, last_name, date_of_birth, gender]):
                    errors.append(f"Row {index + 1}: Missing required data")
                    failed_count += 1
                    continue
                
                # Check if patient already exists
                existing_patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
                if existing_patient:
                    errors.append(f"Row {index + 1}: Patient ID {patient_id} already exists")
                    failed_count += 1
                    continue
                
                # Encrypt patient data
                encrypted_first_name = encrypt_field(first_name)
                encrypted_last_name = encrypt_field(last_name)
                encrypted_date_of_birth = encrypt_field(date_of_birth)
                encrypted_gender = encrypt_field(gender)
                
                # Create data hash
                data_hash = create_data_hash(patient_id, first_name, last_name, date_of_birth, gender)
                
                # Create patient record
                patient = Patient(
                    patient_id=patient_id,
                    first_name_encrypted=encrypted_first_name,
                    last_name_encrypted=encrypted_last_name,
                    date_of_birth_encrypted=encrypted_date_of_birth,
                    gender_encrypted=encrypted_gender,
                    uploaded_by=current_user.id,
                    encryption_key_version="v1.0",
                    file_upload_batch_id=batch_id,
                    data_hash=data_hash
                )
                
                db.add(patient)
                successful_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                failed_count += 1
                continue
        
        # Update file upload record
        file_upload.successful_records = successful_count
        file_upload.failed_records = failed_count
        file_upload.status = "completed" if failed_count == 0 else ("partial" if successful_count > 0 else "failed")
        file_upload.processing_completed_at = datetime.utcnow()
        
        db.commit()
        
        return PatientUploadResponse(
            batch_id=batch_id,
            filename=file.filename,
            total_records=len(df),
            status=file_upload.status,
            uploaded_at=file_upload.processing_started_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ===== PATIENT CRUD ENDPOINTS =====

@router.get("", response_model=PatientListResponse)
async def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    """Get paginated list of patients"""
    try:
        offset = (page - 1) * limit
        
        # Query patients uploaded by current user
        query = db.query(Patient).filter(Patient.uploaded_by == current_user.id)
        total = query.count()
        patients = query.offset(offset).limit(limit).all()
        
        # Decrypt patient data for response
        patient_rows = []
        for patient in patients:
            try:
                patient_row = PatientRow(
                    id=patient.id,
                    patient_id=patient.patient_id,
                    first_name=decrypt_field(patient.first_name_encrypted),
                    last_name=decrypt_field(patient.last_name_encrypted),
                    date_of_birth=decrypt_field(patient.date_of_birth_encrypted),
                    gender=decrypt_field(patient.gender_encrypted),
                    uploaded_by=current_user.username,
                    uploaded_at=patient.created_at,
                    updated_at=patient.updated_at
                )
                patient_rows.append(patient_row)
            except Exception as e:
                # Skip patients that can't be decrypted
                continue
        
        pages = (total + limit - 1) // limit
        
        return PatientListResponse(
            patients=patient_rows,
            page=page,
            limit=limit,
            total=total,
            pages=pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patients: {str(e)}")

@router.post("/search", response_model=PatientListResponse)
async def search_patients(
    search_request: PatientSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    """Search patients with various criteria"""
    try:
        offset = (page - 1) * limit
        
        # Get all patients for the user (we need to decrypt to search)
        all_patients = db.query(Patient).filter(Patient.uploaded_by == current_user.id).all()
        
        # Filter patients based on search criteria
        filtered_patients = []
        for patient in all_patients:
            try:
                # Decrypt data for searching
                decrypted_data = {
                    'patient_id': patient.patient_id,
                    'first_name': decrypt_field(patient.first_name_encrypted).lower(),
                    'last_name': decrypt_field(patient.last_name_encrypted).lower(),
                    'date_of_birth': decrypt_field(patient.date_of_birth_encrypted),
                    'gender': decrypt_field(patient.gender_encrypted).lower()
                }
                
                # Apply search filters
                matches = True
                
                if search_request.patient_id:
                    if search_request.patient_id.lower() not in decrypted_data['patient_id'].lower():
                        matches = False
                
                if search_request.first_name and matches:
                    if search_request.first_name.lower() not in decrypted_data['first_name']:
                        matches = False
                
                if search_request.last_name and matches:
                    if search_request.last_name.lower() not in decrypted_data['last_name']:
                        matches = False
                
                if search_request.gender and matches:
                    if search_request.gender.lower() not in decrypted_data['gender']:
                        matches = False
                
                if search_request.date_of_birth and matches:
                    if search_request.date_of_birth not in decrypted_data['date_of_birth']:
                        matches = False
                
                if matches:
                    filtered_patients.append((patient, decrypted_data))
                    
            except Exception:
                # Skip patients that can't be decrypted
                continue
        
        # Apply pagination
        total = len(filtered_patients)
        paginated_patients = filtered_patients[offset:offset + limit]
        
        # Create response
        patient_rows = []
        for patient, decrypted_data in paginated_patients:
            patient_row = PatientRow(
                id=patient.id,
                patient_id=patient.patient_id,
                first_name=decrypted_data['first_name'].title(),
                last_name=decrypted_data['last_name'].title(),
                date_of_birth=decrypted_data['date_of_birth'],
                gender=decrypted_data['gender'].title(),
                uploaded_by=current_user.username,
                uploaded_at=patient.created_at,
                updated_at=patient.updated_at
            )
            patient_rows.append(patient_row)
        
        pages = (total + limit - 1) // limit
        
        return PatientListResponse(
            patients=patient_rows,
            page=page,
            limit=limit,
            total=total,
            pages=pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/{patient_id}", response_model=PatientDetail)
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role)
):
    """Get individual patient details"""
    try:
        # Find patient
        patient = db.query(Patient).filter(
            and_(Patient.id == patient_id, Patient.uploaded_by == current_user.id)
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Decrypt patient data
        try:
            decrypted_data = {
                'first_name': decrypt_field(patient.first_name_encrypted),
                'last_name': decrypt_field(patient.last_name_encrypted),
                'date_of_birth': decrypt_field(patient.date_of_birth_encrypted),
                'gender': decrypt_field(patient.gender_encrypted)
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail="Unable to decrypt patient data")
        
        return PatientDetail(
            id=patient.id,
            patient_id=patient.patient_id,
            first_name=decrypted_data['first_name'],
            last_name=decrypted_data['last_name'],
            date_of_birth=decrypted_data['date_of_birth'],
            gender=decrypted_data['gender'],
            uploaded_by=current_user.username,
            uploaded_at=patient.created_at,
            updated_at=patient.updated_at,
            batch_id=patient.file_upload_batch_id or "N/A"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patient: {str(e)}")

@router.put("/{patient_id}", response_model=PatientDetail)
async def update_patient(
    patient_id: int,
    update_data: UpdatePatientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role)
):
    """Update patient information"""
    try:
        # Find patient
        patient = db.query(Patient).filter(
            and_(Patient.id == patient_id, Patient.uploaded_by == current_user.id)
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Update encrypted fields
        patient.first_name_encrypted = encrypt_field(update_data.first_name)
        patient.last_name_encrypted = encrypt_field(update_data.last_name)
        patient.date_of_birth_encrypted = encrypt_field(update_data.date_of_birth)
        patient.gender_encrypted = encrypt_field(update_data.gender)
        
        # Update data hash
        patient.data_hash = create_data_hash(
            patient.patient_id,
            update_data.first_name,
            update_data.last_name,
            update_data.date_of_birth,
            update_data.gender
        )
        
        patient.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(patient)
        
        return PatientDetail(
            id=patient.id,
            patient_id=patient.patient_id,
            first_name=update_data.first_name,
            last_name=update_data.last_name,
            date_of_birth=update_data.date_of_birth,
            gender=update_data.gender,
            uploaded_by=current_user.username,
            uploaded_at=patient.created_at,
            updated_at=patient.updated_at,
            batch_id=patient.file_upload_batch_id or "N/A"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@router.delete("/{patient_id}")
async def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role)
):
    """Delete a patient"""
    try:
        # Find patient
        patient = db.query(Patient).filter(
            and_(Patient.id == patient_id, Patient.uploaded_by == current_user.id)
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Delete patient
        db.delete(patient)
        db.commit()
        
        return {"message": "Patient deleted successfully", "patient_id": patient_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")

# ===== DEBUG ENDPOINTS =====

@router.post("/debug-columns")
async def debug_file_columns(
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager_role)
):
    """Debug endpoint to see what columns are in your file"""
    try:
        contents = await file.read()
        
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        original_columns = list(df.columns)
        df_normalized = normalize_column_names(df)
        normalized_columns = list(df_normalized.columns)
        
        return {
            "file_name": file.filename,
            "original_columns": original_columns,
            "normalized_columns": normalized_columns,
            "row_count": len(df),
            "sample_data": df.head(2).to_dict('records') if len(df) > 0 else []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")