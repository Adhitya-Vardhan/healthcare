# File: app/db/session.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Configure connection pool for WebSocket connections with better SSL handling
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=20,  # Increased from default 5
    max_overflow=30,  # Increased from default 10
    pool_recycle=1800,  # Recycle connections after 30 minutes (reduced from 1 hour)
    pool_timeout=30,  # Connection timeout
    pool_reset_on_return='commit',  # Reset connection state on return
    echo=False,  # Set to True for SQL debugging
    # SSL configuration for better connection stability
    connect_args={
        "connect_timeout": 10,
        "application_name": "health_care_backend"
    } if "postgresql" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

