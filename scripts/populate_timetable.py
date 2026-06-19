"""
Populate timetable and update subjects/teachers based on user's schedule.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))  # scripts/ -> backend/

from app.database import SessionLocal
from app.models.models import Class, Section, Subject, Teacher, SubjectTeacher, Timetable

db = SessionLocal()

# --- Step 1: Add missing subjects to classes 1-4 ---
subjects_to_add = {
    1: [('English', 'Engl'), ('Mathematics', 'Math'), ('Science', 'Scie'), ('Social Science', 'SSCI')],
    2: [('English', 'Engl'), ('Mathematics', 'Math'), ('Science', 'Scie'), ('Social Science', 'SSCI')],
    3: [('English', 'Engl'), ('Mathematics', 'Math'), ('Science', 'Scie'), ('Social Science', 'SSCI')],
    4: [('English', 'Engl'), ('Mathematics', 'Math'), ('Science', 'Scie'), ('Social Science', 'SSCI')],
}

for class_id, subs in subjects_to_add.items():
    existing = {s.name for s in db.query(Subject).filter(Subject.class_id == class_id).all()}
    for name, code_prefix in subs:
        if name not in existing:
            db.add(Subject(name=name, code=f"{code_prefix}{class_id}", class_id=class_id, max_marks=100, pass_marks=35))
            print(f"Added {name} to Class {class_id}")

db.commit()

# --- Step 2: Update teacher subjects ---
teacher_updates = {
    2: 'English',
    3: 'Mathematics',
    4: 'Science',
}

for teacher_id, subj_name in teacher_updates.items():
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    subj = db.query(Subject).filter(Subject.class_id == teacher.class_teacher_of, Subject.name == subj_name).first()
    if not subj:
        print(f"Subject {subj_name} not found for teacher {teacher_id}")
        continue
    db.query(SubjectTeacher).filter(SubjectTeacher.teacher_id == teacher_id).delete()
    db.add(SubjectTeacher(subject_id=subj.id, teacher_id=teacher_id, class_id=teacher.class_teacher_of))
    print(f"Teacher {teacher_id} ({teacher.first_name}) -> {subj_name}")

db.commit()

# --- Step 3: Create timetable entries ---
# Sections for each class (use A)
sections = {}
for cid in range(1, 6):
    sec = db.query(Section).filter(Section.class_id == cid, Section.name == 'A').first()
    if sec:
        sections[cid] = sec

teachers = [
    (1, 'Tamil', 'Geetha Sharma'),
    (2, 'English', 'Kavya Krishnan'),
    (3, 'Mathematics', 'Karthik Sharma'),
    (4, 'Science', 'Karthik Eswaran'),
    (5, 'Social Science', 'Suresh Venkat'),
]

time_slots = [('08:00','09:00'), ('09:00','10:00'), ('10:00','11:00'), ('11:00','12:00'), ('12:00','13:00'), ('14:00','15:00')]

# Base pattern for teacher 1 (index 0)
slot_classes = [
    [1, 2, 3, 4, 5],  # 8-9
    [2, 3, 4, 5, 1],  # 9-10
    [3, 4, 5, 1, 2],  # 10-11
    [4, 5, 1, 2, 3],  # 11-12
    [5, 1, 2, 3, 4],  # 12-1
    [1, 2, 3, 4, 5],  # 2-3
]

# Clear existing timetable for classes 1-5
db.query(Timetable).filter(Timetable.class_id.in_([1,2,3,4,5])).delete()
db.commit()

for t_idx, (teacher_id, subj_name, tname) in enumerate(teachers):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    count = 0
    for slot_idx, (start_t, end_t) in enumerate(time_slots):
        for day_idx in range(5):
            class_num = (slot_classes[slot_idx][day_idx] + t_idx) % 5
            if class_num == 0:
                class_num = 5
            cid = class_num
            if cid not in sections:
                continue
            subject = db.query(Subject).filter(Subject.class_id == cid, Subject.name == subj_name).first()
            if not subject:
                print(f"  Missing subject {subj_name} for class {cid}")
                continue
            db.add(Timetable(
                class_id=cid, section_id=sections[cid].id,
                subject_id=subject.id, teacher_id=teacher_id,
                day_of_week=day_idx, start_time=start_t, end_time=end_t, room="",
            ))
            count += 1
    print(f"Created {count} entries for {tname} ({subj_name})")

db.commit()
db.close()
print("\nDone! All timetable entries created.")
