import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate, getStatusBadge } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const statusOptions = ['present', 'absent', 'late'];
const canMarkRoles = ['super_admin', 'admin', 'principal', 'teacher'];

export default function Attendance() {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const canMark = canMarkRoles.includes(user?.role);
  const [studentId, setStudentId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [filterSections, setFilterSections] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState([]);
  const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [analytics, setAnalytics] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);

  useEffect(() => {
    if (!canMark) setView('summary');
  }, [canMark]);

  useEffect(() => {
    if (isStudent) {
      api.get('/api/students/my-profile').then(res => {
        setStudentId(res.data.id);
      }).catch(() => toast.error('Failed to load profile'));
    } else {
      const loadClasses = isTeacher
        ? api.get('/api/teachers/my-classes')
        : api.get('/api/classes/');
      loadClasses.then(res => {
        setClasses(res.data);
        if (isTeacher && res.data.length > 0) {
          setClassId(String(res.data[0].id));
        }
      }).catch(() => toast.error('Failed to load classes'));
    }
  }, [isStudent, isTeacher]);

  useEffect(() => {
    if (!isStudent && classId) {
      api.get('/api/classes/sections?class_id=' + classId)
        .then(res => setFilterSections(res.data))
        .catch(() => setFilterSections([]));
    } else if (!isStudent) {
      setFilterSections([]);
      setSectionId('');
    }
  }, [classId, isStudent]);

  const fetchStudentAttendanceSummary = useCallback(async () => {
    if (!studentId || !summaryMonth) return;
    setLoading(true);
    try {
      const [year, month] = summaryMonth.split('-');
      const res = await api.get('/api/attendance/student/' + studentId + '?month=' + parseInt(month) + '&year=' + parseInt(year));
      const records = res.data.records || res.data || [];
      setStudentRecords(records);
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const total = records.length;
      setSummary([{
        student_id: 0, student_name: 'You',
        present, absent, late, total,
        percentage: total > 0 ? Math.round((present + late) / total * 100) : 0
      }]);
    } catch {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  }, [studentId, summaryMonth]);

  const fetchSummary = useCallback(async () => {
    if (isStudent) {
      fetchStudentAttendanceSummary();
      return;
    }
    if (!classId || !summaryMonth) return;
    setLoading(true);
    try {
      const [year, month] = summaryMonth.split('-');
      const params = { class_id: classId, year: parseInt(year), month: parseInt(month) };
      if (sectionId) params.section_id = sectionId;
      const res = await api.get('/api/attendance/summary', { params });
      setSummary(res.data);
    } catch {
      toast.error('Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, summaryMonth, isStudent, fetchStudentAttendanceSummary]);

  useEffect(() => {
    if (view === 'summary') fetchSummary();
  }, [fetchSummary, view]);

  useEffect(() => {
    if (isStudent) {
      if (view === 'analytics' && studentRecords.length > 0) {
        const present = studentRecords.filter(r => r.status === 'present').length;
        const absent = studentRecords.filter(r => r.status === 'absent').length;
        const late = studentRecords.filter(r => r.status === 'late').length;
        const total = studentRecords.length;
        setAnalytics({
          overall_percentage: total > 0 ? Math.round((present + late) / total * 100) : 0,
          total_present: present + late,
          total_absent: absent
        });
      }
    } else if (view === 'analytics') {
      api.get('/api/attendance/analytics?class_id=' + classId)
        .then(res => setAnalytics(res.data))
        .catch(() => toast.error('Failed to load analytics'));
    }
  }, [view, classId, isStudent, studentRecords]);

  const fetchStudents = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      let studentUrl = '/api/students/?class_id=' + classId;
      let attUrl = '/api/attendance/?class_id=' + classId + '&date_from=' + date + '&date_to=' + date;
      if (sectionId) {
        studentUrl += '&section_id=' + sectionId;
        attUrl += '&section_id=' + sectionId;
      }
      const [studRes, attRes] = await Promise.all([
        api.get(studentUrl),
        api.get(attUrl)
      ]);
      const studentsData = studRes.data.students || studRes.data.results || studRes.data || [];
      setStudents(studentsData);
      const records = attRes.data.records || [];
      const attMap = {};
      records.forEach(r => { attMap[r.student_id] = r.status.toLowerCase(); });
      const init = {};
      studentsData.forEach(s => { init[s.id] = attMap[s.id] || 'present'; });
      setAttendance(init);
    } catch {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, date]);

  useEffect(() => {
    if (view === 'mark') fetchStudents();
  }, [fetchStudents, view]);

  const handleAttendanceChange = (studentId, value) => {
    setAttendance(prev => ({ ...prev, [studentId]: value }));
  };

  const handleBulkMark = async (status) => {
    const updated = {};
    students.forEach(s => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId) { toast.error('Please select a class'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const records = students.map(s => ({
        student_id: s.id, class_id: parseInt(classId),
        date: date, status: attendance[s.id] || 'present'
      }));
      await api.post('/api/attendance/bulk', { class_id: parseInt(classId), date, records });
      toast.success('Attendance marked successfully');
    } catch {
      toast.error('Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMarkAttendance = () => (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-56">
          <select value={classId} onChange={e => setClassId(e.target.value)} className="input-field" required>
            <option value="">Select Class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required />
        </div>
        <div className="flex gap-2 items-center">
          <button type="button" onClick={() => handleBulkMark('present')} className="btn-secondary text-sm">All Present</button>
          <button type="button" onClick={() => handleBulkMark('absent')} className="btn-secondary text-sm">All Absent</button>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">#</th>
              <th className="table-cell">Student</th>
              <th className="table-cell text-center">Present</th>
              <th className="table-cell text-center">Absent</th>
              <th className="table-cell text-center">Late</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="table-cell text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                  </div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-cell text-center text-gray-400 py-8">
                  {classId ? 'No students found' : 'Select a class to view students'}
                </td>
              </tr>
            ) : students.map((s, idx) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="table-cell">{idx + 1}</td>
                <td className="table-cell font-medium">{s.first_name + ' ' + s.last_name}</td>
                {statusOptions.map(opt => (
                  <td key={opt} className="table-cell text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name={'att_' + s.id}
                        value={opt}
                        checked={attendance[s.id] === opt}
                        onChange={() => handleAttendanceChange(s.id, opt)}
                        className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <div className="mt-4 text-right">
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Attendance'}</button>
        </div>
      )}
    </form>
  );

  const renderSummaryFilters = () => {
    if (isStudent) {
      return (
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-48">
            <input type="month" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)} className="input-field" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-56">
          <select value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); }} className="input-field" required>
            <option value="">Select Class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <select value={sectionId} onChange={e => setSectionId(e.target.value)} className="input-field" disabled={!classId}>
            <option value="">All Sections</option>
            {filterSections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <input type="month" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)} className="input-field" />
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div>
      {renderSummaryFilters()}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">Student</th>
              <th className="table-cell text-center">Present</th>
              <th className="table-cell text-center">Absent</th>
              <th className="table-cell text-center">Late</th>
              <th className="table-cell text-center">Total</th>
              <th className="table-cell text-center">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="table-cell text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" />
                </td>
              </tr>
            ) : summary.length === 0 ? (
              <tr>
                <td colSpan="6" className="table-cell text-center text-gray-400 py-8">No attendance data found</td>
              </tr>
            ) : summary.map(s => (
              <tr key={s.student_id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{s.student_name}</td>
                <td className="table-cell text-center text-green-600 font-medium">{s.present}</td>
                <td className="table-cell text-center text-red-600 font-medium">{s.absent}</td>
                <td className="table-cell text-center text-amber-600 font-medium">{s.late}</td>
                <td className="table-cell text-center font-medium">{s.total}</td>
                <td className="table-cell text-center font-medium">{s.percentage || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div>
      {!isStudent && (
        <div className="flex gap-4 mb-6">
          <div className="w-56">
            <select value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); }} className="input-field" required>
              <option value="">Select Class</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} className="input-field" disabled={!classId}>
              <option value="">All Sections</option>
              {filterSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      {analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600">{analytics.overall_percentage || 0}%</p>
            <p className="text-sm text-gray-500">Overall Attendance</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{analytics.total_present || 0}</p>
            <p className="text-sm text-gray-500">Total Present</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-600">{analytics.total_absent || 0}</p>
            <p className="text-sm text-gray-500">Total Absent</p>
          </div>
        </div>
      ) : (
        <div className="card text-center py-8 text-gray-400">
          {isStudent || classId ? 'No analytics data available' : 'Select a class to view analytics'}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="page-title">Attendance</h1>
      <div className="flex gap-2 mb-6">
        {canMark && (
          <button
            onClick={() => setView('mark')}
            className={'px-4 py-2 rounded-lg text-sm font-medium ' + (view === 'mark' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            Mark Attendance
          </button>
        )}
        <button
          onClick={() => setView('summary')}
          className={'px-4 py-2 rounded-lg text-sm font-medium ' + (view === 'summary' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
        >
          Monthly Summary
        </button>
        <button
          onClick={() => setView('analytics')}
          className={'px-4 py-2 rounded-lg text-sm font-medium ' + (view === 'analytics' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
        >
          Analytics
        </button>
      </div>
      <div className="card">
        {view === 'mark' && canMark && renderMarkAttendance()}
        {view === 'summary' && renderSummary()}
        {view === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
}
