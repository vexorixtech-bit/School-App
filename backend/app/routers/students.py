from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models.models import User, UserRole, Student, Teacher, Class, Section, FeeStructure, Fee, Notification
from app.schemas.schemas import StudentCreate, StudentOut, StudentUpdate
from app.auth.auth_handler import get_current_user, hash_password
import os
import shutil
import uuid
from datetime import date, datetime

router = APIRouter(prefix="/api/students", tags=["Students"])

UPLOAD_DIR = "uploads/students"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_student_id():
    year = date.today().year
    import random
    num = random.randint(1000, 9999)
    return f"SCH{year}{num}"

@router.get("/my-profile")
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    data = {c.name: getattr(student, c.name) for c in student.__table__.columns if hasattr(StudentOut, c.name) or c.name in ('class_id', 'section_id')}
    if student.class_id:
        cls = db.query(Class).filter(Class.id == student.class_id).first()
        data["class_name"] = cls.name if cls else None
    if student.section_id:
        sec = db.query(Section).filter(Section.id == student.section_id).first()
        data["section_name"] = sec.name if sec else None
    return data

@router.get("/", response_model=dict)
def get_students(
    page: int = 1, per_page: int = 20, search: Optional[str] = None,
    class_id: Optional[int] = None, section_id: Optional[int] = None,
    gender: Optional[str] = None, is_active: Optional[bool] = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = db.query(Student)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Student.first_name.ilike(search_filter)) |
            (Student.last_name.ilike(search_filter)) |
            (Student.student_id.ilike(search_filter)) |
            (Student.phone.ilike(search_filter))
        )
    if class_id:
        query = query.filter(Student.class_id == class_id)
    if section_id:
        query = query.filter(Student.section_id == section_id)
    if gender:
        query = query.filter(Student.gender == gender)
    if is_active is not None:
        query = query.filter(Student.is_active == is_active)
    
    total = query.count()
    students = query.offset((page - 1) * per_page).limit(per_page).all()
    
    user_ids = [s.user_id for s in students if s.user_id]
    users = {u.id: u.username for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    
    result = []
    for s in students:
        d = StudentOut.model_validate(s).model_dump()
        d["username"] = users.get(s.user_id)
        result.append(d)
    
    return {
        "students": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@router.get("/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    user = db.query(User).filter(User.id == student.user_id).first() if student.user_id else None
    cls = db.query(Class).filter(Class.id == student.class_id).first()
    sec = db.query(Section).filter(Section.id == student.section_id).first()
    
    base = StudentOut.model_validate(student)
    data = base.model_dump()
    data["username"] = user.username if user else None
    data["user_full_name"] = user.full_name if user else None
    data["email"] = user.email if user and user.email else student.email
    data["class_name"] = cls.name if cls else None
    data["section_name"] = sec.name if sec else None
    data["first_name"] = student.first_name
    data["last_name"] = student.last_name
    return data

@router.post("/")
def create_student(req: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student_id = generate_student_id()
    
    cl = db.query(Class).filter(Class.id == req.class_id).first()
    if not cl:
        raise HTTPException(status_code=400, detail="Class not found")
    
    # --- Create student ---
    student = Student(
        student_id=student_id,
        user_id=None,
        first_name=req.first_name,
        last_name=req.last_name,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        address=req.address,
        city=req.city,
        state=req.state,
        pincode=req.pincode,
        phone=req.phone,
        email=req.email,
        admission_date=req.admission_date,
        class_id=req.class_id,
        section_id=req.section_id,
        blood_group=req.blood_group
    )
    db.add(student)
    db.flush()
    
    # --- Auto-create default fees from fee_structures ---
    fee_structures = db.query(FeeStructure).filter(
        FeeStructure.class_id == req.class_id, FeeStructure.is_active == True
    ).all()
    for fs in fee_structures:
        due = date(date.today().year, date.today().month, fs.due_day)
        fee = Fee(
            student_id=student.id,
            fee_type=fs.fee_type,
            amount=fs.amount,
            paid_amount=0,
            due_date=due,
            status='PENDING',
            created_at=datetime.utcnow()
        )
        db.add(fee)
    
    # --- Notify class teacher ---
    class_teacher = db.query(Teacher).filter(
        Teacher.class_teacher_of == req.class_id, Teacher.is_active == True
    ).first()
    if class_teacher and class_teacher.user_id:
        notif = Notification(
            user_id=class_teacher.user_id,
            title="New Student Added",
            message=f"New student {req.first_name} {req.last_name} ({student_id}) has been added to {cl.name}.",
            notification_type="student",
            created_at=datetime.utcnow()
        )
        db.add(notif)
    
    db.commit()
    db.refresh(student)
    
    return StudentOut.model_validate(student)

@router.put("/my-profile")
def update_my_profile(req: StudentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can update their own profile")

    allowed_fields = {"first_name", "last_name", "address", "city", "state", "phone", "email", "blood_group"}
    for key, value in req.model_dump(exclude_unset=True).items():
        if key in allowed_fields:
            setattr(student, key, value)

    student.updated_at = date.today()
    db.commit()
    db.refresh(student)
    data = {c.name: getattr(student, c.name) for c in student.__table__.columns if hasattr(StudentOut, c.name) or c.name in ('class_id', 'section_id')}
    if student.class_id:
        cls = db.query(Class).filter(Class.id == student.class_id).first()
        data["class_name"] = cls.name if cls else None
    if student.section_id:
        sec = db.query(Section).filter(Section.id == student.section_id).first()
        data["section_name"] = sec.name if sec else None
    return data

@router.put("/{student_id:int}", response_model=StudentOut)
def update_student(student_id: int, req: StudentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(student, key, value)
    
    student.updated_at = date.today()
    db.commit()
    db.refresh(student)
    return StudentOut.model_validate(student)

@router.delete("/{student_id:int}")
def delete_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.is_active = False
    if student.user_id:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            user.is_active = False
    db.commit()
    return {"message": "Student deactivated"}

@router.post("/my-profile/photo")
async def upload_my_photo(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can upload their own photo")

    MAX_SIZE = 5 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    filename = f"{student.id}_{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    student.photo = f"/uploads/students/{filename}"
    db.commit()
    return {"photo_url": student.photo}

@router.post("/{student_id:int}/photo")
async def upload_photo(student_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    MAX_SIZE = 5 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    filename = f"{student_id}_{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    student.photo = f"/uploads/students/{filename}"
    db.commit()
    return {"photo_url": student.photo}

@router.get("/{student_id:int}/transfer-certificate")
def get_transfer_certificate(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"transfer_certificate": student.transfer_certificate or "Not generated"}

@router.post("/{student_id:int}/create-login")
def create_student_login(student_id: int, req: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.user_id:
        raise HTTPException(status_code=400, detail="Student already has a login")
    
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
        full_name=f"{student.first_name} {student.last_name}",
        password_hash=hash_password(password),
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(user)
    db.flush()
    
    student.user_id = user.id
    db.commit()
    
    return {"username": username, "password": password}

@router.put("/{student_id:int}/update-login")
def update_student_login(student_id: int, req: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not student.user_id:
        raise HTTPException(status_code=400, detail="Student has no login yet. Use create-login first.")
    
    user = db.query(User).filter(User.id == student.user_id).first()
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

@router.get("/export/csv")
def export_students_csv(
    class_id: Optional[int] = None, section_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = db.query(Student)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    if section_id:
        query = query.filter(Student.section_id == section_id)
    students = query.order_by(Student.class_id, Student.first_name).all()
    
    import csv, io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Student Code", "First Name", "Last Name", "Class", "Section", "Gender", "Phone", "Email", "Status"])
    for s in students:
        cls = db.query(Class).filter(Class.id == s.class_id).first()
        sec = db.query(Section).filter(Section.id == s.section_id).first()
        writer.writerow([
            s.id, s.student_id, s.first_name, s.last_name,
            cls.name if cls else "", sec.name if sec else "",
            s.gender, s.phone or "", s.email or "",
            "Active" if s.is_active else "Inactive"
        ])
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students.csv"}
    )
