import requests, json

BASE = 'http://localhost:8000'
h = {'Content-Type':'application/json'}

def test(desc, method, url, **kwargs):
    try:
        if method == 'GET':
            r = requests.get(BASE+url, **kwargs)
        elif method == 'POST':
            r = requests.post(BASE+url, **kwargs)
        elif method == 'DELETE':
            r = requests.delete(BASE+url, **kwargs)
        print(f'  {"?" if r.status_code < 400 else "?"} {desc}: {r.status_code}')
        if r.status_code >= 400:
            body = r.json()
            print(f'    {json.dumps(body)[:200]}')
        return r
    except Exception as e:
        print(f'  ? {desc}: ERROR - {e}')
        return None

# Login first
lr = requests.post(f'{BASE}/api/auth/login', json={'username':'superadmin','password':'admin123'})
if lr.status_code != 200:
    print('LOGIN FAILED - cannot proceed')
    exit()
token = lr.json()['access_token']
h['Authorization'] = f'Bearer {token}'

print('\n=== CORE API CHECKS ===')
test('List students', 'GET', '/api/students/', headers=h)
test('List teachers', 'GET', '/api/teachers/', headers=h)
test('List classes', 'GET', '/api/classes/', headers=h)
test('List fees', 'GET', '/api/fees/', headers=h)
test('List exams', 'GET', '/api/exams/', headers=h)
test('List notifications', 'GET', '/api/notifications/', headers=h)
test('List sections', 'GET', '/api/classes/sections', headers=h)
test('List subjects', 'GET', '/api/classes/subjects', headers=h)
test('List assignments', 'GET', '/api/classes/assignments', headers=h)
test('List users', 'GET', '/api/users/', headers=h)

print('\n=== FILTER TESTS ===')
test('Fees by class_id', 'GET', '/api/fees/?class_id=5', headers=h)
test('Fees by search (student ID)', 'GET', '/api/fees/?search=SCH', headers=h)
test('Fees by status', 'GET', '/api/fees/?status=pending', headers=h)

print('\n=== STUDENT FLOW ===')
r = test('Add student', 'POST', '/api/students/', 
         headers=h, 
         json={'first_name':'Test','last_name':'User','class_id':5,
               'date_of_birth':'2010-01-01','gender':'MALE','admission_date':'2026-06-01'})
if r and r.status_code == 200:
    sid = r.json().get('student',{}).get('id')
    if sid:
        test('Delete student', 'DELETE', f'/api/students/{sid}', headers=h)

print('\n=== PAYMENT CONFIG ===')
test('Payment config', 'GET', '/api/payments/config', headers=h)
test('Demo pay', 'POST', '/api/payments/demo-pay', headers=h, json={'fee_id':1})

print('\n=== AUDIT LOG ===')
test('Audit log', 'GET', '/api/audit-log/', headers=h)

print('\n=== DONE ===')
