# STEP 38: Download Excel template
# File: app/api/files.py

from fastapi.responses import StreamingResponse
import io
from openpyxl import Workbook
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_db, get_current_user
from app.models.models import Patient
from app.utils.encryption import decrypt_field
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/files/template")
def download_template(current_user = Depends(get_current_user)):
    if current_user.role.name != "Manager":
        raise HTTPException(status_code=403, detail="Access denied")

    wb = Workbook()
    ws = wb.active
    ws.append(["Patient ID", "First Name", "Last Name", "Date of Birth", "Gender"])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="patient_data_template.xlsx"'
        }
    )

# STEP 39: Export patient data as Excel
# File: app/api/files.py (extend)

@router.get("/files/export")
def export_patients(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role.name != "Manager":
        raise HTTPException(status_code=403, detail="Access denied")

    patients = db.query(Patient).filter(Patient.uploaded_by == current_user.id).all()

    wb = Workbook()
    ws = wb.active
    ws.append(["Patient ID", "First Name", "Last Name", "Date of Birth", "Gender"])

    for p in patients:
        ws.append([
            p.patient_id,
            decrypt_field(p.first_name_encrypted),
            decrypt_field(p.last_name_encrypted),
            decrypt_field(p.date_of_birth_encrypted),
            decrypt_field(p.gender_encrypted),
        ])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="patient_export.xlsx"'
        }
    )
