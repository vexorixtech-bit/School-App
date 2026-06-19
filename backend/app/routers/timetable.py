from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.database import get_db
from app.models.models import User, UserRole, Timetable, Class, Section, Subject, Teacher
from app.schemas.schemas import TimetableCreate, TimetableOut
from app.auth.auth_handler import get_current_user

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])

def _get_teacher_class_id(db: Session, current_user: User) -> int | None:
    if current_user.role != UserRole.TEACHER:
        return None
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    return teacher.class_teacher_of if teacher else None

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

@router.get("/", response_model=dict)
def get_timetable(
    class_id: Optional[int] = None, section_id: Optional[int] = None,
    teacher_id: Optional[int] = None, day: Optional[int] = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = db.query(Timetable)

    teacher_class_id = _get_teacher_class_id(db, current_user)
    if teacher_class_id is not None:
        query = query.filter(Timetable.class_id == teacher_class_id)
    elif class_id:
        query = query.filter(Timetable.class_id == class_id)
    if section_id:
        query = query.filter(Timetable.section_id == section_id)
    if teacher_id:
        query = query.filter(Timetable.teacher_id == teacher_id)
    if day is not None:
        query = query.filter(Timetable.day_of_week == day)
    
    entries = query.order_by(Timetable.day_of_week, Timetable.start_time).all()
    
    result = []
    for entry in entries:
        subject = db.query(Subject).filter(Subject.id == entry.subject_id).first()
        teacher = db.query(Teacher).filter(Teacher.id == entry.teacher_id).first()
        section = db.query(Section).filter(Section.id == entry.section_id).first()
        cls = db.query(Class).filter(Class.id == entry.class_id).first()
        
        result.append({
            "id": entry.id,
            "class": cls.name if cls else None,
            "section": section.name if section else None,
            "subject": subject.name if subject else None,
            "teacher": f"{teacher.first_name} {teacher.last_name}" if teacher else None,
            "day": DAYS[entry.day_of_week] if entry.day_of_week < len(DAYS) else "Unknown",
            "day_of_week": entry.day_of_week,
            "start_time": entry.start_time,
            "end_time": entry.end_time,
            "room": entry.room
        })
    
    return {"entries": result}

@router.post("/", response_model=TimetableOut)
def create_timetable_entry(req: TimetableCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Teachers cannot add timetable entries")

    # Check for time conflict
    conflict = db.query(Timetable).filter(
        Timetable.day_of_week == req.day_of_week,
        Timetable.section_id == req.section_id,
        ((Timetable.start_time <= req.start_time) & (Timetable.end_time > req.start_time)) |
        ((Timetable.start_time < req.end_time) & (Timetable.end_time >= req.end_time))
    ).first()
    
    if conflict:
        raise HTTPException(status_code=400, detail="Time slot conflict for this section")
    
    entry = Timetable(
        class_id=req.class_id, section_id=req.section_id,
        subject_id=req.subject_id, teacher_id=req.teacher_id,
        day_of_week=req.day_of_week, start_time=req.start_time,
        end_time=req.end_time, room=req.room
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return TimetableOut.model_validate(entry)

@router.put("/{entry_id}", response_model=TimetableOut)
def update_timetable_entry(entry_id: int, req: TimetableCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = db.query(Timetable).filter(Timetable.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    if current_user.role == UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Teachers cannot edit timetable entries")

    for key, value in req.model_dump().items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return TimetableOut.model_validate(entry)

@router.delete("/{entry_id}")
def delete_timetable_entry(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = db.query(Timetable).filter(Timetable.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    if current_user.role == UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Teachers cannot delete timetable entries")

    db.delete(entry)
    db.commit()
    return {"message": "Timetable entry deleted"}

@router.get("/teacher/{teacher_id}")
def get_teacher_timetable(teacher_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entries = db.query(Timetable).filter(Timetable.teacher_id == teacher_id).order_by(Timetable.day_of_week, Timetable.start_time).all()
    
    weekly = {day: [] for day in DAYS}
    for entry in entries:
        subject = db.query(Subject).filter(Subject.id == entry.subject_id).first()
        cls = db.query(Class).filter(Class.id == entry.class_id).first()
        section = db.query(Section).filter(Section.id == entry.section_id).first()
        
        weekly[DAYS[entry.day_of_week]].append({
            "id": entry.id,
            "subject": subject.name if subject else None,
            "class": cls.name if cls else None,
            "section": section.name if section else None,
            "start_time": entry.start_time,
            "end_time": entry.end_time,
            "room": entry.room
        })
    
    return weekly
