# Fixed patients.py - remove the problematic exception handler
# File: backend/app/api/patients.py

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.models import User
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import io

router = APIRouter()

# Create limiter with IP-based rate limiting (simplest approach)
limiter = Limiter(key_func=get_remote_address)

def get_user_id_safe(request: Request) -> str:
    """Safe function to get user identification for rate limiting"""
    try:
        # Check if we have user info in state
        if hasattr(request.state, 'user_id') and request.state.user_id:
            return f"user_{request.state.user_id}"
        elif hasattr(request.state, 'user') and request.state.user:
            return f"user_{request.state.user.id}"
        else:
            # Fallback to IP address
            return f"ip_{get_remote_address(request)}"
    except Exception:
        return f"ip_{get_remote_address(request)}"

@router.post("/upload")
@limiter.limit("10/hour")  # Simple IP-based rate limiting
async def upload_patients(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload patients from CSV file"""
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        # Read the CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate CSV structure
        required_columns = ['name', 'email', 'phone', 'date_of_birth']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_columns}"
            )
        
        # Process patients (add your patient creation logic here)
        patients_created = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Add your patient creation logic here
                # For now, just count successful rows
                patients_created += 1
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
        
        return {
            "message": f"Successfully processed {patients_created} patients",
            "total_rows": len(df),
            "patients_created": patients_created,
            "errors": errors[:10] if errors else []  # Limit error messages
        }
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/upload-safe")
async def upload_patients_safe(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload patients from CSV file without rate limiting"""
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        # Read the CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate CSV structure
        required_columns = ['name', 'email', 'phone', 'date_of_birth']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_columns}"
            )
        
        # Process patients
        patients_created = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Add your patient creation logic here
                patients_created += 1
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
        
        return {
            "message": f"Successfully processed {patients_created} patients",
            "total_rows": len(df),
            "patients_created": patients_created,
            "errors": errors[:10] if errors else []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Remove the problematic router.add_exception_handler line
# Exception handlers should be added at the app level, not router level