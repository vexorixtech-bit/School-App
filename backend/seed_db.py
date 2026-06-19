from app.database import SessionLocal
from app.models.models import *
from sqlalchemy import func
from datetime import date, timedelta
import random

db = SessionLocal()
classes = db.query(Class).all()
if not classes:
    print("Creating classes 1-10...")
    for i in range(1, 11):
        db.add(Class(name=f"Class {i}", code=f"C{i:02d}"))
    db.commit()
    classes = db.query(Class).all()
    print(f"Created {len(classes)} classes")

# Sections
for cls in classes:
    for sec in ["A", "B"]:
        if not db.query(Section).filter(Section.name == sec, Section.class_id == cls.id).first():
            db.add(Section(name=sec, class_id=cls.id, capacity=60))
db.commit()
print("Sections OK")

# Subjects
for cls in classes:
    for sub in ["Mathematics", "English", "Science", "Tamil"]:
        code = sub[:3].upper() + cls.code
        if not db.query(Subject).filter(Subject.code == code).first():
            db.add(Subject(name=sub, code=code, class_id=cls.id, max_marks=100, pass_marks=35))
db.commit()
print("Subjects OK")

# Teachers
next_num = 1
max_t = db.query(func.max(Teacher.teacher_id)).scalar()
if max_t:
    next_num = int(max_t[3:]) + 1
tdata = [
    ("Rajesh", "Kumar", "male", "M.Sc, B.Ed", "Mathematics", "9876543210", "rajesh@school.com"),
    ("Priya", "Devi", "female", "M.A, B.Ed", "English", "9876543211", "priya@school.com"),
    ("Suresh", "R", "male", "M.Sc, M.Ed", "Science", "9876543212", "suresh@school.com"),
    ("Lakshmi", "N", "female", "M.A, B.Ed", "Tamil", "9876543213", "lakshmi@school.com"),
]
teachers = []
for fn, ln, g, qual, spec, ph, em in tdata:
    t = db.query(Teacher).filter(Teacher.email == em).first()
    if not t:
        tid = f"TEA{next_num:03d}"
        next_num += 1
        t = Teacher(
            teacher_id=tid, first_name=fn, last_name=ln, gender=Gender(g),
            date_of_birth=date(1990, 1, 15), qualification=qual, specialization=spec,
            phone=ph, email=em, joining_date=date(2020, 6, 1),
        )
        db.add(t)
        db.flush()
    teachers.append(t)
db.commit()
print(f"Teachers: {len(teachers)}")

# Assign subjects
subjects = db.query(Subject).all()
for t in teachers:
    for s in [s for s in subjects if s.name == t.specialization]:
        if s and not db.query(SubjectTeacher).filter(SubjectTeacher.subject_id == s.id, SubjectTeacher.teacher_id == t.id).first():
            db.add(SubjectTeacher(subject_id=s.id, teacher_id=t.id, class_id=s.class_id))
db.commit()

# Class teachers
for i, cls in enumerate(classes):
    if i < len(teachers):
        t = teachers[i]
        if not t.class_teacher_of:
            t.class_teacher_of = cls.id
            t.is_class_teacher = True
db.commit()
print("Assignments OK")

# Students
fnames = ["Arun", "Bala", "Chitra", "Deepa", "Eswar", "Gowri", "Harish", "Iniya", "Janani", "Kavin",
          "Mohan", "Nithya", "Om", "Pavithra", "Ravi", "Selvi", "Tharun", "Usha", "Vijay", "Yamini"]
lnames = ["K", "M", "R", "S", "T", "N", "P", "V", "G", "L", "A", "B", "C", "D", "H", "J", "W", "X", "Y", "Z"]
genders = ["male", "female"]
students = []
c = 0
for cls in classes:
    for i in range(random.randint(3, 4)):
        idx = c % len(fnames)
        sid = f"SCH{random.randint(10000, 99999)}"
        while db.query(Student).filter(Student.student_id == sid).first():
            sid = f"SCH{random.randint(10000, 99999)}"
        s = Student(
            student_id=sid,
            first_name=fnames[idx], last_name=lnames[idx],
            date_of_birth=date(2005 + random.randint(1, 10), random.randint(1, 12), random.randint(1, 28)),
            gender=Gender(genders[idx % 2]),
            admission_date=date.today(),
            class_id=cls.id,
            phone=f"98{random.randint(10000000, 99999999)}",
            email=f"{fnames[idx].lower()}.{lnames[idx].lower()}@student.com",
            address=f"{random.randint(1, 999)} Main Street",
            city="Chennai", state="Tamil Nadu",
            blood_group=random.choice(["A+", "B+", "O+", "AB+"]),
        )
        db.add(s)
        db.flush()
        students.append(s)
        c += 1
db.commit()
print(f"Students: {c}")

# Link student1
user1 = db.query(User).filter(User.username == "student1").first()
s1 = db.query(Student).filter(Student.user_id == None).first()
if user1 and s1:
    s1.user_id = user1.id
    db.commit()
    print(f"Linked student1 -> {s1.first_name} {s1.last_name} (id={s1.id})")
else:
    if not user1: print("WARN: student1 user not found")
    if not s1: print("WARN: no unlinked student profile found")

# Parent profile
pu = db.query(User).filter(User.username == "parent1").first()
if pu:
    if not db.query(Parent).filter(Parent.user_id == pu.id).first():
        p = Parent(
            user_id=pu.id, father_name="Parent User",
            email="parent@test.com", father_phone="9876543200",
            occupation="Engineer",
        )
        db.add(p)
        db.commit()
        print("Parent profile created")

# Fee structures
for cls in classes:
    for amt, ft, freq in [(1500, "Tuition Fee", "monthly"), (200, "Library Fee", "annual")]:
        if not db.query(FeeStructure).filter(FeeStructure.class_id == cls.id, FeeStructure.fee_type == ft).first():
            db.add(FeeStructure(class_id=cls.id, fee_type=ft, amount=amt, frequency=freq))
db.commit()
print("Fees OK")

# Exam
exam = db.query(Exam).filter(Exam.name == "Mid Term Examination 2025").first()
if not exam and classes:
    exam = Exam(
        name="Mid Term Examination 2025",
        exam_type=ExamType.MIDTERM,
        class_id=classes[0].id,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
    )
    db.add(exam)
    db.flush()
    for s in db.query(Subject).filter(Subject.class_id == classes[0].id).all():
        db.add(ExamSubject(exam_id=exam.id, subject_id=s.id, max_marks=100, pass_marks=35))
    db.commit()
    print("Exam created")

# Results for linked student
if exam and s1 and s1.id:
    for es in db.query(ExamSubject).filter(ExamSubject.exam_id == exam.id).all():
        marks = random.randint(45, 100)
        pct = marks / es.max_marks * 100
        grade = "A" if pct >= 90 else "B" if pct >= 75 else "C" if pct >= 60 else "D" if pct >= 50 else "F"
        if not db.query(Result).filter(Result.student_id == s1.id, Result.exam_id == exam.id, Result.subject_id == es.subject_id).first():
            db.add(Result(student_id=s1.id, exam_id=exam.id, subject_id=es.subject_id, marks_obtained=marks, max_marks=es.max_marks, grade=grade))
    db.commit()
    print(f"Results created for {s1.first_name}")
else:
    if not exam: print("WARN: exam not created")
    if s1: print(f"s1.id = {s1.id}, type = {type(s1.id)}")

# Attendance
today = date.today()
ac = 0
for do in range(7):
    d = today - timedelta(days=do)
    if d.weekday() < 6:
        for st in students[:10]:
            if not db.query(Attendance).filter(Attendance.student_id == st.id, Attendance.date == d).first():
                db.add(Attendance(
                    student_id=st.id, class_id=st.class_id, date=d,
                    status=random.choice([AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE]),
                ))
                ac += 1
db.commit()
print(f"Attendance: {ac}")

db.close()
print("Done!")
