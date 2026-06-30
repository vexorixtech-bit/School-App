from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.models import User, UserRole, Teacher, SubjectTeacher, Subject, Class
from app.schemas.schemas import TeacherCreate, TeacherOut, TeacherUpdate
from app.auth.auth_handler import get_current_user, hash_password
from datetime import date
import random
import os
import uuid

router = APIRouter(prefix="/api/teachers", tags=["Teachers"])

def generate_teacher_id():
    year = date.today().year
    num = random.randint(100, 999)
    return f"TCH{year}{num}"

@router.get("/my-classes")
def get_my_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    assigned = db.query(SubjectTeacher.class_id).filter(SubjectTeacher.teacher_id == teacher.id).distinct().all()
    class_ids = set([c[0] for c in assigned])
    if teacher.class_teacher_of:
        class_ids.add(teacher.class_teacher_of)
    
    classes = db.query(Class).filter(Class.id.in_(class_ids), Class.is_active == True).all()
    return [{"id": c.id, "name": c.name} for c in classes]

@router.get("/", response_model=dict)
def get_teachers(
    page: int = 1, per_page: int = 20, search: Optional[str] = None,
    specialization: Optional[str] = None, is_active: Optional[bool] = None,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = db.query(Teacher)
    
    if search:
        q = f"%{search}%"
        query = query.filter(
            (Teacher.first_name.ilike(q)) | (Teacher.last_name.ilike(q)) |
            (Teacher.teacher_id.ilike(q)) | (Teacher.phone.ilike(q))
        )
    if specialization:
        query = query.filter(Teacher.specialization.ilike(f"%{specialization}%"))
    if is_active is not None:
        query = query.filter(Teacher.is_active == is_active)
    if class_id:
        query = query.filter(
            (Teacher.class_teacher_of == class_id) |
            (Teacher.id.in_(
                db.query(SubjectTeacher.teacher_id).filter(SubjectTeacher.class_id == class_id)
            ))
        )
    
    total = query.count()
    teachers = query.offset((page - 1) * per_page).limit(per_page).all()
    
    user_ids = [t.user_id for t in teachers if t.user_id]
    users = {u.id: u.username for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    
    result = []
    for t in teachers:
        tdata = TeacherOut.model_validate(t).model_dump()
        user = db.query(User).filter(User.id == t.user_id).first() if t.user_id else None
        tdata["username"] = user.username if user else None
        if t.class_teacher_of:
            cls = db.query(Class).filter(Class.id == t.class_teacher_of).first()
            if cls:
                tdata["class_name"] = cls.name
        sts = db.query(SubjectTeacher).filter(SubjectTeacher.teacher_id == t.id).all()
        subjects_list = []
        for st in sts:
            sub = db.query(Subject).filter(Subject.id == st.subject_id).first()
            if sub:
                cls = db.query(Class).filter(Class.id == st.class_id).first()
                subjects_list.append({
                    "id": sub.id, "subject_id": st.id,
                    "subject_name": sub.name,
                    "class_id": st.class_id,
                    "class_name": cls.name if cls else None
                })
        tdata["subjects"] = subjects_list
        result.append(tdata)
    
    return {
        "teachers": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@router.get("/my-profile")
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    class_info = None
    if teacher.class_teacher_of:
        cls = db.query(Class).filter(Class.id == teacher.class_teacher_of).first()
        if cls:
            class_info = {"id": cls.id, "name": cls.name, "code": cls.code}
    
    subjects = db.query(SubjectTeacher).filter(SubjectTeacher.teacher_id == teacher.id).all()
    subject_list = []
    for st in subjects:
        sub = db.query(Subject).filter(Subject.id == st.subject_id).first()
        cls = db.query(Class).filter(Class.id == st.class_id).first()
        if sub:
            subject_list.append({
                "id": st.id, "subject_id": sub.id, "subject_name": sub.name,
                "class_id": st.class_id, "class_name": cls.name if cls else None
            })
    
    return {
        "id": teacher.id, "teacher_id": teacher.teacher_id,
        "first_name": teacher.first_name, "last_name": teacher.last_name,
        "specialization": teacher.specialization, "email": teacher.email,
        "is_class_teacher": teacher.is_class_teacher,
        "class_teacher_of": class_info,
        "subjects": subject_list
    }

@router.get("/{teacher_id}")
def get_teacher(teacher_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    data = TeacherOut.model_validate(teacher).model_dump()
    if teacher.class_teacher_of:
        cls = db.query(Class).filter(Class.id == teacher.class_teacher_of).first()
        if cls:
            data["class_name"] = cls.name
    user = db.query(User).filter(User.id == teacher.user_id).first() if teacher.user_id else None
    data["username"] = user.username if user else None
    
    sts = db.query(SubjectTeacher).filter(SubjectTeacher.teacher_id == teacher.id).all()
    subjects_list = []
    for st in sts:
        sub = db.query(Subject).filter(Subject.id == st.subject_id).first()
        if sub:
            cls = db.query(Class).filter(Class.id == st.class_id).first()
            subjects_list.append({
                "id": sub.id, "subject_id": st.id,
                "subject_name": sub.name,
                "class_id": st.class_id,
                "class_name": cls.name if cls else None
            })
    data["subjects"] = subjects_list
    return data

@router.post("/")
def create_teacher(req: TeacherCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = Teacher(
        teacher_id=generate_teacher_id(),
        user_id=None,
        first_name=req.first_name,
        last_name=req.last_name,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        qualification=req.qualification,
        specialization=req.specialization,
        address=req.address,
        phone=req.phone,
        email=req.email,
        joining_date=req.joining_date
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return TeacherOut.model_validate(teacher)

@router.put("/{teacher_id}", response_model=TeacherOut)
def update_teacher(teacher_id: int, req: TeacherUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(teacher, key, value)
    db.commit()
    db.refresh(teacher)
    return TeacherOut.model_validate(teacher)

@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    teacher.is_active = False
    if teacher.user_id:
        user = db.query(User).filter(User.id == teacher.user_id).first()
        if user:
            user.is_active = False
    db.commit()
    return {"message": "Teacher deactivated"}

@router.post("/assign-subject")
def assign_subject(subject_id: int, teacher_id: int, class_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assignment = SubjectTeacher(subject_id=subject_id, teacher_id=teacher_id, class_id=class_id)
    db.add(assignment)
    db.commit()
    return {"message": "Subject assigned to teacher"}

@router.get("/{teacher_id}/subjects")
def get_teacher_subjects(teacher_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assignments = db.query(SubjectTeacher).filter(SubjectTeacher.teacher_id == teacher_id).all()
    return [{"id": a.id, "subject_id": a.subject_id, "class_id": a.class_id} for a in assignments]

@router.put("/{teacher_id}/assign-class-teacher")
def assign_class_teacher(teacher_id: int, class_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not teacher or not cls:
        raise HTTPException(status_code=404, detail="Teacher or Class not found")
    
    teacher.is_class_teacher = True
    teacher.class_teacher_of = class_id
    cls.class_teacher_id = teacher_id
    db.commit()
    return {"message": f"{teacher.first_name} assigned as class teacher of {cls.name}"}

@router.post("/{teacher_id}/create-login")
def create_teacher_login(teacher_id: int, req: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    if teacher.user_id:
        raise HTTPException(status_code=400, detail="Teacher already has a login")
    
    username = req.get("username")
    password = req.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=username,
        email=f"{username}@school.local",
        full_name=f"{teacher.first_name} {teacher.last_name}",
        password_hash=hash_password(password),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(user)
    db.flush()
    
    teacher.user_id = user.id
    db.commit()
    
    return {"username": username, "password": password}

TEACHER_UPLOAD_DIR = "uploads/teachers"
os.makedirs(TEACHER_UPLOAD_DIR, exist_ok=True)

@router.post("/my-profile/photo")
async def upload_my_photo(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can upload their own photo")

    MAX_SIZE = 5 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    filename = f"{teacher.id}_{uuid.uuid4()}.{ext}"
    filepath = os.path.join(TEACHER_UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    teacher.photo = f"/uploads/teachers/{filename}"
    db.commit()
    return {"photo_url": teacher.photo}

@router.post("/{teacher_id:int}/photo")
async def upload_photo(teacher_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    MAX_SIZE = 5 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    filename = f"{teacher_id}_{uuid.uuid4()}.{ext}"
    filepath = os.path.join(TEACHER_UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    teacher.photo = f"/uploads/teachers/{filename}"
    db.commit()
    return {"photo_url": teacher.photo}

@router.put("/{teacher_id}/update-login")
def update_teacher_login(teacher_id: int, req: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    if not teacher.user_id:
        raise HTTPException(status_code=400, detail="Teacher has no login yet. Use create-login first.")
    
    user = db.query(User).filter(User.id == teacher.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
    
    username = req.get("username")
    password = req.get("password")
    
    if username:
        existing = db.query(User).filter(User.username == username, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = username
        user.email = f"{username}@school.local"
    
    if password:
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        user.password_hash = hash_password(password)
        user.token_version += 1
    
    db.commit()
    return {"username": user.username, "password": password or "(unchanged)"}
