import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../context/AuthContext';

export default function Exams() {
  const { confirm, ConfirmModal } = useConfirm();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingSubject, setSubmittingSubject] = useState(false);
  const [form, setForm] = useState({
    name: '', class_id: '', exam_type: '', start_date: '', end_date: ''
  });
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examSubjects, setExamSubjects] = useState([]);
  const [examSubjectOptions, setExamSubjectOptions] = useState([]);
  const [subjectForm, setSubjectForm] = useState({ subject_id: '', exam_date: '', max_marks: '100', pass_marks: '35' });

  useEffect(() => {
    if (isTeacher) {
      api.get('/api/teachers/my-classes').then(res => {
        const cls = Array.isArray(res.data) ? res.data : (res.data.classes || res.data.results || []);
        setClasses(cls);
        if (cls.length > 0) setClassFilter(String(cls[0].id));
      }).catch(() => {});
    } else {
      api.get('/api/classes/').then(res => setClasses(res.data)).catch(() => {});
    }
  }, [isTeacher]);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/exams/';
      if (classFilter) url += '?class_id=' + classFilter;
      const res = await api.get(url);
      setExams(res.data.exams || []);
    } catch {
      toast.error('Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', class_id: '', exam_type: '', start_date: '', end_date: '' });
    setShowModal(true);
  };

  const openEdit = (exam) => {
    setEditing(exam);
    setForm({
      name: exam.name, class_id: exam.class_id, exam_type: exam.exam_type || '',
      start_date: exam.start_date || '', end_date: exam.end_date || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put('/api/exams/' + editing.id + '/', form);
        toast.success('Exam updated');
      } else {
        await api.post('/api/exams/', form);
        toast.success('Exam created');
      }
      setShowModal(false);
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm('Delete Exam', 'Are you sure you want to delete this exam?')) return;
    try {
      await api.delete('/api/exams/' + id + '/');
      toast.success('Exam deleted');
      fetchExams();
    } catch {
      toast.error('Delete failed');
    }
  };

  const openSubjectAssignment = async (exam) => {
    setSelectedExam(exam);
    setSubjectForm({ subject_id: '', exam_date: '', max_marks: '100', pass_marks: '35' });
    setShowSubjectModal(true);
    try {
      const [subRes, examSubRes] = await Promise.all([
        api.get('/api/classes/subjects?class_id=' + exam.class_id),
        api.get('/api/exams/' + exam.id + '/subjects'),
      ]);
      setExamSubjectOptions(subRes.data);
      setExamSubjects(Array.isArray(examSubRes.data) ? examSubRes.data : examSubRes.data.results || []);
    } catch {
      setExamSubjectOptions([]);
      setExamSubjects([]);
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExam || submittingSubject || !subjectForm.subject_id) return;
    setSubmittingSubject(true);
    try {
      await api.post('/api/exams/subjects', {
        exam_id: selectedExam.id,
        subject_id: parseInt(subjectForm.subject_id),
        exam_date: subjectForm.exam_date,
        max_marks: parseInt(subjectForm.max_marks),
        pass_marks: parseInt(subjectForm.pass_marks),
      });
      toast.success('Subject assigned');
      setSubjectForm({ subject_id: '', exam_date: '', max_marks: '100', pass_marks: '35' });
      const res = await api.get('/api/exams/' + selectedExam.id + '/subjects');
      setExamSubjects(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      toast.error('Failed to assign subject');
    } finally {
      setSubmittingSubject(false);
    }
  };

  const removeSubject = async (subjectId) => {
    if (!await confirm('Remove Subject', 'Remove this subject from the exam?')) return;
    try {
      await api.delete('/api/exams/subjects/' + subjectId + '/');
      toast.success('Subject removed');
      setExamSubjects(prev => prev.filter(s => s.id !== subjectId));
    } catch {
      toast.error('Failed to remove subject');
    }
  };

  const filtered = exams.filter(e => !classFilter || e.class_id === parseInt(classFilter));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Exams</h1>
        <button onClick={openAdd} className="btn-primary">+ Create Exam</button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="w-56">
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="input-field" disabled={isTeacher}>
              <option value="">{isTeacher ? 'Your Class' : 'All Classes'}</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">Exam Name</th>
              <th className="table-cell">Class</th>
              <th className="table-cell">Term</th>
              <th className="table-cell">Year</th>
              <th className="table-cell">Start Date</th>
              <th className="table-cell">End Date</th>
              <th className="table-cell">Subjects</th>
              <th className="table-cell text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="table-cell text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-cell text-center text-gray-400 py-8">No exams found</td>
              </tr>
            ) : filtered.map(exam => (
              <tr key={exam.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{exam.name}</td>
                <td className="table-cell">{exam.class_name || '-'}</td>
                <td className="table-cell">{exam.term || '-'}</td>
                <td className="table-cell">{exam.academic_year || '-'}</td>
                <td className="table-cell">{exam.start_date ? formatDate(exam.start_date) : '-'}</td>
                <td className="table-cell">{exam.end_date ? formatDate(exam.end_date) : '-'}</td>
                <td className="table-cell">
                  <button
                    onClick={() => openSubjectAssignment(exam)}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    Manage
                  </button>
                </td>
                <td className="table-cell text-right">
                  <button onClick={() => openEdit(exam)} className="text-primary-600 hover:text-primary-800 mr-3">Edit</button>
                  <button onClick={() => handleDelete(exam.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Exam' : 'Create Exam'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Mid Term Examination"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={form.class_id}
                  onChange={e => setForm({ ...form, class_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                <select
                  value={form.exam_type}
                  onChange={e => setForm({ ...form, exam_type: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="midterm">Mid Term</option>
                  <option value="final">Final</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="weekly">Weekly Test</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubjectModal && selectedExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Subjects - {selectedExam.name}</h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <div className="p-6 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Assigned Subjects</h4>
              {examSubjects.length === 0 ? (
                <p className="text-sm text-gray-400">No subjects assigned yet</p>
              ) : (
                <div className="space-y-2">
                  {examSubjects.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                      <div>
                        <span className="font-medium text-sm">{s.subject_name}</span>
                        <span className="text-xs text-gray-500 ml-3">
                          {s.exam_date ? formatDate(s.exam_date) : 'No date'} |
                          Max: {s.max_marks} | Pass: {s.pass_marks}
                        </span>
                      </div>
                      <button
                        onClick={() => removeSubject(s.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubjectSubmit} className="p-6 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700">Add Subject</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={subjectForm.subject_id}
                  onChange={e => setSubjectForm({ ...subjectForm, subject_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Subject</option>
                  {examSubjectOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                <input
                  type="date"
                  value={subjectForm.exam_date}
                  onChange={e => setSubjectForm({ ...subjectForm, exam_date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={subjectForm.max_marks}
                    onChange={e => setSubjectForm({ ...subjectForm, max_marks: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pass Marks</label>
                  <input
                    type="number"
                    min="0"
                    value={subjectForm.pass_marks}
                    onChange={e => setSubjectForm({ ...subjectForm, pass_marks: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="btn-secondary">Close</button>
                <button type="submit" className="btn-primary" disabled={submittingSubject}>{submittingSubject ? 'Adding...' : 'Add Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}
