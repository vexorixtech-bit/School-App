"""Add timetable for teachers 6-11 (Classes 6-11) - each teaches own class all day"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ['DATABASE_URL'] = 'postgresql://postgres:Vignesh%401620@localhost:5432/school_erp'
from app.database import SessionLocal
from app.models.models import Timetable, Teacher, Subject, Section, Student
from sqlalchemy import text

db = SessionLocal()

# Find section A ids that students actually reference
sec_map = {}
for cid in range(6, 12):
    sec = db.query(Section).filter(
        Section.class_id == cid, Section.name == 'A',
        Section.id.in_(db.query(Student.section_id).distinct())
    ).first()
    if not sec:
        sec = db.query(Section).filter(Section.class_id == cid, Section.name == 'A').first()
    sec_map[cid] = sec.id if sec else None
    print(f"Class {cid}: using section_id={sec_map[cid]}")

teachers_info = [
    (6, 6),   # Naveen Iyer -> Class 6, Science
    (7, 7),   # Kavya Pillai -> Class 7, English
    (8, 8),   # Murugan Selvam -> Class 8, Science
    (9, 9),   # Sanjay Balan -> Class 9, Economics
    (10, 10), # Sneha Patel -> Class 10, Economics
    (11, 11), # Rahul Devi -> Class 11, Mathematics
]

time_slots = [
    ('08:00', '09:00'),
    ('09:00', '10:00'),
    ('10:00', '11:00'),
    ('11:00', '12:00'),
    ('12:00', '13:00'),
    ('14:00', '15:00'),
]

count = 0

for teacher_id, class_id in teachers_info:
    # Find the teacher's subject for their class
    sub = db.query(Subject).filter(Subject.class_id == class_id).first()
    if not sub:
        print(f"WARNING: No subject found for class {class_id}, skipping teacher {teacher_id}")
        continue
    
    section_id = sec_map.get(class_id)
    if not section_id:
        print(f"WARNING: No section A found for class {class_id}, skipping")
        continue
    
    t = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    print(f"Creating: Teacher {teacher_id} ({t.first_name} {t.last_name}) -> Class {class_id}, Subject {sub.name}, Section_id={section_id}")
    
    for day_idx in range(5):
        for start_t, end_t in time_slots:
            db.add(Timetable(
                class_id=class_id, section_id=section_id,
                subject_id=sub.id, teacher_id=teacher_id,
                day_of_week=day_idx, start_time=start_t, end_time=end_t, room="",
            ))
            count += 1

db.commit()
print(f"Created {count} timetable entries total")
db.close()
