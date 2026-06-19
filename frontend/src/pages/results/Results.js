import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const calculateGrade = (pct) => {
  if (pct >= 90) return 'A';
  if (pct >= 75) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 45) return 'D';
  return 'F';
};

const getGradeBadge = (grade) => {
  if (grade === 'A') return 'badge-success';
  if (grade === 'B' || grade === 'C') return 'badge-warning';
  return 'badge-danger';
};

function TeacherResultsView() {
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/classes/').then(r => setClasses(Array.isArray(r.data) ? r.data : r.data.classes || []));
    api.get('/api/exams/').then(r => setExams(r.data.exams || []));
  }, []);

  const fetchStudents = useCallback(async () => {
    if (!selectedClassId) { setStudents([]); return; }
    try {
      const r = await api.get('/api/students/?class_id=' + selectedClassId);
      setStudents(r.data.students || []);
    } catch { setStudents([]); }
  }, [selectedClassId]);

  const fetchSubjects = useCallback(async () => {
    if (!selectedExamId) { setSubjects([]); return; }
    try {
      const r = await api.get('/api/exams/' + selectedExamId + '/subjects');
      setSubjects(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch { setSubjects([]); }
  }, [selectedExamId]);

  const fetchMarks = useCallback(async () => {
    if (!selectedExamId || !selectedClassId) return;
    try {
      const r = await api.get('/api/exams/' + selectedExamId + '/results?class_id=' + selectedClassId);
      const data = Array.isArray(r.data) ? r.data : r.data.results || [];
      const mm = {};
      data.forEach(r2 => { const key = r2.student_id + '_' + (r2.subject_id || r2.subject); mm[key] = r2.marks_obtained || r2.marks; });
      setMarks(mm);
    } catch { setMarks({}); }
  }, [selectedExamId, selectedClassId]);

  useEffect(() => {
    if (selectedExamId && selectedClassId) {
      setLoading(true);
      Promise.all([fetchStudents(), fetchSubjects(), fetchMarks()]).finally(() => setLoading(false));
    } else {
      setStudents([]); setSubjects([]); setMarks({});
    }
  }, [selectedExamId, selectedClassId, fetchStudents, fetchSubjects, fetchMarks]);

  const handleChange = (studentId, subjectId, value) => {
    const key = studentId + '_' + subjectId;
    setMarks(p => ({ ...p, [key]: value === '' ? '' : Number(value) }));
  };

  const getMark = (studentId, subjectId) => {
    const key = studentId + '_' + subjectId;
    return marks[key] !== undefined ? marks[key] : '';
  };

  const getStudentTotal = (sid) => subjects.reduce((s, sub) => { const v = marks[sid + '_' + sub.id]; return s + (v && !isNaN(v) ? Number(v) : 0); }, 0);
  const getMaxTotal = () => subjects.reduce((s, sub) => s + (sub.max_marks || 100), 0);
  const getPct = (sid) => { const t = getStudentTotal(sid), m = getMaxTotal(); return m === 0 ? 0 : Math.round((t / m) * 100 * 100) / 100; };

  const handleSave = async () => {
    if (!selectedExamId || !selectedClassId) { toast.error('Select exam and class'); return; }
    setSaving(true);
    try {
      const results = [];
      students.forEach(st => subjects.forEach(sub => {
        const key = st.id + '_' + sub.id;
        const v = marks[key];
        if (v !== '' && v !== undefined && !isNaN(v)) results.push({ student_id: st.id, subject_id: sub.id, marks_obtained: Number(v) });
      }));
      await api.post('/api/exams/results/batch', { exam_id: parseInt(selectedExamId), results });
      toast.success('Results saved');
    } catch (err) { toast.error(err.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-56">
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="w-56">
          <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="input-field">
            <option value="">Select Exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></div>
      ) : subjects.length > 0 && students.length > 0 ? (
        <div>
          <div className="card p-0 overflow-x-auto mb-4">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell sticky left-0 bg-gray-50 z-10">#</th>
                  <th className="table-cell sticky left-12 bg-gray-50 z-10 min-w-[160px]">Student</th>
                  {subjects.map(s => <th key={s.id} className="table-cell text-center min-w-[90px]"><div className="text-xs">{s.subject_name}</div><div className="text-xs font-normal text-gray-400">({s.max_marks || 100})</div></th>)}
                  <th className="table-cell text-center min-w-[60px]">Total</th>
                  <th className="table-cell text-center min-w-[60px]">%</th>
                  <th className="table-cell text-center min-w-[50px]">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((st, idx) => (
                  <tr key={st.id} className="table-row">
                    <td className="table-cell sticky left-0 bg-white z-10">{idx + 1}</td>
                    <td className="table-cell sticky left-12 bg-white z-10 font-medium">{st.name || st.first_name + ' ' + (st.last_name || '')}</td>
                    {subjects.map(s => (
                      <td key={s.id} className="table-cell text-center p-1">
                        <input type="number" min="0" max={s.max_marks || 100} value={getMark(st.id, s.id)}
                          onChange={e => handleChange(st.id, s.id, e.target.value)}
                          className="w-16 text-center input-field py-1 px-1 text-sm" />
                      </td>
                    ))}
                    <td className="table-cell text-center font-semibold text-primary-600">{getStudentTotal(st.id)}</td>
                    <td className="table-cell text-center font-medium">{getPct(st.id)}%</td>
                    <td className="table-cell text-center"><span className={getGradeBadge(calculateGrade(getPct(st.id)))}>{calculateGrade(getPct(st.id))}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Results'}</button>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12 text-gray-400">Select a class and exam to view results</div>
      )}
    </div>
  );
}

function StudentResultsView() {
  const { user } = useAuth();
  const [myResults, setMyResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/exams/my-results').then(r => setMyResults(r.data))
      .catch(() => setMyResults({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" /></div>;
  if (!myResults || Object.keys(myResults).length === 0) return <div className="card text-center py-12 text-gray-400">No results found</div>;

  const renderExam = (results) => Object.entries(results).map(([examName, examData]) => {
    const total = examData.subjects.reduce((s, sub) => s + (sub.marks || 0), 0);
    const max = examData.subjects.reduce((s, sub) => s + (sub.max_marks || 0), 0);
    const pct = max > 0 ? Math.round((total / max) * 10000) / 100 : 0;
    return (
      <div key={examName} className="card mb-4">
        <h3 className="text-lg font-semibold mb-3">{examName}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="table-cell">Subject</th><th className="table-cell text-center">Marks</th><th className="table-cell text-center">Max</th><th className="table-cell text-center">Grade</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {examData.subjects.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{s.subject}</td>
                  <td className="table-cell text-center">{s.marks}</td>
                  <td className="table-cell text-center">{s.max_marks}</td>
                  <td className="table-cell text-center"><span className={getGradeBadge(s.grade)}>{s.grade}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-gray-50 font-semibold"><td className="table-cell">Total</td><td className="table-cell text-center text-primary-600">{total}</td><td className="table-cell text-center">{max}</td><td className="table-cell text-center"><span className={getGradeBadge(calculateGrade(pct))}>{calculateGrade(pct)}</span></td></tr></tfoot>
          </table>
        </div>
        <div className="mt-2 text-sm text-gray-500 text-right">Percentage: {pct}%</div>
      </div>
    );
  });

  if (user?.role === 'parent') {
    return Object.entries(myResults).map(([childId, childData]) => (
      <div key={childId} className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">{childData.student_name}</h2>
        {renderExam(childData.results)}
      </div>
    ));
  }
  return renderExam(myResults);
}

export default function Results() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="page-title">Results</h1>
      {user?.role === 'teacher' ? <TeacherResultsView /> : <StudentResultsView />}
    </div>
  );
}
