"""Seed data directly into Neon PostgreSQL database"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import random
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import (
    Base, User, UserRole, Class, Section, Subject, SubjectTeacher,
    Teacher, Student, FeeStructure, Fee, Attendance,
    Exam, Notification, Timetable, Event, PaymentStatus
)
from app.auth.auth_handler import hash_password

DATABASE_URL = "postgresql://neondb_owner:npg_sZvFlANiO75D@ep-soft-bread-ad914x08-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 30})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed():
    import time
    # Retry connection for Neon cold start
    for attempt in range(3):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except Exception as e:
            if attempt < 2:
                print(f"Connection failed (attempt {attempt+1}/3), retrying in 5s...")
                time.sleep(5)
            else:
                raise
    db = SessionLocal()

    # 1. Superadmin
    if not db.query(User).filter(User.username == "superadmin").first():
        admin = User(
            username="superadmin", email="admin@school.com",
            full_name="Super Admin", password_hash=hash_password("admin123"),
            role=UserRole.SUPER_ADMIN, is_active=True
        )
        db.add(admin)
        db.flush()
        print("Created superadmin/admin123")
    else:
        print("Superadmin already exists")

    # 2. Classes
    class_data = [(f"Class {i}", f"C{i}") for i in range(1, 11)]
    created_classes = []
    for name, code in class_data:
        if not db.query(Class).filter(Class.code == code).first():
            c = Class(name=name, code=code)
            db.add(c)
            db.flush()
            created_classes.append(c)
            print(f"  Created {name}")
        else:
            c = db.query(Class).filter(Class.code == code).first()
            created_classes.append(c)
    db.flush()

    # 3. Sections
    for cls in created_classes:
        for sec_name in ["A", "B"]:
            if not db.query(Section).filter(Section.class_id == cls.id, Section.name == sec_name).first():
                db.add(Section(name=sec_name, class_id=cls.id, capacity=60))

    # 4. Subjects
    subject_names = ["Mathematics", "English", "Science", "Tamil"]
    for cls in created_classes:
        for i, name in enumerate(subject_names):
            if not db.query(Subject).filter(Subject.class_id == cls.id, Subject.name == name).first():
                code = f"{name[:3].upper()}{cls.code}"
                db.add(Subject(name=name, code=code, class_id=cls.id, max_marks=100, pass_marks=35))
    db.flush()
    subjects_all = db.query(Subject).all()
    print(f"  {len(subjects_all)} subjects created")

    # 5. Teachers
    teacher_list = [
        {"fn": "Rajesh", "ln": "Kumar", "spec": "Mathematics", "email": "rajesh@school.com"},
        {"fn": "Priya", "ln": "Devi", "spec": "English", "email": "priya@school.com"},
        {"fn": "Suresh", "ln": "R", "spec": "Science", "email": "suresh@school.com"},
        {"fn": "Lakshmi", "ln": "N", "spec": "Tamil", "email": "lakshmi@school.com"},
        {"fn": "Karthik", "ln": "S", "spec": "Social Science", "email": "karthik@school.com"},
        {"fn": "Anitha", "ln": "M", "spec": "Computer Science", "email": "anitha@school.com"},
        {"fn": "Manoj", "ln": "P", "spec": "Mathematics", "email": "manoj@school.com"},
        {"fn": "Divya", "ln": "R", "spec": "English", "email": "divya@school.com"},
        {"fn": "Vignesh", "ln": "S", "spec": "Science", "email": "vignesh@school.com"},
        {"fn": "Shanthi", "ln": "M", "spec": "Tamil", "email": "shanthi@school.com"},
        {"fn": "Ganesh", "ln": "K", "spec": "Social Science", "email": "ganesh@school.com"},
    ]
    created_teachers = []
    for t in teacher_list:
        existing = db.query(Teacher).filter(Teacher.email == t["email"]).first()
        if existing:
            created_teachers.append(existing)
            continue
        tid = f"TCH{random.randint(10000, 99999)}"
        teacher = Teacher(
            teacher_id=tid, first_name=t["fn"], last_name=t["ln"],
            date_of_birth=date(1990, 1, 15), gender=random.choice(["male", "female"]),
            qualification="M.Sc, B.Ed", specialization=t["spec"],
            joining_date=date(2020, 6, 1), phone=f"98{random.randint(10000000, 99999999)}",
            email=t["email"], address="Chennai", is_active=True
        )
        db.add(teacher)
        db.flush()
        username = f"{t['fn'].lower()}.{t['ln'][0].lower()}"
        user = User(username=username, password_hash=hash_password("teacher123"),
                    email=t["email"], full_name=f"{t['fn']} {t['ln']}", role=UserRole.TEACHER)
        db.add(user)
        db.flush()
        teacher.user_id = user.id
        created_teachers.append(teacher)
        print(f"  Teacher: {t['fn']} ({username}/teacher123)")
    db.flush()

    # 6. Assign subjects & class teachers
    for i, cls in enumerate(created_classes):
        if i < len(created_teachers):
            t = created_teachers[i]
            cls.class_teacher_id = t.id
            t.is_class_teacher = True
            t.class_teacher_of = cls.id
        # Assign matching subjects
        for sub in db.query(Subject).filter(Subject.class_id == cls.id).all():
            teacher = db.query(Teacher).filter(
                Teacher.specialization == sub.name,
                Teacher.is_active == True
            ).first()
            if teacher and not db.query(SubjectTeacher).filter(
                SubjectTeacher.subject_id == sub.id,
                SubjectTeacher.teacher_id == teacher.id
            ).first():
                db.add(SubjectTeacher(subject_id=sub.id, teacher_id=teacher.id, class_id=cls.id))

    # 7. Students (10 per class)
    first_names = ["Arun","Bala","Chitra","Deepa","Eswar","Gowri","Harish","Iniya","Janani","Kavin",
                   "Mohan","Nithya","Om","Pavithra","Ravi","Selvi","Tharun","Usha","Vijay","Yamini"]
    last_names = ["Kumar","Murugan","Raj","Selvi","Thangam","Nair","Pillai","Venkat","Gopal","Lakshmi"]
    random.seed(42)
    student_count = 0
    for cls in created_classes:
        for i in range(10):
            fn = first_names[(student_count) % len(first_names)]
            ln = last_names[(student_count) % len(last_names)]
            sid = f"STU{cls.id}{(i+1):02d}"
            phone = f"98{random.randint(10000000, 99999999)}"
            if db.query(Student).filter(Student.student_id == sid).first():
                student_count += 1
                continue
            student = Student(
                student_id=sid, first_name=fn, last_name=ln,
                date_of_birth=date(2005 + random.randint(1, 10), random.randint(1, 12), random.randint(1, 28)),
                gender=random.choice(["male", "female"]),
                admission_date=date.today(), class_id=cls.id,
                phone=phone, email=f"{fn.lower()}.{ln.lower()}.{student_count}@school.com",
                address=f"{random.randint(1, 999)} Main Street",
                city="Chennai", state="Tamil Nadu",
                blood_group=random.choice(["A+","B+","O+","AB+","A-"]),
                is_active=True
            )
            db.add(student)
            db.flush()
            uname = f"{fn.lower()}.{ln.lower()}.{student_count}"
            user = User(username=uname, password_hash=hash_password("student123"),
                        email=f"{fn.lower()}.{ln.lower()}.{student_count}@school.com",
                        full_name=f"{fn} {ln}", role=UserRole.STUDENT)
            db.add(user)
            db.flush()
            student.user_id = user.id
            student_count += 1
    print(f"  {student_count} students created")

    # 8. Fees
    for cls in created_classes:
        if not db.query(FeeStructure).filter(FeeStructure.class_id == cls.id).first():
            db.add(FeeStructure(class_id=cls.id, fee_type="Tuition Fee", amount=random.choice([1500, 2000, 2500]), frequency="monthly"))
            db.add(FeeStructure(class_id=cls.id, fee_type="Library Fee", amount=random.choice([200, 300]), frequency="annual"))
    students = db.query(Student).filter(Student.is_active == True).all()
    for student in students:
        structures = db.query(FeeStructure).filter(FeeStructure.class_id == student.class_id).all()
        for fs in structures:
            if not db.query(Fee).filter(Fee.student_id == student.id, Fee.fee_type == fs.fee_type).first():
                due = date(date.today().year, date.today().month, fs.due_day)
                db.add(Fee(student_id=student.id, fee_type=fs.fee_type,
                          amount=fs.amount, due_date=due, status=PaymentStatus.PENDING))

    # 9. Timetable
    time_slots = [("09:00","09:45"),("09:45","10:30"),("10:45","11:30"),("11:30","12:15")]
    existing_tt = db.query(Timetable).count()
    if existing_tt == 0:
        day_names = ["Monday","Tuesday","Wednesday","Thursday","Friday"]
        random.seed(123)
        for cls in created_classes:
            sections = db.query(Section).filter(Section.class_id == cls.id).all()
            subjects = db.query(Subject).filter(Subject.class_id == cls.id).all()
            for sec in sections:
                for day in range(5):
                    selected = random.sample(subjects, min(len(subjects), 4))
                    for i, sub in enumerate(selected):
                        if i >= len(time_slots): break
                        start, end = time_slots[i]
                        st = db.query(SubjectTeacher).filter(
                            SubjectTeacher.subject_id == sub.id,
                            SubjectTeacher.class_id == cls.id
                        ).first()
                        db.add(Timetable(
                            class_id=cls.id, section_id=sec.id,
                            subject_id=sub.id, teacher_id=st.teacher_id if st else None,
                            day_of_week=day, start_time=start, end_time=end,
                            room=f"Room {cls.id}{sec.name}{day+1}"
                        ))
        print("  Timetable created")

    # 10. Attendance (last 7 days for first 10 students)
    att_count = 0
    today = date.today()
    for day_offset in range(7):
        d = today - timedelta(days=day_offset)
        if d.weekday() < 6:
            for student in students[:10]:
                if not db.query(Attendance).filter(Attendance.student_id == student.id, Attendance.date == d).first():
                    status = random.choice(["present","present","present","absent","late"])
                    db.add(Attendance(student_id=student.id, class_id=student.class_id, date=d, status=status))
                    att_count += 1
    print(f"  {att_count} attendance records")

    # 11. Exam
    if created_classes and not db.query(Exam).first():
        db.add(Exam(name="Mid Term Examination 2025", exam_type="midterm",
                    class_id=created_classes[0].id, start_date=date.today(),
                    end_date=date.today() + timedelta(days=7),
                    description="Half-yearly examinations"))
        print("  Exam created")

    db.commit()
    db.close()
    print("\n========================================")
    print("SEED COMPLETE! Login at https://frontend-xi-tawny-85.vercel.app")
    print("  superadmin / admin123")
    print("  Teachers: firstname.lastinitial / teacher123")
    print("  Students: firstname.lastname.number / student123")
    print("========================================")

if __name__ == "__main__":
    seed()
