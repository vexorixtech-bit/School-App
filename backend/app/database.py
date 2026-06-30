import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

USE_SQLITE = os.getenv("USE_SQLITE", "False").lower() == "true"

if USE_SQLITE:
    db_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(db_dir, exist_ok=True)
    DATABASE_URL = f"sqlite:///{os.path.join(db_dir, 'school_erp.db')}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    DATABASE_URL = settings.DATABASE_URL
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=5, connect_args={"connect_timeout": 15})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
