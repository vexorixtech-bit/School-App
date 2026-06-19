import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.auth_handler import get_current_user
from app.models.models import User, UserRole, Teacher, Student, Event, Class as ClassModel
from app.schemas.schemas import EventCreate, EventOut

router = APIRouter(prefix="/api/events", tags=["Events"])

UPLOAD_DIR = "uploads/events"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=dict)
def list_events(
    year: int = None, month: int = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role in (UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT):
        if current_user.role == UserRole.STUDENT:
            student = db.query(Student).filter(Student.user_id == current_user.id).first()
            if not student:
                raise HTTPException(status_code=404, detail="Student profile not found")
            class_id = student.class_id
        elif current_user.role == UserRole.TEACHER:
            teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
            if not teacher:
                raise HTTPException(status_code=404, detail="Teacher profile not found")
            cls = db.query(ClassModel).filter(ClassModel.class_teacher_id == teacher.id).first()
            class_id = cls.id if cls else None
        else:
            class_id = None

        query = db.query(Event)
        if class_id:
            query = query.filter(Event.class_id == class_id)
    else:
        query = db.query(Event)

    if year and month:
        from sqlalchemy import extract
        query = query.filter(
            extract("year", Event.event_date) == year,
            extract("month", Event.event_date) == month
        )

    events = query.order_by(Event.event_date.asc()).all()

    result = []
    for e in events:
        d = EventOut.model_validate(e).model_dump()
        creator = db.query(User).filter(User.id == e.created_by).first()
        d["teacher_name"] = creator.full_name if creator else None
        cls = db.query(ClassModel).filter(ClassModel.id == e.class_id).first()
        d["class_name"] = cls.name if cls else None
        result.append(d)

    return {"events": result, "total": len(result)}


@router.post("/", response_model=EventOut)
def create_event(
    title: str, event_date: str, class_id: int, description: str = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.TEACHER and current_user.role not in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only teachers can create events")

    if current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher profile not found")
        cls = db.query(ClassModel).filter(ClassModel.class_teacher_id == teacher.id, ClassModel.id == class_id).first()
        if not cls:
            raise HTTPException(status_code=403, detail="You can only create events for your own class")

    from datetime import date
    try:
        parts = event_date.split("-")
        parsed_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    event = Event(
        class_id=class_id, created_by=current_user.id,
        title=title, description=description,
        event_date=parsed_date
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    d = EventOut.model_validate(event).model_dump()
    d["teacher_name"] = current_user.full_name
    cls = db.query(ClassModel).filter(ClassModel.id == event.class_id).first()
    d["class_name"] = cls.name if cls else None
    return d


@router.post("/{event_id}/poster")
async def upload_poster(
    event_id: int, file: UploadFile = File(...),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"event_{event_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    event.poster_image = f"/uploads/events/{filename}"
    db.commit()
    return {"poster_image": event.poster_image}


@router.delete("/{event_id}")
def delete_event(
    event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher or event.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete your own events")

    if event.poster_image:
        path = event.poster_image.lstrip("/")
        if os.path.exists(path):
            os.remove(path)

    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}
