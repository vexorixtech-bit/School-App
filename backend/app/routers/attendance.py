from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime
from app.database import get_db
from app.models.models import User, UserRole, Attendance, AttendanceStatus, Student, Class, TeacherAttendance
from app.schemas.schemas import AttendanceCreate, BulkAttendanceCreate, AttendanceOut
from app.auth.auth_handler import get_current_user

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

@router.post("/", response_model=AttendanceOut)
def mark_attendance(req: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Attendance).filter(
        Attendance.student_id == req.student_id,
        Attendance.date == req.date
    ).first()
    if existing:
        existing.status = AttendanceStatus(req.status)
        existing.remarks = req.remarks
        existing.marked_by = current_user.id
        db.commit()
        db.refresh(existing)
        return AttendanceOut.model_validate(existing)
    
    record = Attendance(
        student_id=req.student_id,
        class_id=req.class_id,
        date=req.date,
        status=AttendanceStatus(req.status),
        remarks=req.remarks,
        marked_by=current_user.id
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return AttendanceOut.model_validate(record)

@router.post("/bulk")
def mark_bulk_attendance(req: BulkAttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = 0
    for rec in req.records:
        existing = db.query(Attendance).filter(
            Attendance.student_id == rec.student_id,
            Attendance.date == rec.date
        ).first()
        if existing:
            existing.status = AttendanceStatus(rec.status)
            existing.remarks = rec.remarks
        else:
            record = Attendance(
                student_id=rec.student_id,
                class_id=req.class_id,
                date=rec.date,
                status=AttendanceStatus(rec.status),
                remarks=rec.remarks,
                marked_by=current_user.id
            )
            db.add(record)
        count += 1
    db.commit()
    return {"message": f"Attendance marked for {count} students", "count": count}

@router.get("/", response_model=dict)
def get_attendance(
    class_id: Optional[int] = None, section_id: Optional[int] = None,
    student_id: Optional[int] = None, date_from: Optional[str] = None,
    date_to: Optional[str] = None, month: Optional[int] = None,
    year: Optional[int] = None, page: int = 1, per_page: int = 50,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = db.query(Attendance)
    
    if class_id:
        query = query.filter(Attendance.class_id == class_id)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if date_from:
        query = query.filter(Attendance.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Attendance.date <= date.fromisoformat(date_to))
    if month:
        query = query.filter(func.extract('month', Attendance.date) == month)
    if year:
        query = query.filter(func.extract('year', Attendance.date) == year)
    
    total = query.count()
    records = query.order_by(Attendance.date.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "records": [AttendanceOut.model_validate(r) for r in records],
        "total": total,
        "page": page,
        "per_page": per_page
    }

@router.get("/summary")
def get_attendance_summary(
    class_id: Optional[int] = None, section_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if not year:
        year = date.today().year
    if not month:
        month = date.today().month
    
    if not class_id:
        query = db.query(Attendance).filter(
            func.extract('year', Attendance.date) == year,
            func.extract('month', Attendance.date) == month
        )
        total = query.count()
        present = query.filter(Attendance.status == "present").count()
        absent = query.filter(Attendance.status == "absent").count()
        late = query.filter(Attendance.status == "late").count()
        return [{
            "student_id": 0, "student_name": "All Classes",
            "present": present, "absent": absent, "late": late,
            "total": total,
            "percentage": round((present / total * 100), 2) if total > 0 else 0
        }]
    
    students = db.query(Student).filter(Student.class_id == class_id, Student.is_active == True)
    if section_id:
        students = students.filter(Student.section_id == section_id)
    students = students.all()
    result = []
    for s in students:
        q = db.query(Attendance).filter(
            Attendance.student_id == s.id,
            func.extract('year', Attendance.date) == year,
            func.extract('month', Attendance.date) == month
        )
        total = q.count()
        present = q.filter(Attendance.status == "present").count()
        absent = q.filter(Attendance.status == "absent").count()
        late = q.filter(Attendance.status == "late").count()
        result.append({
            "student_id": s.id,
            "student_name": f"{s.first_name} {s.last_name}",
            "present": present, "absent": absent, "late": late,
            "total": total,
            "percentage": round((present / total * 100), 2) if total > 0 else 0
        })
    return result

@router.get("/student/{student_id}")
def get_student_attendance(student_id: int, month: Optional[int] = None, year: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not year:
        year = date.today().year
    if not month:
        month = date.today().month
    
    records = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        func.extract('year', Attendance.date) == year,
        func.extract('month', Attendance.date) == month
    ).order_by(Attendance.date).all()
    
    total = len(records)
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    late = sum(1 for r in records if r.status == "late")
    
    return {
        "student_id": student_id,
        "month": month,
        "year": year,
        "total": total,
        "present": present,
        "absent": absent,
        "late": late,
        "percentage": round((present / total * 100), 2) if total > 0 else 0,
        "records": [AttendanceOut.model_validate(r) for r in records]
    }

# --- Teacher Attendance ---
@router.post("/teacher")
def mark_teacher_attendance(
    teacher_id: int, status: str, date_val: str = None,
    check_in: str = None, check_out: str = None, remarks: str = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    att_date = date.fromisoformat(date_val) if date_val else date.today()
    record = TeacherAttendance(
        teacher_id=teacher_id,
        date=att_date,
        status=AttendanceStatus(status),
        check_in=datetime.fromisoformat(check_in) if check_in else None,
        check_out=datetime.fromisoformat(check_out) if check_out else None,
        remarks=remarks
    )
    db.add(record)
    db.commit()
    return {"message": "Teacher attendance marked"}

@router.get("/analytics")
def get_attendance_analytics(
    class_id: Optional[int] = None, year: Optional[int] = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if not year:
        year = date.today().year
    
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = []
    
    for month in range(1, 13):
        query = db.query(Attendance).filter(
            func.extract('year', Attendance.date) == year,
            func.extract('month', Attendance.date) == month
        )
        if class_id:
            query = query.filter(Attendance.class_id == class_id)
        
        total = query.count()
        present = query.filter(Attendance.status == "present").count()
        percentage = round((present / total * 100), 2) if total > 0 else 0
        monthly_data.append({"month": months[month - 1], "percentage": percentage, "total": total, "present": present})
    
    return monthly_data
