import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getStatusBadge } from '../../utils/helpers';
import Pagination from '../../components/Pagination';
import useConfirm from '../../hooks/useConfirm';

function parseError(err) {
  if (!err.response) return 'Network error';
  const data = err.response.data;
  if (typeof data === 'string') return data;
  if (data?.detail) {
    if (Array.isArray(data.detail)) return data.detail.map(e => e.msg).join('; ');
    return String(data.detail);
  }
  if (data?.message) return data.message;
  return 'Operation failed';
}

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginTeacher, setLoginTeacher] = useState(null);
  const { confirm, ConfirmModal } = useConfirm();

  const [subjects, setSubjects] = useState([]);

  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: 'Male', date_of_birth: '',
    qualification: '', specialization: '', phone: '', email: '',
    address: '', joining_date: '', class_id: '', subject_id: '', is_class_teacher: false
  });

  const today = new Date().toISOString().split('T')[0];

  const fetchTeachers = useCallback(async () => {
    try {
      const params = { page, per_page: 20 };
      if (classFilter) params.class_id = classFilter;
      if (search) params.search = search;
      const res = await api.get('/api/teachers/', { params });
      setTeachers(res.data.teachers || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalTeachers(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  }, [page, classFilter, search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  useEffect(() => { setPage(1); }, [classFilter]);

  useEffect(() => {
    api.get('/api/classes/').then(res => setClasses(res.data || [])).catch(() => {});
    api.get('/api/classes/subjects').then(res => setSubjects(res.data || [])).catch(() => {});
  }, []);

  const filtered = teachers;

  const resetForm = () => {
    setForm({
      first_name: '', last_name: '', gender: 'Male', date_of_birth: '',
      qualification: '', specialization: '', phone: '', email: '',
      address: '', joining_date: today, class_id: '', subject_id: '', is_class_teacher: false
    });
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      first_name: t.first_name, last_name: t.last_name, gender: t.gender,
      date_of_birth: t.date_of_birth || '',
      qualification: t.qualification || '', specialization: t.specialization || '',
      phone: t.phone, email: t.email || '', address: t.address || '',
      joining_date: t.joining_date || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put('/api/teachers/' + editing.id + '/', {
          first_name: form.first_name, last_name: form.last_name,
          qualification: form.qualification, specialization: form.specialization,
          phone: form.phone, email: form.email
        });
        toast.success('Teacher updated');
        setShowModal(false);
      } else {
        const res = await api.post('/api/teachers/', {
          first_name: form.first_name, last_name: form.last_name,
          gender: form.gender.toUpperCase(),
          date_of_birth: form.date_of_birth || today,
          qualification: form.qualification || null,
          specialization: form.specialization || null,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
          joining_date: form.joining_date || today
        });
        const teacherId = res.data.id;
        if (form.subject_id && form.class_id) {
          await api.post('/api/classes/assign-subject', {
            subject_id: Number(form.subject_id),
            teacher_id: teacherId,
            class_id: Number(form.class_id)
          }).catch(() => {});
        }
        if (form.is_class_teacher && form.class_id) {
          await api.put('/api/teachers/' + teacherId + '/assign-class-teacher?class_id=' + form.class_id)
            .catch(() => {});
        }
        toast.success('Teacher added successfully!');
        setShowModal(false);
      }
      fetchTeachers();
    } catch (err) {
      toast.error(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Delete Teacher', 'Are you sure you want to delete this teacher?');
    if (!ok) return;
    try {
      await api.delete('/api/teachers/' + id + '/');
      toast.success('Teacher deactivated');
      fetchTeachers();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleCreateLogin = async (e) => {
    e.preventDefault();
    try {
      if (loginTeacher.user_id) {
        const res = await api.put('/api/teachers/' + loginTeacher.id + '/update-login', loginForm);
        toast.success('Login updated! Username: ' + res.data.username);
      } else {
        const res = await api.post('/api/teachers/' + loginTeacher.id + '/create-login', loginForm);
        toast.success('Login created! Username: ' + res.data.username);
      }
      setShowLoginModal(false);
      fetchTeachers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update login');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Teachers</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Teacher</button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name, phone or specialization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field flex-1 min-w-[200px]"
          />
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-48 input-field">
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">ID</th>
              <th className="table-cell">Name</th>
              <th className="table-cell">Class</th>
              <th className="table-cell">Subject</th>
              <th className="table-cell">Qualification</th>
              <th className="table-cell">Specialization</th>
              <th className="table-cell">Phone</th>
              <th className="table-cell">Status</th>
              <th className="table-cell text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan="9" className="table-cell text-center text-gray-400 py-8">No teachers found</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{t.teacher_id || t.id}</td>
                <td className="table-cell font-medium text-gray-800">
                  <Link to={'/teachers/' + t.id} className="text-primary-600 hover:underline">{t.first_name} {t.last_name}</Link>
                </td>
                <td className="table-cell">{t.class_name || (t.is_class_teacher ? 'Class ' + t.class_teacher_of : '—')}</td>
                <td className="table-cell">{t.subjects?.[0]?.subject_name || '—'}</td>
                <td className="table-cell">{t.qualification}</td>
                <td className="table-cell">{t.specialization}</td>
                <td className="table-cell">{t.phone}</td>
                <td className="table-cell">
                  <span className={getStatusBadge(t.is_active ? 'active' : 'inactive')}>{t.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="table-cell text-right">
                  <button onClick={() => openEdit(t)} className="text-primary-600 hover:text-primary-800 mr-2">Edit</button>
                  <button onClick={() => { setLoginTeacher(t); setLoginForm({ username: t.username || '', password: '' }); setShowLoginModal(true); }} className="text-green-600 hover:text-green-800 mr-2">{t.user_id ? 'Edit Login' : 'Login'}</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={totalTeachers} onPageChange={setPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Teacher' : 'Add Teacher'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="input-field" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="input-field">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                  <input type="text" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input type="text" value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" rows="2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value, subject_id: ''})} className="input-field">
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} className="input-field">
                    <option value="">Select Subject</option>
                    {subjects.filter(s => !form.class_id || Number(s.class_id) === Number(form.class_id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              {!editing && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.is_class_teacher} onChange={e => setForm({...form, is_class_teacher: e.target.checked})} className="rounded" />
                  Class Teacher for selected class
                </label>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal />

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{loginTeacher?.user_id ? 'Edit Login' : 'Create Login'} — {loginTeacher?.first_name} {loginTeacher?.last_name}</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleCreateLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password {loginTeacher?.user_id && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}</label>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="input-field" minLength={loginTeacher?.user_id ? undefined : 6} required={!loginTeacher?.user_id} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{loginTeacher?.user_id ? 'Update Login' : 'Create Login'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
