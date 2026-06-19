"""Add Tamil subject to classes 2,3,4"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.database import SessionLocal
from app.models.models import Subject, Timetable

db = SessionLocal()

for cid in [2, 3, 4]:
    existing = {s.name for s in db.query(Subject).filter(Subject.class_id == cid).all()}
    if 'Tamil' not in existing:
        db.add(Subject(name='Tamil', code=f'Tami{cid}', class_id=cid, max_marks=100, pass_marks=35))
        print(f'Added Tamil to Class {cid}')

db.commit()

# Get Tamil subject IDs for all classes 1-5
tamil_subs = {}
for cid in range(1, 6):
    s = db.query(Subject).filter(Subject.class_id == cid, Subject.name == 'Tamil').first()
    if s:
        tamil_subs[cid] = s.id

print(f"Tamil subject IDs: {tamil_subs}")

# Now create the missing timetable entries for Geetha Sharma (teacher_id=1)
from app.models.models import Section

# Get section A for each class
sections = {}
for cid in range(1, 6):
    sec = db.query(Section).filter(Section.class_id == cid, Section.name == 'A').first()
    if sec:
        sections[cid] = sec

# Same rotation pattern
slot_classes = [
    [1, 2, 3, 4, 5],  # 8-9
    [2, 3, 4, 5, 1],  # 9-10
    [3, 4, 5, 1, 2],  # 10-11
    [4, 5, 1, 2, 3],  # 11-12
    [5, 1, 2, 3, 4],  # 12-1
    [1, 2, 3, 4, 5],  # 2-3
]
time_slots = [('08:00','09:00'), ('09:00','10:00'), ('10:00','11:00'), ('11:00','12:00'), ('12:00','13:00'), ('14:00','15:00')]

teacher_id = 1  # Geetha Sharma
t_idx = 0  # first teacher = no shift
count = 0

for slot_idx, (start_t, end_t) in enumerate(time_slots):
    for day_idx in range(5):
        class_num = (slot_classes[slot_idx][day_idx] + t_idx) % 5
        if class_num == 0:
            class_num = 5
        cid = class_num
        if cid not in sections or cid not in tamil_subs:
            print(f"Missing section or subject for class {cid}")
            continue
        db.add(Timetable(
            class_id=cid, section_id=sections[cid].id,
            subject_id=tamil_subs[cid], teacher_id=teacher_id,
            day_of_week=day_idx, start_time=start_t, end_time=end_t, room="",
        ))
        count += 1

db.commit()
print(f"Added {count} missing timetable entries for Geetha Sharma (Tamil)")
db.close()
