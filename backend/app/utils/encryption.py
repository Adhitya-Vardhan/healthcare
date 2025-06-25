# STEP 25: Create encryption utils using Fernet (AES-256)
# File: app/utils/encryption.py

from cryptography.fernet import Fernet
import base64
import os

# Temporary key loading - in production use DB
def load_active_key() -> str:
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise ValueError("Missing ENCRYPTION_KEY in environment")
    return key

def get_cipher():
    key = load_active_key()
    key_bytes = base64.urlsafe_b64encode(key.encode()[:32])
    return Fernet(key_bytes)

def encrypt_field(value: str) -> str:
    return get_cipher().encrypt(value.encode()).decode()

def decrypt_field(value: str) -> str:
    return get_cipher().decrypt(value.encode()).decode()
