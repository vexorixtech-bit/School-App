"""
Populate timetable for sections B/C and classes 1-5
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.models import Timetable, Section, Class, Subject, SubjectTeacher, Teacher
from datetime import time as dtime
from sqlalchemy import and_

db = SessionLocal()

DAYS = range(5)  # Mon-Fri
PERIODS = [
    (dtime(9,0), dtime(9,45)),
    (dtime(9,45), dtime(10,30)),
    (dtime(10,45), dtime(11,30)),
    (dtime(11,30), dtime(12,15)),
    (dtime(13,0), dtime(13,45)),
    (dtime(13,45), dtime(14,30)),
]

def get_teacher_for_subject(class_id, subject_id):
    st = db.query(SubjectTeacher).filter(
        SubjectTeacher.class_id == class_id,
        SubjectTeacher.subject_id == subject_id
    ).first()
    if st:
        return st.teacher_id
    return None

# --- Step 1: Copy section A timetable to B and C for each class ---
print("=== Copying timetable from Section A to B/C ===")
tt_a = db.query(Timetable).order_by(Timetable.class_id, Timetable.section_id).all()
by_class = {}
for t in tt_a:
    by_class.setdefault(t.class_id, []).append(t)

for class_id, entries in sorted(by_class.items()):
    cls = db.query(Class).filter(Class.id == class_id).first()
    sections = db.query(Section).filter(
        Section.class_id == class_id,
        Section.name != 'A'
    ).all()
    for sec in sections:
        count = db.query(Timetable).filter(
            Timetable.class_id == class_id,
            Timetable.section_id == sec.id
        ).count()
        if count > 0:
            print(f"  Class {cls.name} Section {sec.name}: already has {count} entries, skipping")
            continue
        for e in entries:
            new_tt = Timetable(
                class_id=class_id,
                section_id=sec.id,
                subject_id=e.subject_id,
                teacher_id=e.teacher_id,
                day_of_week=e.day_of_week,
                start_time=e.start_time,
                end_time=e.end_time,
                room=e.room
            )
            db.add(new_tt)
        print(f"  Class {cls.name} Section {sec.name}: copied {len(entries)} entries from section A")
    db.commit()

# --- Step 2: Populate timetable for classes 1-5 (no timetable yet) ---
print("\n=== Creating timetable for classes 1-5 ===")
for class_id in range(1, 6):
    cls = db.query(Class).filter(Class.id == class_id).first()
    sections = db.query(Section).filter(Section.class_id == class_id).all()
    subjects = db.query(Subject).filter(Subject.class_id == class_id).all()
    skip = db.query(Timetable).filter(Timetable.class_id == class_id).first()
    if skip:
        tt_count = db.query(Timetable).filter(Timetable.class_id == class_id).count()
        print(f"  Class {cls.name}: already has {tt_count} entries, skipping")
        continue
    
    created = 0
    for sec in sections:
        for day in DAYS:
            for period_idx, (start, end) in enumerate(PERIODS):
                sub = subjects[period_idx % len(subjects)] if subjects else None
                if not sub:
                    continue
                teacher_id = get_teacher_for_subject(class_id, sub.id)
                room = f"Room {100 + class_id * 10 + period_idx}"
                tt = Timetable(
                    class_id=class_id,
                    section_id=sec.id,
                    subject_id=sub.id,
                    teacher_id=teacher_id,
                    day_of_week=day,
                    start_time=start,
                    end_time=end,
                    room=room
                )
                db.add(tt)
                created += 1
        db.commit()
    print(f"  Class {cls.name}: created {created} entries across {len(sections)} sections")

db.close()
print("\nDone!")
