from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date, datetime, timedelta
from app.database import get_db
from app.models.models import User, UserRole, Student, Teacher, Class, Section, Subject, Attendance, Fee, Exam, Result, FeeStructure
from app.schemas.schemas import DashboardStats, AttendanceChart, FeeChart
from app.auth.auth_handler import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_students = db.query(Student).filter(Student.is_active == True).count()
    total_teachers = db.query(Teacher).filter(Teacher.is_active == True).count()
    total_classes = db.query(Class).filter(Class.is_active == True).count()
    
    today = date.today()
    start_of_month = today.replace(day=1)
    
    total_attendance = db.query(Attendance).filter(Attendance.date >= start_of_month).count()
    present_attendance = db.query(Attendance).filter(
        Attendance.date >= start_of_month,
        Attendance.status == "present"
    ).count()
    attendance_percentage = round((present_attendance / total_attendance * 100), 2) if total_attendance > 0 else 0.0
    
    total_fees = db.query(func.sum(Fee.amount)).filter(Fee.status == "paid").scalar() or 0
    pending_fees = db.query(func.sum(Fee.amount - Fee.paid_amount)).filter(Fee.status != "paid").scalar() or 0
    
    upcoming_exams = db.query(Exam).filter(Exam.start_date >= today, Exam.is_active == True).count()
    
    return DashboardStats(
        total_students=total_students,
        total_teachers=total_teachers,
        total_classes=total_classes,
        attendance_percentage=attendance_percentage,
        total_fees_collected=float(total_fees),
        pending_fees=float(pending_fees),
        upcoming_exams=upcoming_exams
    )

@router.get("/attendance-chart", response_model=AttendanceChart)
def get_attendance_chart(days: int = 30, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    labels = []
    data = []
    today = date.today()
    
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        total = db.query(Attendance).filter(Attendance.date == day).count()
        present = db.query(Attendance).filter(Attendance.date == day, Attendance.status == "present").count()
        percentage = round((present / total * 100), 2) if total > 0 else 0
        labels.append(day.strftime("%d %b"))
        data.append(percentage)
    
    return AttendanceChart(labels=labels, data=data)

@router.get("/fee-chart")
def get_fee_chart(year: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not year:
        year = date.today().year
    
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    collected = []
    pending = []
    
    for month in range(1, 13):
        col = db.query(func.coalesce(func.sum(Fee.paid_amount), 0)).filter(
            func.extract('year', Fee.due_date) == year,
            func.extract('month', Fee.due_date) == month,
            Fee.status == "paid"
        ).scalar() or 0
        
        pen = db.query(func.coalesce(func.sum(Fee.amount - Fee.paid_amount), 0)).filter(
            func.extract('year', Fee.due_date) == year,
            func.extract('month', Fee.due_date) == month,
            Fee.status != "paid"
        ).scalar() or 0
        
        collected.append(round(float(col), 2))
        pending.append(round(float(pen), 2))
    
    return {"labels": months, "collected": collected, "pending": pending}

@router.get("/admission-growth")
def get_admission_growth(years: int = 5, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_year = date.today().year
    labels = []
    data = []
    
    for y in range(current_year - years + 1, current_year + 1):
        count = db.query(Student).filter(
            func.extract('year', Student.admission_date) == y
        ).count()
        labels.append(str(y))
        data.append(count)
    
    return {"labels": labels, "data": data}

@router.get("/teacher-stats")
def get_teacher_stats(class_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    student_count = db.query(Student).filter(Student.class_id == class_id, Student.is_active == True).count()
    
    today = date.today()
    start_of_month = today.replace(day=1)
    total_att = db.query(Attendance).filter(Attendance.class_id == class_id, Attendance.date >= start_of_month).count()
    present_att = db.query(Attendance).filter(Attendance.class_id == class_id, Attendance.date >= start_of_month, Attendance.status == "present").count()
    attendance_percentage = round((present_att / total_att * 100), 2) if total_att > 0 else 0.0
    
    pending_fees_students = []
    pending_total = 0.0
    student_dues = db.query(
        Fee.student_id,
        func.sum(Fee.amount - Fee.paid_amount).label("total_due")
    ).join(Student).filter(
        Student.class_id == class_id, Fee.status != "paid"
    ).group_by(Fee.student_id).limit(50).all()
    
    for sid, due in student_dues:
        student = db.query(Student).filter(Student.id == sid).first()
        if student:
            pending_fees_students.append({
                "student_id": student.id,
                "student_name": f"{student.first_name} {student.last_name}",
                "amount": float(due)
            })
            pending_total += float(due)
    
    upcoming_exams = db.query(Exam).filter(Exam.class_id == class_id, Exam.start_date >= today, Exam.is_active == True).all()
    exams_list = [{"id": e.id, "name": e.name, "exam_type": e.exam_type.value, "start_date": e.start_date.isoformat(), "end_date": e.end_date.isoformat()} for e in upcoming_exams]
    
    return {
        "class_name": cls.name,
        "student_count": student_count,
        "attendance_percentage": attendance_percentage,
        "pending_fees_total": round(pending_total, 2),
        "pending_fees_students": pending_fees_students,
        "upcoming_exams": exams_list
    }

@router.get("/class-performance")
def get_class_performance(exam_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    classes = db.query(Class).filter(Class.is_active == True).all()
    labels = []
    data = []
    
    for cls in classes:
        avg_marks = db.query(func.avg(Result.marks_obtained)).join(
            Student, Result.student_id == Student.id
        ).filter(
            Student.class_id == cls.id,
            Result.exam_id == exam_id if exam_id else True
        ).scalar() or 0
        
        labels.append(cls.name)
        data.append(round(float(avg_marks), 2))
    
    return {"labels": labels, "data": data}

@router.get("/recent-activities")
def get_recent_activities(limit: int = 10, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    activities = []
    
    recent_students = db.query(Student).order_by(Student.created_at.desc()).limit(5).all()
    for s in recent_students:
        activities.append({
            "type": "student_added",
            "message": f"New student {s.first_name} {s.last_name} admitted",
            "timestamp": s.created_at.isoformat()
        })
    
    recent_fees = db.query(Fee).filter(Fee.status == "paid").order_by(Fee.paid_date.desc()).limit(5).all()
    for f in recent_fees:
        activities.append({
            "type": "fee_paid",
            "message": f"Fee payment of ₹{f.amount} received",
            "timestamp": (f.paid_date or datetime.now()).isoformat()
        })
    
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:limit]
