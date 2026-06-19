from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.models import User, UserRole, Class, Section, Subject, SubjectTeacher, Teacher
from app.schemas.schemas import ClassCreate, ClassOut, SectionCreate, SectionOut, SubjectCreate, SubjectOut, SubjectAssign
from app.auth.auth_handler import get_current_user

router = APIRouter(prefix="/api/classes", tags=["Classes & Subjects"])

# --- Classes ---
@router.get("/", response_model=list[ClassOut])
def get_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [ClassOut.model_validate(c) for c in db.query(Class).filter(Class.is_active == True).all()]

@router.post("/", response_model=ClassOut)
def create_class(req: ClassCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(Class).filter(Class.code == req.code).first():
        raise HTTPException(status_code=400, detail="Class code already exists")
    cls = Class(name=req.name, code=req.code, description=req.description)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return ClassOut.model_validate(cls)

@router.put("/{class_id}", response_model=ClassOut)
def update_class(class_id: int, req: ClassCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    cls.name = req.name
    cls.code = req.code
    cls.description = req.description
    cls.class_teacher_id = req.class_teacher_id
    db.commit()
    db.refresh(cls)
    return ClassOut.model_validate(cls)

@router.delete("/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    cls.is_active = False
    db.commit()
    return {"message": "Class deactivated"}

# --- Sections ---
@router.get("/sections", response_model=list[SectionOut])
def get_sections(class_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Section)
    if class_id:
        query = query.filter(Section.class_id == class_id)
    result = []
    for s in query.all():
        out = SectionOut.model_validate(s)
        cls = db.query(Class).filter(Class.id == s.class_id).first()
        out.class_name = cls.name if cls else None
        result.append(out)
    return result

@router.post("/sections", response_model=SectionOut)
def create_section(req: SectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    section = Section(name=req.name, class_id=req.class_id, capacity=req.capacity)
    db.add(section)
    db.commit()
    db.refresh(section)
    return SectionOut.model_validate(section)

@router.delete("/sections/{section_id}")
def delete_section(section_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()
    return {"message": "Section deleted"}

# --- Subjects ---
@router.get("/subjects", response_model=list[SubjectOut])
def get_subjects(class_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Subject)
    if class_id:
        query = query.filter(Subject.class_id == class_id)
    result = []
    for s in query.filter(Subject.is_active == True).all():
        out = SubjectOut.model_validate(s)
        cls = db.query(Class).filter(Class.id == s.class_id).first()
        out.class_name = cls.name if cls else None
        result.append(out)
    return result

@router.post("/subjects", response_model=SubjectOut)
def create_subject(req: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(Subject).filter(Subject.code == req.code).first():
        raise HTTPException(status_code=400, detail="Subject code already exists")
    subject = Subject(
        name=req.name, code=req.code, class_id=req.class_id,
        is_lab=req.is_lab, max_marks=req.max_marks, pass_marks=req.pass_marks
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return SubjectOut.model_validate(subject)

@router.put("/subjects/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, req: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    for key, value in req.model_dump().items():
        setattr(subject, key, value)
    db.commit()
    db.refresh(subject)
    return SubjectOut.model_validate(subject)

@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject.is_active = False
    db.commit()
    return {"message": "Subject deactivated"}

# --- Subject-Teacher Assignment ---
@router.post("/assign-subject")
def assign_subject_to_teacher(req: SubjectAssign, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(SubjectTeacher).filter(
        SubjectTeacher.subject_id == req.subject_id,
        SubjectTeacher.teacher_id == req.teacher_id,
        SubjectTeacher.class_id == req.class_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    
    assign = SubjectTeacher(subject_id=req.subject_id, teacher_id=req.teacher_id, class_id=req.class_id)
    db.add(assign)
    db.commit()
    return {"message": "Subject assigned successfully"}

@router.delete("/assignments/{assign_id}")
def delete_assignment(assign_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assign = db.query(SubjectTeacher).filter(SubjectTeacher.id == assign_id).first()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assign)
    db.commit()
    return {"message": "Assignment deleted"}

@router.get("/assignments")
def get_assignments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assignments = db.query(SubjectTeacher).all()
    result = []
    for a in assignments:
        subject = db.query(Subject).filter(Subject.id == a.subject_id).first()
        teacher = db.query(Teacher).filter(Teacher.id == a.teacher_id).first()
        cls = db.query(Class).filter(Class.id == a.class_id).first()
        result.append({
            "id": a.id,
            "subject_name": subject.name if subject else None,
            "teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else None,
            "class_name": cls.name if cls else None,
            "section_name": None
        })
    return result
