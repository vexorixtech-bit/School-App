from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models.models import User, UserRole
from app.schemas.schemas import UserCreate, UserOut, UserUpdate
from app.auth.auth_handler import get_current_user, hash_password, role_required
from datetime import datetime

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/")
def get_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1, per_page: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required("super_admin", "admin"))
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        q = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(q)) | (User.username.ilike(q)) | (User.email.ilike(q))
        )
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "users": [UserOut.model_validate(u) for u in users],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@router.post("/", response_model=UserOut)
def create_user(
    req: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required("super_admin", "admin"))
):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if req.email and db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    if req.role not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = User(
        username=req.username,
        email=req.email or f"{req.username}@school.local",
        full_name=req.full_name,
        password_hash=hash_password(req.password),
        role=req.role,
        phone=req.phone,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    req: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required("super_admin", "admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required("super_admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}
