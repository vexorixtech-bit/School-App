"""Run this script to add sample data: python seed_data.py"""
import requests
import random
from datetime import date, timedelta

BASE = "http://localhost:8000"
TOKEN = None

def login():
    global TOKEN
    r = requests.post(f"{BASE}/api/auth/login", json={"username": "superadmin", "password": "admin123"})
    r.raise_for_status()
    TOKEN = r.json()["access_token"]
    print("Logged in as superadmin")

def api(method, path, json=None):
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    r = requests.request(method, f"{BASE}{path}", headers=headers, json=json)
    if r.status_code >= 400:
        print(f"  WARN: {method} {path} -> {r.status_code}: {r.text[:100]}")
    return r

def seed():
    login()

    # 1. Create Classes
    classes = [
        {"name": "Class 1", "code": "C1"},
        {"name": "Class 2", "code": "C2"},
        {"name": "Class 3", "code": "C3"},
        {"name": "Class 4", "code": "C4"},
        {"name": "Class 5", "code": "C5"},
        {"name": "Class 6", "code": "C6"},
        {"name": "Class 7", "code": "C7"},
        {"name": "Class 8", "code": "C8"},
        {"name": "Class 9", "code": "C9"},
        {"name": "Class 10", "code": "C10"},
    ]
    print("\nCreating classes...")
    created_classes = []
    for c in classes:
        r = api("POST", "/api/classes/", json=c)
        if r.status_code == 200:
            created_classes.append(r.json())
            print(f"  Created: {c['name']}")

    if not created_classes:
        print("  Classes already exist, fetching...")
        r = api("GET", "/api/classes/")
        created_classes = r.json()

    # 2. Create Sections for each class
    print("\nCreating sections...")
    sections = ["A", "B"]
    for cls in created_classes:
        for sec in sections:
            api("POST", "/api/classes/sections", json={"name": sec, "class_id": cls["id"], "capacity": 60})
        print(f"  Sections A,B created for {cls['name']}")

    # 3. Create Subjects
    print("\nCreating subjects...")
    subject_names = ["Mathematics", "English", "Science", "Tamil", "Social Science", "Computer Science"]
    for cls in created_classes:
        for i, sub in enumerate(subject_names[:4]):
            code = f"{sub[:3].upper()}{cls['code']}"
            api("POST", "/api/classes/subjects", json={
                "name": sub, "code": code, "class_id": cls["id"],
                "max_marks": 100, "pass_marks": 35
            })
        print(f"  Subjects created for {cls['name']}")

    # 4. Create Teachers
    print("\nCreating teachers...")
    teacher_data = [
        {"first_name": "Rajesh", "last_name": "Kumar", "gender": "male", "qualification": "M.Sc, B.Ed", "specialization": "Mathematics", "phone": "9876543210", "email": "rajesh@school.com"},
        {"first_name": "Priya", "last_name": "Devi", "gender": "female", "qualification": "M.A, B.Ed", "specialization": "English", "phone": "9876543211", "email": "priya@school.com"},
        {"first_name": "Suresh", "last_name": "R", "gender": "male", "qualification": "M.Sc, M.Ed", "specialization": "Science", "phone": "9876543212", "email": "suresh@school.com"},
        {"first_name": "Lakshmi", "last_name": "N", "gender": "female", "qualification": "M.A, B.Ed", "specialization": "Tamil", "phone": "9876543213", "email": "lakshmi@school.com"},
        {"first_name": "Karthik", "last_name": "S", "gender": "male", "qualification": "M.Com, B.Ed", "specialization": "Social Science", "phone": "9876543214", "email": "karthik@school.com"},
        {"first_name": "Anitha", "last_name": "M", "gender": "female", "qualification": "MCA", "specialization": "Computer Science", "phone": "9876543215", "email": "anitha@school.com"},
    ]
    created_teachers = []
    for t in teacher_data:
        r = api("POST", "/api/teachers/", json={**t, "date_of_birth": "1990-01-15", "joining_date": "2020-06-01"})
        if r.status_code == 200:
            created_teachers.append(r.json())
            print(f"  Created: {t['first_name']} {t['last_name']} - {t['specialization']}")

    # 5. Assign subjects to teachers
    print("\nAssigning subjects to teachers...")
    subjects_r = api("GET", "/api/classes/subjects")
    subjects = subjects_r.json() if subjects_r.status_code == 200 else []
    
    for teacher in created_teachers:
        # Find matching subject by specialization
        matching = [s for s in subjects if s["name"] == teacher.get("specialization", "")]
        if matching and created_classes:
            s = matching[0]
            api("POST", "/api/classes/assign-subject", json={
                "subject_id": s["id"], "teacher_id": teacher["id"], "class_id": s["class_id"]
            })
            print(f"  Assigned {s['name']} to {teacher['first_name']}")

    # Assign class teachers
    for i, cls in enumerate(created_classes):
        if i < len(created_teachers):
            api("PUT", f"/api/teachers/{created_teachers[i]['id']}/assign-class-teacher?class_id={cls['id']}")
            print(f"  {created_teachers[i]['first_name']} assigned as class teacher of {cls['name']}")

    # 6. Create Students
    print("\nCreating students...")
    first_names = ["Arun", "Bala", "Chitra", "Deepa", "Eswar", "Gowri", "Harish", "Iniya", "Janani", "Kavin",
                   "Mohan", "Nithya", "Om", "Pavithra", "Ravi", "Selvi", "Tharun", "Usha", "Vijay", "Yamini"]
    last_names = ["K", "M", "R", "S", "T", "N", "P", "V", "G", "L",
                  "A", "B", "C", "D", "H", "J", "W", "X", "Y", "Z"]

    genders = ["male", "female"]
    created_students = []
    student_count = 0

    for cls in created_classes:
        students_in_class = random.randint(3, 5)
        for i in range(students_in_class):
            idx = student_count % len(first_names)
            gender = genders[idx % 2]
            dob = date(2005 + random.randint(1, 10), random.randint(1, 12), random.randint(1, 28))
            
            student_payload = {
                "first_name": first_names[idx],
                "last_name": last_names[idx],
                "date_of_birth": dob.isoformat(),
                "gender": gender,
                "admission_date": date.today().isoformat(),
                "class_id": cls["id"],
                "phone": f"98{random.randint(10000000, 99999999)}",
                "email": f"{first_names[idx].lower()}.{last_names[idx].lower()}@student.com",
                "address": f"{random.randint(1, 999)} Main Street",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "blood_group": random.choice(["A+", "B+", "O+", "AB+", "A-"]),
            }
            r = api("POST", "/api/students/", json=student_payload)
            if r.status_code == 200:
                created_students.append(r.json())
                student_count += 1

    print(f"\n  Created {student_count} students")

    # 7. Create Fee Structure
    print("\nCreating fee structures...")
    for cls in created_classes:
        api("POST", "/api/fees/structures", json={
            "class_id": cls["id"], "fee_type": "Tuition Fee", "amount": random.choice([1500, 2000, 2500]), "frequency": "monthly"
        })
        api("POST", "/api/fees/structures", json={
            "class_id": cls["id"], "fee_type": "Library Fee", "amount": random.choice([200, 300]), "frequency": "annual"
        })

    # 8. Generate monthly fees
    print("\nGenerating monthly fees...")
    for cls in created_classes:
        api("POST", "/api/fees/generate-monthly", json={
            "class_id": cls["id"], "month": date.today().month, "year": date.today().year
        })
    print("  Done")

    # 9. Create an exam
    print("\nCreating exam...")
    if created_classes:
        exam_r = api("POST", "/api/exams/", json={
            "name": "Mid Term Examination 2025",
            "exam_type": "midterm",
            "class_id": created_classes[0]["id"],
            "start_date": date.today().isoformat(),
            "end_date": (date.today() + timedelta(days=7)).isoformat(),
            "description": "Half-yearly examinations"
        })
        if exam_r.status_code == 200:
            print("  Exam created")

    # 10. Create some attendance records
    print("\nCreating attendance records...")
    today = date.today()
    for day_offset in range(7):
        d = today - timedelta(days=day_offset)
        if d.weekday() < 6:  # Skip Sunday
            for student in created_students[:10]:
                status = random.choice(["present", "present", "present", "absent", "late"])
                api("POST", "/api/attendance/", json={
                    "student_id": student["id"],
                    "class_id": student["class_id"],
                    "date": d.isoformat(),
                    "status": status
                })
    print("  Done")

    print("\n========================================")
    print("SEED DATA CREATED SUCCESSFULLY!")
    print("========================================")
    print(f"  Classes:     {len(created_classes)}")
    print(f"  Teachers:    {len(created_teachers)}")
    print(f"  Students:    {student_count}")
    print(f"  Subjects:    {len(subjects)}")
    print("\nLogin at http://localhost:3000")
    print("  Username: superadmin")
    print("  Password: admin123")

if __name__ == "__main__":
    seed()
