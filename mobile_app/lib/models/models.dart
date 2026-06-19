class Student {
  final int id;
  final String studentId;
  final String firstName;
  final String lastName;
  final String? className;
  final String? section;
  final String? photo;
  final bool isActive;

  Student({
    required this.id,
    required this.studentId,
    required this.firstName,
    required this.lastName,
    this.className,
    this.section,
    this.photo,
    this.isActive = true,
  });

  String get fullName => '$firstName $lastName';

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      id: json['id'] ?? 0,
      studentId: json['student_id'] ?? '',
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      className: json['class_name'],
      section: json['section_name'],
      photo: json['photo'],
      isActive: json['is_active'] ?? true,
    );
  }
}

class AttendanceRecord {
  final int id;
  final String date;
  final String status;

  AttendanceRecord({required this.id, required this.date, required this.status});

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] ?? 0,
      date: json['date'] ?? '',
      status: json['status'] ?? '',
    );
  }
}

class FeeRecord {
  final int id;
  final String feeType;
  final double amount;
  final double paidAmount;
  final String dueDate;
  final String status;

  FeeRecord({
    required this.id, required this.feeType, required this.amount,
    required this.paidAmount, required this.dueDate, required this.status,
  });

  double get balance => amount - paidAmount;

  factory FeeRecord.fromJson(Map<String, dynamic> json) {
    return FeeRecord(
      id: json['id'] ?? 0,
      feeType: json['fee_type'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      paidAmount: (json['paid_amount'] ?? 0).toDouble(),
      dueDate: json['due_date'] ?? '',
      status: json['status'] ?? '',
    );
  }
}

class ExamResult {
  final String subject;
  final double marks;
  final double maxMarks;
  final String? grade;

  ExamResult({
    required this.subject, required this.marks,
    required this.maxMarks, this.grade,
  });

  factory ExamResult.fromJson(Map<String, dynamic> json) {
    return ExamResult(
      subject: json['subject'] ?? '',
      marks: (json['marks'] ?? 0).toDouble(),
      maxMarks: (json['max_marks'] ?? 100).toDouble(),
      grade: json['grade'],
    );
  }
}

class TimetableEntry {
  final String subject;
  final String? teacher;
  final String startTime;
  final String endTime;
  final String? room;

  TimetableEntry({
    required this.subject, this.teacher,
    required this.startTime, required this.endTime, this.room,
  });

  factory TimetableEntry.fromJson(Map<String, dynamic> json) {
    return TimetableEntry(
      subject: json['subject'] ?? '',
      teacher: json['teacher'],
      startTime: json['start_time'] ?? '',
      endTime: json['end_time'] ?? '',
      room: json['room'],
    );
  }
}

class Notification {
  final int id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final String createdAt;

  Notification({
    required this.id, required this.title, required this.message,
    required this.type, this.isRead = false, required this.createdAt,
  });

  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: json['notification_type'] ?? '',
      isRead: json['is_read'] ?? false,
      createdAt: json['created_at'] ?? '',
    );
  }
}
