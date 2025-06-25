import type { Patient } from "./patient" // Assuming Patient is defined in a separate file

export interface ValidationError {
  field: string
  message: string
}

export function validatePatientData(data: Partial<Patient>): ValidationError[] {
  const errors: ValidationError[] = []

  // First name validation
  if (!data.first_name?.trim()) {
    errors.push({ field: "first_name", message: "First name is required" })
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.first_name)) {
    errors.push({
      field: "first_name",
      message: "First name can only contain letters, spaces, hyphens, and apostrophes",
    })
  }

  // Last name validation
  if (!data.last_name?.trim()) {
    errors.push({ field: "last_name", message: "Last name is required" })
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.last_name)) {
    errors.push({ field: "last_name", message: "Last name can only contain letters, spaces, hyphens, and apostrophes" })
  }

  // Date of birth validation
  if (!data.date_of_birth) {
    errors.push({ field: "date_of_birth", message: "Date of birth is required" })
  } else {
    const dob = new Date(data.date_of_birth)
    const today = new Date()
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate())

    if (isNaN(dob.getTime())) {
      errors.push({ field: "date_of_birth", message: "Please enter a valid date" })
    } else if (dob > today) {
      errors.push({ field: "date_of_birth", message: "Date of birth cannot be in the future" })
    } else if (dob < minDate) {
      errors.push({ field: "date_of_birth", message: "Please enter a valid date of birth" })
    }
  }

  // Gender validation
  if (!data.gender) {
    errors.push({ field: "gender", message: "Gender is required" })
  } else if (!["Male", "Female", "Other"].includes(data.gender)) {
    errors.push({ field: "gender", message: "Please select a valid gender" })
  }

  return errors
}
