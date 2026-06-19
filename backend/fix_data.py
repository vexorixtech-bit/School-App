"""
Comprehensive data fix script:
1. Fix duplicate sections (delete originals 1-20 with 0 students)
2. Create login credentials for all remaining students and teachers in batch
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.models import User, UserRole, Student, Teacher, Section, Timetable, Class
from app.auth.auth_handler import hash_password

def fix_sections(db):
    print("=== Fixing Duplicate Sections ===")
    sections = db.query(Section).order_by(Section.class_id, Section.name).all()
    orphan_ids = []
    for s in sections:
        count = db.query(Student).filter(Student.section_id == s.id).count()
        if count == 0:
            orphan_ids.append(s.id)
    if orphan_ids:
        print(f"  Found {len(orphan_ids)} orphaned sections (no students): ids={orphan_ids}")
        deleted_tt = db.query(Timetable).filter(Timetable.section_id.in_(orphan_ids)).delete(synchronize_session=False)
        print(f"  Deleted {deleted_tt} timetable entries")
        db.query(Section).filter(Section.id.in_(orphan_ids)).delete(synchronize_session=False)
        db.commit()
        print(f"  Deleted {len(orphan_ids)} orphaned sections.")
    else:
        print("  No orphaned sections found.")
    remaining = db.query(Section).order_by(Section.class_id, Section.name).all()
    print(f"  Remaining sections: {len(remaining)}")
    for s in remaining:
        count = db.query(Student).filter(Student.section_id == s.id).count()
        print(f"    id={s.id:3d}, class_id={s.class_id:2d}, name={s.name}, students={count}")
    print()

def batch_create_student_logins(db):
    print("=== Creating Student Logins ===")
    students = db.query(Student).filter(Student.user_id == None).order_by(Student.id).all()
    print(f"  Found {len(students)} students without login accounts")
    created = 0
    for s in students:
        first = s.first_name.lower().replace(" ", ".")
        last = s.last_name.lower().replace(" ", ".")
        base = f"{first}.{last}" if first != last else f"{first}.{s.student_id.lower()}"
        username = base
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base}{counter}"
            counter += 1
        try:
            user = User(
                username=username,
                email=f"{username}@school.local",
                full_name=f"{s.first_name} {s.last_name}",
                password_hash=hash_password("student123"),
                role=UserRole.STUDENT,
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.flush()
            s.user_id = user.id
            created += 1
            if created % 20 == 0:
                db.commit()
                print(f"    Created {created}/{len(students)}...")
        except Exception as e:
            print(f"    Error creating login for {s.first_name} {s.last_name}: {e}")
            db.rollback()
    if created > 0:
        db.commit()
    print(f"  Created {created} student login accounts (password: student123)")
    print()

def batch_create_teacher_logins(db):
    print("=== Creating Teacher Logins ===")
    teachers = db.query(Teacher).filter(Teacher.user_id == None).order_by(Teacher.id).all()
    print(f"  Found {len(teachers)} teachers without login accounts")
    created = 0
    for t in teachers:
        first = t.first_name.lower().replace(" ", ".")
        last = t.last_name.lower().replace(" ", ".")
        base = f"{first}.{last}"
        username = base
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base}{counter}"
            counter += 1
        try:
            user = User(
                username=username,
                email=f"{username}@school.local",
                full_name=f"{t.first_name} {t.last_name}",
                password_hash=hash_password("teacher123"),
                role=UserRole.TEACHER,
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.flush()
            t.user_id = user.id
            created += 1
        except Exception as e:
            print(f"    Error creating login for {t.first_name} {t.last_name}: {e}")
            db.rollback()
    if created > 0:
        db.commit()
    print(f"  Created {created} teacher login accounts (password: teacher123)")
    print()

def list_credentials(db):
    print("=== All Active User Credentials ===")
    users = db.query(User).filter(User.is_active == True).order_by(User.role, User.username).all()
    print(f"{'Username':<30} {'Role':<15} {'Full Name':<35} {'Password'}")
    print("-" * 110)
    for u in users:
        role = u.role.value if hasattr(u.role, 'value') else u.role
        if role == 'super_admin': pwd = "admin123"
        elif role == 'admin': pwd = "admin@123"
        elif role == 'principal': pwd = "principal@123"
        elif role == 'teacher': pwd = "teacher123"
        elif role == 'student': pwd = "student123"
        elif role == 'parent': pwd = "parent@123"
        else: pwd = "unknown"
        print(f"{u.username:<30} {role:<15} {u.full_name:<35} {pwd}")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        fix_sections(db)
        batch_create_student_logins(db)
        batch_create_teacher_logins(db)
        list_credentials(db)
    finally:
        db.close()
