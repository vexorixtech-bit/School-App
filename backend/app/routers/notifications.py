from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models.models import User, UserRole, Notification
from app.schemas.schemas import NotificationCreate, BulkNotificationCreate, SendToTeacherCreate, HomeworkCreate, NotificationOut
from app.auth.auth_handler import get_current_user
from app.websocket_manager import manager
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/", response_model=dict)
def get_notifications(
    unread_only: bool = False, page: int = 1, per_page: int = 20,
    box: str = "inbox",
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if box == "sent":
        notifications = db.query(Notification).filter(
            Notification.sender_id == current_user.id
        ).order_by(Notification.created_at.desc()).all()
        
        seen = set()
        unique = []
        for n in notifications:
            key = (n.title, n.message)
            if key not in seen:
                seen.add(key)
                unique.append(n)
        
        total = len(unique)
        offset = (page - 1) * per_page
        page_items = unique[offset:offset + per_page]
    else:
        query = db.query(Notification).filter(Notification.user_id == current_user.id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        total = query.count()
        page_items = query.order_by(Notification.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    result = []
    for n in page_items:
        d = NotificationOut.model_validate(n).model_dump()
        if n.sender_id:
            sender = db.query(User).filter(User.id == n.sender_id).first()
            d["sender_name"] = sender.full_name if sender else None
        result.append(d)
    
    unread_count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    
    import math
    return {
        "notifications": result,
        "total": total,
        "total_pages": math.ceil(total / per_page) if total > 0 else 1,
        "unread": unread_count
    }

@router.post("/", response_model=NotificationOut)
async def create_notification(req: NotificationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = Notification(
        user_id=req.user_id, title=req.title, message=req.message,
        notification_type=req.notification_type,
        sender_id=current_user.id
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    
    await manager.send_to_user(req.user_id, {
        "type": "notification",
        "title": notif.title,
        "message": notif.message,
        "notification_type": notif.notification_type,
        "created_at": notif.created_at.isoformat(),
        "id": notif.id
    })
    
    # Send via email if requested
    if req.send_email:
        send_email_notification(req.user_id, req.title, req.message, db)
        notif.sent_via_email = True
    
    if req.send_sms:
        notif.sent_via_sms = True
    
    if req.send_push:
        notif.sent_via_push = True
    
    db.commit()
    return NotificationOut.model_validate(notif)

@router.post("/send-to-class-teacher")
def send_to_class_teacher(req: SendToTeacherCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Student, Class as ClassModel, Teacher
    
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can send to class teacher")
    
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student or not student.class_id:
        raise HTTPException(status_code=404, detail="Student or class not found")
    
    cls = db.query(ClassModel).filter(ClassModel.id == student.class_id).first()
    if not cls or not cls.class_teacher_id:
        raise HTTPException(status_code=404, detail="Class teacher not assigned")
    
    teacher = db.query(Teacher).filter(Teacher.id == cls.class_teacher_id).first()
    if not teacher or not teacher.user_id:
        raise HTTPException(status_code=404, detail="Teacher user account not found")
    
    notif = Notification(
        user_id=teacher.user_id, title=req.title, message=req.message,
        notification_type=req.notification_type,
        sender_id=current_user.id
    )
    db.add(notif)
    db.commit()
    return {"message": "Notification sent to class teacher"}

@router.post("/send-to-my-class")
async def send_to_my_class(req: SendToTeacherCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Class as ClassModel, Teacher, Student
    
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can send to their class")
    
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    cls = db.query(ClassModel).filter(ClassModel.class_teacher_id == teacher.id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="You are not assigned as class teacher to any class")
    
    students = db.query(Student).filter(Student.class_id == cls.id, Student.is_active == True, Student.user_id != None).all()
    if not students:
        raise HTTPException(status_code=404, detail="No students found in your class")
    
    count = 0
    for s in students:
        notif = Notification(
            user_id=s.user_id, title=req.title, message=req.message,
            notification_type=req.notification_type,
            sender_id=current_user.id
        )
        db.add(notif)
        count += 1
    
    db.commit()
    
    for s in students:
        await manager.send_to_user(s.user_id, {
            "type": "notification",
            "title": req.title,
            "message": req.message,
            "notification_type": req.notification_type,
            "created_at": datetime.utcnow().isoformat()
        })
    
    return {"message": f"Notification sent to {count} students in your class"}

@router.post("/send-homework")
async def send_homework(req: HomeworkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Class as ClassModel, Teacher, Student

    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can send homework")

    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    cls = db.query(ClassModel).filter(ClassModel.class_teacher_id == teacher.id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="You are not assigned as class teacher to any class")

    students = db.query(Student).filter(Student.class_id == cls.id, Student.is_active == True, Student.user_id != None).all()
    if not students:
        raise HTTPException(status_code=404, detail="No students found in your class")

    count = 0
    for s in students:
        msg = req.message
        if req.subject:
            msg = f"Subject: {req.subject}\n\n{msg}"
        if req.due_date:
            msg = f"{msg}\n\nDue Date: {req.due_date}"
        notif = Notification(
            user_id=s.user_id, title=req.title, message=msg,
            notification_type="homework",
            sender_id=current_user.id
        )
        db.add(notif)
        count += 1

    db.commit()
    
    for s in students:
        msg = req.message
        if req.subject:
            msg = f"Subject: {req.subject}\n\n{msg}"
        if req.due_date:
            msg = f"{msg}\n\nDue Date: {req.due_date}"
        await manager.send_to_user(s.user_id, {
            "type": "homework",
            "title": req.title,
            "message": msg,
            "notification_type": "homework",
            "created_at": datetime.utcnow().isoformat()
        })
    
    return {"message": f"Homework sent to {count} students in your class", "count": count}

@router.post("/send-bulk")
async def send_bulk_notification(
    req: BulkNotificationCreate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    from app.models.models import Student, Teacher, Class as ClassModel

    if req.role or (not req.class_id):
        if current_user.role not in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN]:
            raise HTTPException(status_code=403, detail="Only admin/principal can send to all users or by role")
    
    if req.class_id and current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        cls = db.query(ClassModel).filter(ClassModel.id == req.class_id).first()
        if not teacher or not cls or cls.class_teacher_id != teacher.id:
            raise HTTPException(status_code=403, detail="You can only send to your own class")
    
    user_ids = []
    if req.role:
        role_upper = req.role.upper()
        valid_roles = {m.name for m in UserRole}
        if role_upper not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role: {req.role}")
        users = db.query(User).filter(User.role == role_upper, User.is_active == True).limit(500).all()
        user_ids = [u.id for u in users]
    elif req.class_id:
        students = db.query(Student).filter(Student.class_id == req.class_id, Student.is_active == True).limit(500).all()
        user_ids = [s.user_id for s in students if s.user_id]
    else:
        users = db.query(User).filter(User.is_active == True).limit(500).all()
        user_ids = [u.id for u in users]
    
    count = 0
    for uid in user_ids:
        notif = Notification(
            user_id=uid, title=req.title, message=req.message,
            notification_type=req.notification_type,
            sent_via_email=req.send_email,
            sender_id=current_user.id
        )
        db.add(notif)
        count += 1
    
    db.commit()
    
    for uid in user_ids:
        await manager.send_to_user(uid, {
            "type": "notification",
            "title": req.title,
            "message": req.message,
            "notification_type": req.notification_type,
            "created_at": datetime.utcnow().isoformat()
        })
    
    return {"message": f"Notification sent to {count} users", "count": count}

@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}

@router.put("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

def send_email_notification(user_id: int, title: str, message: str, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.email:
        return
    
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_USER
        msg["To"] = user.email
        msg["Subject"] = f"School ERP - {title}"
        msg.attach(MIMEText(message, "plain"))
        
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")

# --- Parents ---
@router.get("/parent/{student_id}")
def get_parent_notifications(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Student as StudentModel
    student = db.query(StudentModel).filter(StudentModel.id == student_id).first()
    if not student or not student.parent_id:
        raise HTTPException(status_code=404, detail="Student or parent not found")
    
    parent_user = db.query(User).filter(User.id == student.parent_id).first()
    if not parent_user:
        return {"notifications": []}
    
    notifications = db.query(Notification).filter(
        Notification.user_id == parent_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    
    return {"notifications": [NotificationOut.model_validate(n) for n in notifications]}
