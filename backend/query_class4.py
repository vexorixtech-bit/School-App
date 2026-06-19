from app.database import SessionLocal
from app.models.models import Student, User, Class, Section
db = SessionLocal()
cls = db.query(Class).filter(Class.name == 'Class 4').first()
students = db.query(Student).filter(Student.class_id == cls.id).order_by(Student.first_name).all()
print(f'=== Class 4 Students ({len(students)} total) ===')
for s in students:
    sec = db.query(Section).filter(Section.id == s.section_id).first()
    user = db.query(User).filter(User.id == s.user_id).first()
    username = user.username if user else 'NO LOGIN'
    print(f'{s.first_name:<12} {s.last_name:<12} Section={sec.name if sec else "?"}  Username={username:<25} Password=student123')
db.close()
