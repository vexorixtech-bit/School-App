import os
import socket
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

def force_ipv4(url: str) -> str:
    match = re.match(r'postgresql://([^@]+)@([^:]+):(\d+)/(.+)$', url)
    if match:
        user_part = match.group(1)
        host = match.group(2)
        port = match.group(3)
        db = match.group(4)
        try:
            ip = socket.getaddrinfo(host, int(port), socket.AF_INET)[0][4][0]
            return f"postgresql://{user_part}@{ip}:{port}/{db}"
        except Exception:
            pass
    return url

use_sqlite = not settings.DATABASE_URL or settings.DATABASE_URL == "postgresql://postgres:postgres@localhost:5432/school_erp"

if use_sqlite:
    db_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(db_dir, exist_ok=True)
    DATABASE_URL = f"sqlite:///{os.path.join(db_dir, 'school_erp.db')}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    DATABASE_URL = force_ipv4(settings.DATABASE_URL)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=20, max_overflow=10)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
