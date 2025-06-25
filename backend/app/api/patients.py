# Enhanced patients.py with WebSocket real-time notifications
# File: app/api/patients.py

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
from app.utils.encryption import encryption_service
from app.core.websocket_manager import websocket_notifier  # Import WebSocket notifier
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import io
import uuid
from datetime import datetime
from typing import Optional
import hashlib
import asyncio

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

# ===== UPLOAD ENDPOINTS WITH REAL-TIME PROGRESS =====

@router.post("/upload", response_model=PatientUploadResponse)
@limiter.limit("10/hour")
async def upload_patients_with_progress(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role)
):
    """Upload patients with real-time WebSocket progress updates"""
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
        
        # Notify upload started
        await websocket_notifier.notify_upload_progress(
            current_user.id, 
            batch_id, 
            0, 
            "Upload started - Reading file..."
        )
        
        # Read the file
        contents = await file.read()
        file_size = len(contents)
        
        # Notify file read complete
        await websocket_notifier.notify_upload_progress(
            current_user.id, 
            batch_id, 
            10, 
            "File read complete - Parsing data..."
        )
        
        if file_extension == '.csv':
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Notify parsing complete
        await websocket_notifier.notify_upload_progress(
            current_user.id, 
            batch_id, 
            20, 
            "Data parsing complete - Validating structure..."
        )
        
        # Normalize column names
        df = normalize_column_names(df)
        
        # Validate required columns
        missing_columns = validate_required_columns(df)
        if missing_columns:
            await websocket_notifier.notify_upload_error(
                current_user.id,
                batch_id,
                f"Missing required columns: {missing_columns}"
            )
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_columns}. Required: Patient ID, First Name, Last Name, Date of Birth, Gender"
            )
        
        # Clean data
        df = df.dropna(subset=['patient_id'])
        
        # Notify validation complete
        await websocket_notifier.notify_upload_progress(
            current_user.id, 
            batch_id, 
            30, 
            f"Validation complete - Processing {len(df)} records..."
        )
        
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
        
        # Process patients with progress updates
        successful_count = 0
        failed_count = 0
        errors = []
        total_records = len(df)
        
        for index, row in df.iterrows():
            try:
                # Calculate progress (30% start + 60% for processing + 10% for completion)
                progress = 30 + int((index / total_records) * 60)
                
                # Send progress update every 10 records or on last record
                if index % 10 == 0 or index == total_records - 1:
                    await websocket_notifier.notify_upload_progress(
                        current_user.id,
                        batch_id,
                        progress,
                        f"Processing record {index + 1} of {total_records}..."
                    )
                
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
                
                # Encrypt patient data with audit logging
                encrypted_first_name = encryption_service.encrypt_field(
                    first_name, "first_name", db, patient_id, current_user.id
                )
                encrypted_last_name = encryption_service.encrypt_field(
                    last_name, "last_name", db, patient_id, current_user.id
                )
                encrypted_date_of_birth = encryption_service.encrypt_field(
                    date_of_birth, "date_of_birth", db, patient_id, current_user.id
                )
                encrypted_gender = encryption_service.encrypt_field(
                    gender, "gender", db, patient_id, current_user.id
                )
                
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
                
                # Send notification for successful patient creation
                await websocket_notifier.notify_patient_created(
                    current_user.id,
                    patient_id,
                    f"{first_name} {last_name}"
                )
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                failed_count += 1
                continue
        
        # Notify processing complete
        await websocket_notifier.notify_upload_progress(
            current_user.id, 
            batch_id, 
            90, 
            "Processing complete - Finalizing upload..."
        )
        
        # Update file upload record
        file_upload.successful_records = successful_count
        file_upload.failed_records = failed_count
        file_upload.status = "completed" if failed_count == 0 else ("partial" if successful_count > 0 else "failed")
        file_upload.processing_completed_at = datetime.utcnow()
        
        db.commit()
        
        # Send final completion notification
        await websocket_notifier.notify_upload_complete(
            current_user.id,
            batch_id,
            total_records,
            successful_count,
            failed_count
        )
        
        # Notify audit event for admins
        await websocket_notifier.notify_audit_event(
            "patient_upload_completed",
            current_user.id,
            {
                "batch_id": batch_id,
                "total_records": total_records,
                "successful": successful_count,
                "failed": failed_count,
                "filename": file.filename
            }
        )
        
        return PatientUploadResponse(
            batch_id=batch_id,
            filename=file.filename,
            total_records=len(df),
            status=file_upload.status,
            uploaded_at=file_upload.processing_started_at
        )
        
    except HTTPException:
        # Send error notification for HTTP exceptions
        if 'batch_id' in locals():
            await websocket_notifier.notify_upload_error(
                current_user.id,
                batch_id,
                "Upload failed due to validation error"
            )
        raise
    except Exception as e:
        db.rollback()
        # Send error notification
        if 'batch_id' in locals():
            await websocket_notifier.notify_upload_error(
                current_user.id,
                batch_id,
                f"Upload failed: {str(e)}"
            )
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ===== PATIENT CRUD ENDPOINTS WITH NOTIFICATIONS =====

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
                # Decrypt with audit logging
                first_name = encryption_service.decrypt_field(
                    patient.first_name_encrypted, "first_name", db, patient.patient_id, current_user.id
                )
                last_name = encryption_service.decrypt_field(
                    patient.last_name_encrypted, "last_name", db, patient.patient_id, current_user.id
                )
                date_of_birth = encryption_service.decrypt_field(
                    patient.date_of_birth_encrypted, "date_of_birth", db, patient.patient_id, current_user.id
                )
                gender = encryption_service.decrypt_field(
                    patient.gender_encrypted, "gender", db, patient.patient_id, current_user.id
                )
                
                patient_row = PatientRow(
                    id=patient.id,
                    patient_id=patient.patient_id,
                    first_name=first_name,
                    last_name=last_name,
                    date_of_birth=date_of_birth,
                    gender=gender,
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

@router.put("/{patient_id}", response_model=PatientDetail)
async def update_patient_with_notification(
    patient_id: int,
    update_data: UpdatePatientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role)
):
    """Update patient information with real-time notifications"""
    try:
        # Find patient
        patient = db.query(Patient).filter(
            and_(Patient.id == patient_id, Patient.uploaded_by == current_user.id)
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Update encrypted fields with audit logging
        patient.first_name_encrypted = encryption_service.encrypt_field(
            update_data.first_name, "first_name", db, patient.patient_id, current_user.id
        )
        patient.last_name_encrypted = encryption_service.encrypt_field(
            update_data.last_name, "last_name", db, patient.patient_id, current_user.id
        )
        patient.date_of_birth_encrypted = encryption_service.encrypt_field(
            update_data.date_of_birth, "date_of_birth", db, patient.patient_id, current_user.id
        )
        patient.gender_encrypted = encryption_service.encrypt_field(
            update_data.gender, "gender", db, patient.patient_id, current_user.id
        )
        
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
        
        # Send real-time notification
        await websocket_notifier.notify_patient_updated(
            current_user.id,
            patient.patient_id,
            f"{update_data.first_name} {update_data.last_name}"
        )
        
        # Notify audit event for admins
        await websocket_notifier.notify_audit_event(
            "patient_updated",
            current_user.id,
            {
                "patient_id": patient.patient_id,
                "patient_name": f"{update_data.first_name} {update_data.last_name}"
            }
        )
        
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
async def delete_patient_with_notification(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_role)
):
    """Delete a patient with real-time notifications"""
    try:
        # Find patient
        patient = db.query(Patient).filter(
            and_(Patient.id == patient_id, Patient.uploaded_by == current_user.id)
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get patient name for notification (decrypt first)
        try:
            first_name = encryption_service.decrypt_field(
                patient.first_name_encrypted, "first_name", db, patient.patient_id, current_user.id
            )
            last_name = encryption_service.decrypt_field(
                patient.last_name_encrypted, "last_name", db, patient.patient_id, current_user.id
            )
            patient_name = f"{first_name} {last_name}"
        except:
            patient_name = patient.patient_id
        
        # Delete patient
        db.delete(patient)
        db.commit()
        
        # Send real-time notification
        await websocket_notifier.notify_patient_deleted(
            current_user.id,
            patient.patient_id,
            patient_name
        )
        
        # Notify audit event for admins
        await websocket_notifier.notify_audit_event(
            "patient_deleted",
            current_user.id,
            {
                "patient_id": patient.patient_id,
                "patient_name": patient_name
            }
        )
        
        return {"message": "Patient deleted successfully", "patient_id": patient_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")

# ===== SEARCH AND OTHER ENDPOINTS (same as before) =====

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
                    'first_name': encryption_service.decrypt_field(patient.first_name_encrypted, "first_name").lower(),
                    'last_name': encryption_service.decrypt_field(patient.last_name_encrypted, "last_name").lower(),
                    'date_of_birth': encryption_service.decrypt_field(patient.date_of_birth_encrypted, "date_of_birth"),
                    'gender': encryption_service.decrypt_field(patient.gender_encrypted, "gender").lower()
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
        
        # Decrypt patient data with audit logging
        try:
            first_name = encryption_service.decrypt_field(
                patient.first_name_encrypted, "first_name", db, patient.patient_id, current_user.id
            )
            last_name = encryption_service.decrypt_field(
                patient.last_name_encrypted, "last_name", db, patient.patient_id, current_user.id
            )
            date_of_birth = encryption_service.decrypt_field(
                patient.date_of_birth_encrypted, "date_of_birth", db, patient.patient_id, current_user.id
            )
            gender = encryption_service.decrypt_field(
                patient.gender_encrypted, "gender", db, patient.patient_id, current_user.id
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail="Unable to decrypt patient data")
        
        return PatientDetail(
            id=patient.id,
            patient_id=patient.patient_id,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            gender=gender,
            uploaded_by=current_user.username,
            uploaded_at=patient.created_at,
            updated_at=patient.updated_at,
            batch_id=patient.file_upload_batch_id or "N/A"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patient: {str(e)}")

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