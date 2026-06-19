import requests
BASE = "http://localhost:8000"
r = requests.post(BASE + "/api/auth/login", json={"username": "superadmin", "password": "admin123"})
token = r.json()["access_token"]
headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}
users = [
    ("admin1", "admin", "Admin User"),
    ("principal1", "principal", "Principal User"),
    ("teacher1", "teacher", "Teacher User"),
    ("student1", "student", "Student User"),
    ("parent1", "parent", "Parent User"),
]
print(f"{'Role':12s} {'Username':12s} {'Password':10s} Status")
print("-" * 50)
for uname, role, fname in users:
    r = requests.post(BASE + "/api/auth/register", json={
        "username": uname, "password": "test123",
        "email": uname + "@test.com", "full_name": fname, "role": role
    }, headers=headers)
    s = "OK" if r.status_code == 200 else str(r.json().get("detail", "error"))
    print(f"{role:12s} {uname:12s} test123    {s}")
