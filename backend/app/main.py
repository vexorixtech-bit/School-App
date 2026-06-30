from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, Base, get_db
from app.routers import auth, dashboard, students, teachers, classes, attendance, fees, exams, timetable, notifications, reports, payments, users, events
from sqlalchemy.orm import Session
from app.models.models import User, UserRole, AuditLog
from app.auth.auth_handler import hash_password, decode_token
from app.websocket_manager import manager
import os
import traceback
import bleach
from datetime import datetime

app = FastAPI(title=settings.APP_NAME, version="1.0.0", docs_url="/docs" if settings.is_debug else None, redoc_url=None)

# CORS — locked to configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# XSS sanitization — strips HTML tags from request JSON
ALLOWED_TAGS = []
ALLOWED_ATTRIBUTES = {}
def sanitize_value(v):
    if isinstance(v, str):
        return bleach.clean(v, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)
    if isinstance(v, dict):
        return {k: sanitize_value(v) for k, v in v.items()}
    if isinstance(v, list):
        return [sanitize_value(item) for item in v]
    return v

# Audit log disabled — SessionLocal() hangs on Neon after request completes

# Global exception handler — no stack trace leak in production
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.is_debug:
        return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": traceback.format_exc()})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Create tables
Base.metadata.create_all(bind=engine)

# Static files
os.makedirs("uploads/students", exist_ok=True)
os.makedirs("uploads/teachers", exist_ok=True)
os.makedirs("uploads/events", exist_ok=True)
os.makedirs("uploads/profiles", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(classes.router)
app.include_router(attendance.router)
app.include_router(fees.router)
app.include_router(exams.router)
app.include_router(timetable.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(payments.router)
app.include_router(users.router)
app.include_router(events.router)

# WebSocket for real-time push
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = ""):
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4001)
        return
    
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)

# Health check (root for Render)
@app.get("/")
@app.head("/")
@app.get("/api/health")
@app.head("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}

# Startup event
@app.on_event("startup")
def startup():
    from app.database import SessionLocal, USE_SQLITE
    if not USE_SQLITE:
        print("Connecting to database...", flush=True)
        try:
            db = SessionLocal()
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
            db.close()
            print("Database connected successfully", flush=True)
        except Exception as e:
            print(f"DATABASE CONNECTION FAILED: {e}", flush=True)

    # Seed default accounts
    try:
        db = SessionLocal()
        try:
            admin = db.query(User).filter(User.username == "superadmin").first()
            if not admin:
                admin = User(
                    email="admin@schooleerp.com",
                    username="superadmin",
                    password_hash=hash_password("admin123"),
                    full_name="Super Admin",
                    role=UserRole.SUPER_ADMIN,
                    is_active=True,
                    is_verified=True
                )
                db.add(admin)
                db.commit()
                print("SUPER ADMIN CREATED (superadmin / admin123)", flush=True)
            else:
                print("SUPER ADMIN ALREADY EXISTS", flush=True)
        finally:
            db.close()
    except Exception as e:
        print(f"Seed error: {e}", flush=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
