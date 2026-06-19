# School ERP System - API Documentation

## Base URL
`http://localhost:8000` (local) or `https://your-domain.com` (production)

## Authentication
All API endpoints (except login/register) require a JWT Bearer token.

```
Authorization: Bearer <access_token>
```

### Auth Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/login | User login | No |
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/refresh | Refresh access token | No |
| GET | /api/auth/me | Get current user | Yes |
| PUT | /api/auth/me | Update profile | Yes |
| POST | /api/auth/change-password | Change password | Yes |
| POST | /api/auth/forgot-password | Request reset link | No |
| POST | /api/auth/reset-password | Reset password | No |
| GET | /api/auth/users | List all users | Admin+ |
| DELETE | /api/auth/users/{id} | Delete user | Super Admin |

### Dashboard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Get dashboard statistics |
| GET | /api/dashboard/attendance-chart | Attendance trend data |
| GET | /api/dashboard/fee-chart | Fee collection chart data |
| GET | /api/dashboard/admission-growth | Year-wise admission data |
| GET | /api/dashboard/class-performance | Class-wise performance |
| GET | /api/dashboard/recent-activities | Recent activities log |

### Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students/ | List students (paginated, filterable) |
| GET | /api/students/{id} | Get student details |
| POST | /api/students/ | Create student |
| PUT | /api/students/{id} | Update student |
| DELETE | /api/students/{id} | Deactivate student |
| POST | /api/students/{id}/photo | Upload student photo |
| GET | /api/students/{id}/transfer-certificate | Get TC |

### Teacher Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/teachers/ | List teachers |
| GET | /api/teachers/{id} | Get teacher details |
| POST | /api/teachers/ | Create teacher |
| PUT | /api/teachers/{id} | Update teacher |
| DELETE | /api/teachers/{id} | Deactivate teacher |
| POST | /api/teachers/assign-subject | Assign subject to teacher |
| GET | /api/teachers/{id}/subjects | Get teacher's subjects |
| PUT | /api/teachers/{id}/assign-class-teacher | Assign as class teacher |

### Class & Subject Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/classes/ | List classes |
| POST | /api/classes/ | Create class |
| PUT | /api/classes/{id} | Update class |
| DELETE | /api/classes/{id} | Deactivate class |
| GET | /api/classes/sections | List sections |
| POST | /api/classes/sections | Create section |
| DELETE | /api/classes/sections/{id} | Delete section |
| GET | /api/classes/subjects | List subjects |
| POST | /api/classes/subjects | Create subject |
| PUT | /api/classes/subjects/{id} | Update subject |
| DELETE | /api/classes/subjects/{id} | Deactivate subject |
| POST | /api/classes/assign-subject | Assign subject to teacher |
| GET | /api/classes/assignments | List all assignments |

### Attendance Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/attendance/ | Mark single attendance |
| POST | /api/attendance/bulk | Bulk mark attendance |
| GET | /api/attendance/ | List attendance records |
| GET | /api/attendance/summary | Monthly summary |
| GET | /api/attendance/student/{id} | Student attendance history |
| POST | /api/attendance/teacher | Mark teacher attendance |
| GET | /api/attendance/analytics | Monthly analytics |

### Fee Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/fees/structures | List fee structures |
| POST | /api/fees/structures | Create fee structure |
| GET | /api/fees/ | List fees (paginated) |
| GET | /api/fees/{id} | Get fee details |
| POST | /api/fees/create | Create fee record |
| POST | /api/fees/generate-monthly | Generate monthly fees |
| POST | /api/fees/pay | Record payment |
| GET | /api/fees/{student_id}/dues | Student dues |
| GET | /api/fees/{fee_id}/receipt | Download PDF receipt |

### Exam & Result Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/exams/ | List exams |
| GET | /api/exams/{id} | Get exam details |
| POST | /api/exams/ | Create exam |
| PUT | /api/exams/{id} | Update exam |
| DELETE | /api/exams/{id} | Delete exam |
| POST | /api/exams/subjects | Add subject to exam |
| GET | /api/exams/{id}/subjects | Get exam subjects |
| POST | /api/exams/results | Create result |
| PUT | /api/exams/results/{id} | Update result |
| GET | /api/exams/{exam_id}/results | Get exam results |
| GET | /api/exams/student/{student_id}/results | Student results |
| GET | /api/exams/{exam_id}/rankings | Exam rankings |
| GET | /api/exams/{exam_id}/report-card/{student_id} | Download PDF report card |

### Timetable Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/timetable/ | List timetable entries |
| POST | /api/timetable/ | Create entry |
| PUT | /api/timetable/{id} | Update entry |
| DELETE | /api/timetable/{id} | Delete entry |
| GET | /api/timetable/teacher/{id} | Teacher's timetable |

### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications/ | List user notifications |
| POST | /api/notifications/ | Create notification |
| POST | /api/notifications/send-bulk | Bulk send notification |
| PUT | /api/notifications/{id}/read | Mark as read |
| PUT | /api/notifications/read-all | Mark all read |
| GET | /api/notifications/parent/{student_id} | Parent notifications |

### Report Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/students | Student report (PDF/Excel) |
| GET | /api/reports/attendance | Attendance report (PDF/Excel) |
| GET | /api/reports/fees | Fee report (PDF/Excel) |
| GET | /api/reports/exams | Exam report (PDF/Excel) |

## Response Format

### Success Response
```json
{
  "students": [...],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "total_pages": 5
}
```

### Error Response
```json
{
  "detail": "Error message description"
}
```

## Query Parameters

Common pagination parameters:
- `page` (int, default: 1)
- `per_page` (int, default: 20)
- `search` (string, for text search)
- `class_id` (int, filter by class)
- `section_id` (int, filter by section)
- `status` (string, filter by status)

## Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per user

## WebSocket (Future)
- Real-time notifications
- Live attendance updates
