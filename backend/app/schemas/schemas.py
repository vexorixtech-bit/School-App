from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

# --- User ---
class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., max_length=255)
    role: str
    phone: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    phone: Optional[str]
    is_active: bool
    profile_image: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: Optional[bool] = None

# --- Student ---
class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    admission_date: date
    class_id: int
    section_id: Optional[int] = None
    parent_id: Optional[int] = None
    blood_group: Optional[str] = None
    password: Optional[str] = None

class StudentOut(BaseModel):
    id: int
    student_id: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    admission_date: date
    class_id: Optional[int]
    section_id: Optional[int]
    parent_id: Optional[int]
    photo: Optional[str]
    blood_group: Optional[str]
    user_id: Optional[int] = None
    is_active: bool
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    username: Optional[str] = None
    
    class Config:
        from_attributes = True

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    class_id: Optional[int] = None
    section_id: Optional[int] = None
    blood_group: Optional[str] = None

# --- Teacher ---
class TeacherCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    joining_date: date
    password: Optional[str] = None

class TeacherOut(BaseModel):
    id: int
    teacher_id: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    qualification: Optional[str]
    specialization: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    joining_date: date
    is_class_teacher: bool
    class_teacher_of: Optional[int] = None
    class_name: Optional[str] = None
    user_id: Optional[int] = None
    is_active: bool
    subjects: list = []
    username: Optional[str] = None
    
    class Config:
        from_attributes = True

class TeacherUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None

# --- Class ---
class ClassCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    class_teacher_id: Optional[int] = None

class ClassOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str]
    class_teacher_id: Optional[int]
    is_active: bool
    
    class Config:
        from_attributes = True

# --- Section ---
class SectionCreate(BaseModel):
    name: str
    class_id: int
    capacity: Optional[int] = 60

class SectionOut(BaseModel):
    id: int
    name: str
    class_id: int
    class_name: Optional[str] = None
    capacity: Optional[int]
    
    class Config:
        from_attributes = True

# --- Subject ---
class SubjectCreate(BaseModel):
    name: str
    code: str
    class_id: int
    is_lab: bool = False
    max_marks: int = 100
    pass_marks: int = 35

class SubjectOut(BaseModel):
    id: int
    name: str
    code: str
    class_id: int
    class_name: Optional[str] = None
    is_lab: bool
    max_marks: int
    pass_marks: int
    
    class Config:
        from_attributes = True

class SubjectAssign(BaseModel):
    subject_id: int
    teacher_id: int
    class_id: int

# --- Attendance ---
class AttendanceCreate(BaseModel):
    student_id: int
    class_id: int
    date: date
    status: str
    remarks: Optional[str] = None

class BulkAttendanceCreate(BaseModel):
    class_id: int
    date: date
    records: List[AttendanceCreate]

class AttendanceOut(BaseModel):
    id: int
    student_id: int
    class_id: int
    date: date
    status: str
    remarks: Optional[str]
    
    class Config:
        from_attributes = True

# --- Fee ---
class FeeStructureCreate(BaseModel):
    class_id: int
    fee_type: str
    amount: float
    frequency: str = "monthly"
    due_day: int = 10

class FeeCreate(BaseModel):
    student_id: int
    fee_type: str
    amount: float
    due_date: date

class FeePayment(BaseModel):
    fee_id: int
    amount: float
    payment_method: str
    transaction_id: Optional[str] = None

class FeeOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    fee_type: str
    amount: float
    paid_amount: float
    due_date: date
    paid_date: Optional[date]
    status: str
    payment_method: Optional[str]
    receipt_no: Optional[str]
    
    class Config:
        from_attributes = True

class FeeUpdate(BaseModel):
    fee_type: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    paid_amount: Optional[float] = None

# --- Exam ---
class ExamCreate(BaseModel):
    name: str
    exam_type: str
    class_id: int
    start_date: date
    end_date: date
    description: Optional[str] = None

class ExamOut(BaseModel):
    id: int
    name: str
    exam_type: str
    class_id: int
    start_date: date
    end_date: date
    description: Optional[str]
    
    class Config:
        from_attributes = True

class ExamSubjectCreate(BaseModel):
    exam_id: int
    subject_id: int
    exam_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    max_marks: int = 100
    pass_marks: int = 35

# --- Result ---
class ResultCreate(BaseModel):
    student_id: int
    exam_id: int
    subject_id: int
    marks_obtained: float
    max_marks: int = 100
    grade: Optional[str] = None
    remarks: Optional[str] = None

class ResultOut(BaseModel):
    id: int
    student_id: int
    exam_id: int
    subject_id: int
    marks_obtained: float
    max_marks: int
    grade: Optional[str]
    remarks: Optional[str]
    
    class Config:
        from_attributes = True

class BatchResultItem(BaseModel):
    student_id: int
    subject_id: int
    marks_obtained: float

class BatchResultCreate(BaseModel):
    exam_id: int
    results: List[BatchResultItem]

# --- Timetable ---
class TimetableCreate(BaseModel):
    class_id: int
    section_id: int
    subject_id: int
    teacher_id: int
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str] = None

class TimetableOut(BaseModel):
    id: int
    class_id: int
    section_id: int
    subject_id: int
    teacher_id: int
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str]
    
    class Config:
        from_attributes = True

# --- Notification ---
class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    notification_type: str = "general"
    send_email: bool = False
    send_sms: bool = False
    send_push: bool = False

class BulkNotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str = "general"
    role: Optional[str] = None
    class_id: Optional[int] = None
    send_email: bool = False

class SendToTeacherCreate(BaseModel):
    title: str
    message: str
    notification_type: str = "general"
    send_sms: bool = False
    send_push: bool = False

class HomeworkCreate(BaseModel):
    title: str
    message: str
    subject: Optional[str] = None
    due_date: Optional[str] = None

class NotificationOut(BaseModel):
    id: int
    user_id: int
    sender_id: Optional[int] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Parent ---
class ParentCreate(BaseModel):
    father_name: str
    mother_name: Optional[str] = None
    father_phone: Optional[str] = None
    mother_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    occupation: Optional[str] = None

class ParentOut(BaseModel):
    id: int
    father_name: str
    mother_name: Optional[str]
    father_phone: Optional[str]
    mother_phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    occupation: Optional[str]
    
    class Config:
        from_attributes = True

# --- Dashboard ---
class DashboardStats(BaseModel):
    total_students: int
    total_teachers: int
    total_classes: int
    attendance_percentage: float
    total_fees_collected: float
    pending_fees: float
    upcoming_exams: int

class AttendanceChart(BaseModel):
    labels: List[str]
    data: List[float]

class FeeChart(BaseModel):
    labels: List[str]
    collected: List[float]
    pending: List[float]

# --- Events ---
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    class_id: int

class EventOut(BaseModel):
    id: int
    class_id: int
    created_by: int
    title: str
    description: Optional[str] = None
    event_date: date
    poster_image: Optional[str] = None
    created_at: datetime
    teacher_name: Optional[str] = None
    class_name: Optional[str] = None

    class Config:
        from_attributes = True
