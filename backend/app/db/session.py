# File: app/db/session.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Configure connection pool for WebSocket connections
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=20,  # Increased from default 5
    max_overflow=30,  # Increased from default 10
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_timeout=30  # Connection timeout
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

