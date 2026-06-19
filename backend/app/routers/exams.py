from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime
from app.database import get_db
from app.models.models import User, UserRole, Exam, ExamType, ExamSubject, Subject, Result, Student, Class, Parent, Teacher
from app.schemas.schemas import ExamCreate, ExamOut, ExamSubjectCreate, ResultCreate, ResultOut, BatchResultCreate
from app.auth.auth_handler import get_current_user
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from io import BytesIO
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/exams", tags=["Exams & Results"])

# --- Exams ---
@router.get("/", response_model=dict)
def get_exams(
    class_id: Optional[int] = None, exam_type: Optional[str] = None,
    upcoming: bool = False, page: int = 1, per_page: int = 20,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = db.query(Exam)
    if class_id:
        query = query.filter(Exam.class_id == class_id)
    if exam_type:
        query = query.filter(Exam.exam_type == exam_type)
    if upcoming:
        query = query.filter(Exam.start_date >= date.today())
    
    total = query.count()
    exams = query.order_by(Exam.start_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "exams": [ExamOut.model_validate(e) for e in exams],
        "total": total,
        "page": page,
        "per_page": per_page
    }

@router.get("/my-results")
def get_my_results(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        return get_student_results_data(student.id, db)
    elif current_user.role == UserRole.PARENT:
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent profile not found")
        children = db.query(Student).filter(Student.parent_id == parent.id).all()
        all_results = {}
        for child in children:
            all_results[str(child.id)] = {
                "student_name": f"{child.first_name} {child.last_name}",
                "results": get_student_results_data(child.id, db)
            }
        return all_results
    raise HTTPException(status_code=403, detail="Only students and parents can access their results")

def get_student_results_data(student_id: int, db: Session):
    results = db.query(Result).filter(Result.student_id == student_id).all()
    data = {}
    for r in results:
        exam = db.query(Exam).filter(Exam.id == r.exam_id).first()
        subject = db.query(Subject).filter(Subject.id == r.subject_id).first()
        exam_name = exam.name if exam else "Unknown"
        if exam_name not in data:
            data[exam_name] = {"exam_id": r.exam_id, "subjects": []}
        data[exam_name]["subjects"].append({
            "subject": subject.name if subject else None,
            "marks": r.marks_obtained,
            "max_marks": r.max_marks,
            "grade": r.grade
        })
    return data

@router.get("/{exam_id}", response_model=ExamOut)
def get_exam(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ExamOut.model_validate(exam)

@router.post("/", response_model=ExamOut)
def create_exam(req: ExamCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher profile not found")
        cls = db.query(Class).filter(Class.id == req.class_id, Class.class_teacher_id == teacher.id).first()
        if not cls:
            raise HTTPException(status_code=403, detail="You can only create exams for your own class")
    elif current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and teachers can create exams")
    exam = Exam(
        name=req.name,
        exam_type=ExamType(req.exam_type),
        class_id=req.class_id,
        start_date=req.start_date,
        end_date=req.end_date,
        description=req.description
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return ExamOut.model_validate(exam)

@router.put("/{exam_id}", response_model=ExamOut)
def update_exam(exam_id: int, req: ExamCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher profile not found")
        cls = db.query(Class).filter(Class.id == exam.class_id, Class.class_teacher_id == teacher.id).first()
        if not cls:
            raise HTTPException(status_code=403, detail="You can only edit exams for your own class")
    for key, value in req.model_dump().items():
        setattr(exam, key, value)
    db.commit()
    db.refresh(exam)
    return ExamOut.model_validate(exam)

@router.delete("/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher profile not found")
        cls = db.query(Class).filter(Class.id == exam.class_id, Class.class_teacher_id == teacher.id).first()
        if not cls:
            raise HTTPException(status_code=403, detail="You can only delete exams for your own class")
    exam.is_active = False
    db.commit()
    return {"message": "Exam deleted"}

# --- Exam Subjects ---
@router.post("/subjects")
def add_exam_subject(req: ExamSubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam_subject = ExamSubject(
        exam_id=req.exam_id, subject_id=req.subject_id,
        exam_date=req.exam_date, start_time=req.start_time,
        end_time=req.end_time, max_marks=req.max_marks, pass_marks=req.pass_marks
    )
    db.add(exam_subject)
    db.commit()
    return {"message": "Subject added to exam"}

@router.delete("/subjects/{subject_id}")
def remove_exam_subject(subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam_subject = db.query(ExamSubject).filter(ExamSubject.id == subject_id).first()
    if not exam_subject:
        raise HTTPException(status_code=404, detail="Exam subject not found")
    db.delete(exam_subject)
    db.commit()
    return {"message": "Subject removed from exam"}

@router.get("/{exam_id}/subjects")
def get_exam_subjects(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subjects = db.query(ExamSubject).filter(ExamSubject.exam_id == exam_id).all()
    result = []
    for es in subjects:
        subject = db.query(Subject).filter(Subject.id == es.subject_id).first()
        result.append({
            "id": es.id,
            "subject_id": es.subject_id,
            "subject_name": subject.name if subject else None,
            "exam_date": es.exam_date,
            "start_time": es.start_time,
            "end_time": es.end_time,
            "max_marks": es.max_marks,
            "pass_marks": es.pass_marks
        })
    return result

# --- Results ---
@router.post("/results/batch")
def create_results_batch(req: BatchResultCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    created = []
    for item in req.results:
        exam_subject = db.query(ExamSubject).filter(ExamSubject.exam_id == req.exam_id, ExamSubject.subject_id == item.subject_id).first()
        max_marks = exam_subject.max_marks if exam_subject else 100
        pct = (item.marks_obtained / max_marks) * 100
        grade = "A+" if pct >= 90 else "A" if pct >= 80 else "B+" if pct >= 70 else "B" if pct >= 60 else "C" if pct >= 50 else "D" if pct >= 35 else "F"
        existing = db.query(Result).filter(Result.student_id == item.student_id, Result.exam_id == req.exam_id, Result.subject_id == item.subject_id).first()
        if existing:
            existing.marks_obtained = item.marks_obtained
            existing.grade = grade
        else:
            db.add(Result(student_id=item.student_id, exam_id=req.exam_id, subject_id=item.subject_id, marks_obtained=item.marks_obtained, max_marks=max_marks, grade=grade))
        created.append(item.student_id)
    db.commit()
    return {"message": f"{len(created)} results saved"}

@router.post("/results")
def create_result(req: ResultCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Calculate grade
    percentage = (req.marks_obtained / req.max_marks) * 100
    if percentage >= 90:
        grade = "A+"
    elif percentage >= 80:
        grade = "A"
    elif percentage >= 70:
        grade = "B+"
    elif percentage >= 60:
        grade = "B"
    elif percentage >= 50:
        grade = "C"
    elif percentage >= 35:
        grade = "D"
    else:
        grade = "F"
    
    result = Result(
        student_id=req.student_id, exam_id=req.exam_id,
        subject_id=req.subject_id, marks_obtained=req.marks_obtained,
        max_marks=req.max_marks, grade=grade, remarks=req.remarks
    )
    db.add(result)
    db.commit()
    return {"message": "Result created", "grade": grade}

@router.put("/results/{result_id}")
def update_result(result_id: int, req: ResultCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(result, key, value)
    
    # Recalculate grade
    percentage = (result.marks_obtained / result.max_marks) * 100
    if percentage >= 90: result.grade = "A+"
    elif percentage >= 80: result.grade = "A"
    elif percentage >= 70: result.grade = "B+"
    elif percentage >= 60: result.grade = "B"
    elif percentage >= 50: result.grade = "C"
    elif percentage >= 35: result.grade = "D"
    else: result.grade = "F"
    
    db.commit()
    return {"message": "Result updated", "grade": result.grade}

@router.get("/{exam_id}/results")
def get_exam_results(exam_id: int, class_id: Optional[int] = None, page: int = 1, per_page: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Result).filter(Result.exam_id == exam_id)
    if class_id:
        query = query.join(Student).filter(Student.class_id == class_id)
    
    total = query.count()
    results = query.offset((page - 1) * per_page).limit(per_page).all()
    data = []
    for r in results:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        subject = db.query(Subject).filter(Subject.id == r.subject_id).first()
        data.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else None,
            "subject_id": r.subject_id,
            "subject_name": subject.name if subject else None,
            "marks_obtained": r.marks_obtained,
            "max_marks": r.max_marks,
            "grade": r.grade,
            "remarks": r.remarks
        })
    return {
        "results": data,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@router.get("/student/{student_id}/results")
def get_student_results(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(Result).filter(Result.student_id == student_id).all()
    data = {}
    for r in results:
        exam = db.query(Exam).filter(Exam.id == r.exam_id).first()
        subject = db.query(Subject).filter(Subject.id == r.subject_id).first()
        exam_name = exam.name if exam else "Unknown"
        if exam_name not in data:
            data[exam_name] = {"exam_id": r.exam_id, "subjects": []}
        data[exam_name]["subjects"].append({
            "subject": subject.name if subject else None,
            "marks": r.marks_obtained,
            "max_marks": r.max_marks,
            "grade": r.grade
        })
    return data

@router.get("/{exam_id}/rankings")
def get_exam_rankings(exam_id: int, class_id: Optional[int] = None, page: int = 1, per_page: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    base = db.query(
        Result.student_id,
        func.sum(Result.marks_obtained).label("total_marks"),
        func.sum(Result.max_marks).label("total_max")
    ).filter(Result.exam_id == exam_id).group_by(Result.student_id)
    
    if class_id:
        base = base.join(Student).filter(Student.class_id == class_id)
    
    total_count = base.count()
    rankings = base.order_by(func.sum(Result.marks_obtained).desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    result = []
    for rank, (student_id, tmarks, tmax) in enumerate(rankings, 1):
        student = db.query(Student).filter(Student.id == student_id).first()
        percentage = round((tmarks / tmax * 100), 2) if tmax else 0
        result.append({
            "rank": rank,
            "student_id": student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else None,
            "total_marks": float(tmarks),
            "total_max": float(tmax),
            "percentage": percentage
        })
    return {
        "rankings": result,
        "total": total_count,
        "page": page,
        "per_page": per_page,
        "total_pages": (total_count + per_page - 1) // per_page
    }

@router.get("/{exam_id}/report-card/{student_id}")
def generate_report_card(exam_id: int, student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    student = db.query(Student).filter(Student.id == student_id).first()
    results = db.query(Result).filter(Result.exam_id == exam_id, Result.student_id == student_id).all()
    
    if not exam or not student:
        raise HTTPException(status_code=404, detail="Exam or Student not found")
    
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width/2, height - 50, "SCHOOL ERP")
    c.setFont("Helvetica", 16)
    c.drawCentredString(width/2, height - 75, "Report Card")
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, height - 95, exam.name)
    
    # Student Info
    y = height - 140
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"Student: {student.first_name} {student.last_name}")
    c.drawString(350, y, f"ID: {student.student_id}")
    y -= 20
    c.drawString(50, y, f"Class: {db.query(Class).filter(Class.id == student.class_id).first().name if student.class_id else 'N/A'}")
    
    # Marks Table
    y -= 40
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.Color(0.2, 0.2, 0.2))
    c.drawString(50, y, "Subject")
    c.drawString(250, y, "Marks")
    c.drawString(330, y, "Max Marks")
    c.drawString(430, y, "Grade")
    c.setStrokeColor(colors.Color(0.5, 0.5, 0.5))
    c.line(50, y - 5, 550, y - 5)
    
    y -= 25
    c.setFont("Helvetica", 11)
    grand_total = 0
    grand_max = 0
    
    for r in results:
        subject = db.query(Subject).filter(Subject.id == r.subject_id).first()
        if subject:
            c.drawString(50, y, subject.name)
            c.drawString(250, y, str(r.marks_obtained))
            c.drawString(330, y, str(r.max_marks))
            c.drawString(430, y, r.grade or "N/A")
            grand_total += r.marks_obtained
            grand_max += r.max_marks
            y -= 20
    
    c.line(50, y, 550, y)
    y -= 20
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, f"Grand Total: {grand_total}/{grand_max}")
    
    if grand_max > 0:
        percentage = (grand_total / grand_max) * 100
        c.drawString(300, y, f"Percentage: {percentage:.2f}%")
        
        y -= 30
        if percentage >= 35:
            c.setFillColor(colors.Color(0, 0.5, 0))
            c.drawString(50, y, "RESULT: PASSED")
        else:
            c.setFillColor(colors.Color(0.8, 0, 0))
            c.drawString(50, y, "RESULT: FAILED")
    
    c.setFillColor(colors.Color(0.4, 0.4, 0.4))
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, 50, "This is a computer-generated report card")
    
    c.save()
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=report_card_{student.student_id}_{exam_id}.pdf"})
