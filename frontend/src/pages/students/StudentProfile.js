import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate, getStatusBadge, calculateAge } from '../../utils/helpers';

export default function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [feeDues, setFeeDues] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLogin, setEditingLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginSaving, setLoginSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studRes, attRes, feeRes, resRes] = await Promise.all([
          api.get('/api/students/' + id + '/'),
          api.get('/api/attendance/student/' + id + '/'),
          api.get('/api/fees/' + id + '/dues'),
          api.get('/api/exams/student/' + id + '/results'),
        ]);
        setStudent(studRes.data);
        setAttendance(attRes.data.records || attRes.data || []);
        setFeeDues(feeRes.data);
        const resultsData = resRes.data;
        if (typeof resultsData === 'object' && !Array.isArray(resultsData)) {
          const flattened = [];
          Object.entries(resultsData).forEach(([examName, examData]) => {
            if (examData.subjects) {
              examData.subjects.forEach((s, idx) => {
                flattened.push({ id: idx, exam_name: examName, subject_name: s.subject, marks_obtained: s.marks, total_marks: s.max_marks, grade: s.grade, status: 'Completed' });
              });
            }
          });
          setResults(flattened);
        } else {
          setResults(resultsData);
        }
      } catch (err) {
        toast.error('Failed to load student profile');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSaveLogin = async () => {
    if (!loginForm.username) { toast.error('Username is required'); return; }
    setLoginSaving(true);
    try {
      const res = await api.put('/api/students/' + id + '/update-login', loginForm);
      toast.success('Login updated! Username: ' + res.data.username);
      setEditingLogin(false);
      setStudent(prev => ({ ...prev, username: res.data.username }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update login');
    } finally {
      setLoginSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (!student) {
    return <div className="text-center py-12 text-gray-500">Student not found</div>;
  }

  const attendancePercent = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present' || a.status === 'late').length / attendance.length) * 100)
    : 0;

  const feeList = feeDues?.fees || [];
  const totalFees = feeList.reduce((sum, f) => sum + (f.amount || 0), 0);
  const paidFees = feeList.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
  const pendingFees = totalFees - paidFees;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/students" className="text-gray-400 hover:text-gray-600">&larr; Back</Link>
        <h1 className="page-title mb-0">Student Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-2xl font-bold shrink-0">
              {(student.first_name || student.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">{student.first_name} {student.last_name}</h2>
              <p className="text-sm text-gray-500">ID: {student.student_id || student.id}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
                <span><strong>Class:</strong> {student.class_name || 'N/A'}</span>
                <span><strong>Section:</strong> {student.section_name || 'N/A'}</span>
                <span><strong>Gender:</strong> {student.gender}</span>
                <span><strong>Age:</strong> {calculateAge(student.date_of_birth)} yrs</span>
                <span><strong>DOB:</strong> {formatDate(student.date_of_birth)}</span>
                <span><strong>Phone:</strong> {student.phone}</span>
                <span><strong>Email:</strong> {student.email || '-'}</span>
                <span>
                  <strong>Status:</strong>{' '}
                  <span className={getStatusBadge(student.is_active ? 'active' : 'inactive')}>{student.is_active ? 'Active' : 'Inactive'}</span>
                </span>
              </div>
              {student.username && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Login Credentials</p>
                  {editingLogin ? (
                    <>
                      <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="input-field text-sm mb-2" placeholder="Username" />
                      <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="input-field text-sm mb-2" placeholder="New password (leave blank to keep)" />
                      <div className="flex gap-2 mt-1">
                        <button onClick={handleSaveLogin} disabled={loginSaving} className="btn-primary text-xs py-1 px-3">{loginSaving ? 'Saving...' : 'Save'}</button>
                        <button onClick={() => setEditingLogin(false)} className="btn-secondary text-xs py-1 px-3">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600"><strong>Username:</strong> {student.username}</p>
                      <p className="text-sm text-gray-600"><strong>Password:</strong> student123</p>
                      <button onClick={() => { setLoginForm({ username: student.username, password: '' }); setEditingLogin(true); }} className="text-xs text-primary-600 hover:text-primary-800 mt-1">Edit Login</button>
                    </>
                  )}
                </div>
              )}
              {student.address && <p className="text-sm text-gray-500 mt-2"><strong>Address:</strong> {student.address}</p>}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Attendance</p>
              <p className={'text-2xl font-bold ' + (attendancePercent >= 75 ? 'text-green-600' : 'text-red-600')}>{attendancePercent}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Fees</p>
              <p className="text-2xl font-bold text-gray-800">{'\u20B9'}{totalFees.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Paid</p>
              <p className="text-2xl font-bold text-green-600">{'\u20B9'}{paidFees.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Pending</p>
              <p className={'text-2xl font-bold ' + (pendingFees > 0 ? 'text-red-600' : 'text-green-600')}>{'\u20B9'}{pendingFees.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Attendance Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Date</th>
                  <th className="table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.length === 0 && (
                  <tr><td colSpan="2" className="table-cell text-center text-gray-400">No attendance records</td></tr>
                )}
                {attendance.slice(0, 10).map(a => (
                  <tr key={a.id}>
                    <td className="table-cell">{formatDate(a.date)}</td>
                    <td className="table-cell"><span className={getStatusBadge(a.status)}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Fee Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Fee Type</th>
                  <th className="table-cell">Amount</th>
                  <th className="table-cell">Due Date</th>
                  <th className="table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feeList.length === 0 && (
                  <tr><td colSpan="4" className="table-cell text-center text-gray-400">No fee records</td></tr>
                )}
                {feeList.map(d => (
                  <tr key={d.id}>
                    <td className="table-cell">{d.fee_type || d.name}</td>
                    <td className="table-cell">{'\u20B9'}{(d.amount || 0).toLocaleString()}</td>
                    <td className="table-cell">{formatDate(d.due_date)}</td>
                    <td className="table-cell"><span className={getStatusBadge(d.status)}>{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Exam Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="table-cell">Exam</th>
                <th className="table-cell">Subject</th>
                <th className="table-cell">Marks</th>
                <th className="table-cell">Grade</th>
                <th className="table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.length === 0 && (
                <tr><td colSpan="5" className="table-cell text-center text-gray-400">No results available</td></tr>
              )}
              {results.map(r => (
                <tr key={r.id}>
                  <td className="table-cell">{r.exam_name}</td>
                  <td className="table-cell">{r.subject_name}</td>
                  <td className="table-cell">{r.marks_obtained}/{r.total_marks}</td>
                  <td className="table-cell font-medium">{r.grade || '-'}</td>
                  <td className="table-cell"><span className={getStatusBadge(r.status || 'active')}>{r.status || 'Completed'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
