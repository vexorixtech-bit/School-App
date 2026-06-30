import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getStatusBadge } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
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

export default function Students() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmModal } = useConfirm();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [filterSections, setFilterSections] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginStudent, setLoginStudent] = useState(null);

  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: 'Male', phone: '', email: '',
    address: '', date_of_birth: '', class_id: '', section_id: '', admission_date: ''
  });

  const today = new Date().toISOString().split('T')[0];

  const fetchStudents = useCallback(async () => {
    try {
      const params = { page, per_page: 20 };
      if (classFilter) params.class_id = classFilter;
      if (sectionFilter) params.section_id = sectionFilter;
      if (search) params.search = search;
      const res = await api.get('/api/students/', { params });
      setStudents(res.data.students || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalStudents(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [classFilter, sectionFilter, page, search]);

  useEffect(() => {
    const loadClasses = isTeacher
      ? api.get('/api/teachers/my-classes')
      : api.get('/api/classes/');
    loadClasses.then(res => {
      setClasses(res.data);
      if (isTeacher && res.data.length > 0) {
        setClassFilter(String(res.data[0].id));
      }
    }).catch(() => {});
  }, [isTeacher]);

  useEffect(() => { setPage(1); }, [classFilter, sectionFilter]);

  useEffect(() => {
    if (classFilter) {
      api.get('/api/classes/sections?class_id=' + classFilter)
        .then(res => setFilterSections(res.data))
        .catch(() => setFilterSections([]));
    } else {
      setFilterSections([]);
      setSectionFilter('');
    }
  }, [classFilter]);

  useEffect(() => {
    if (!isTeacher || classFilter) fetchStudents();
  }, [fetchStudents, isTeacher]);

  useEffect(() => {
    if (form.class_id) {
      api.get('/api/classes/sections?class_id=' + form.class_id)
        .then(res => setSections(res.data))
        .catch(() => setSections([]));
    } else {
      setSections([]);
    }
  }, [form.class_id]);

  const classMap = {};
  classes.forEach(c => { classMap[c.id] = c.name; });
  const classList = Object.entries(classMap);

  const filtered = students.filter(s => {
    const fullName = (s.first_name + ' ' + s.last_name).toLowerCase();
    const q = search.toLowerCase();
    return !search || fullName.includes(q) || s.student_id?.toString().includes(q) || s.phone?.includes(search);
  });

  const resetForm = () => {
    setForm({
      first_name: '', last_name: '', gender: 'Male', phone: '', email: '',
      address: '', date_of_birth: '', class_id: '', section_id: '', admission_date: today
    });
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      first_name: s.first_name, last_name: s.last_name, gender: s.gender, phone: s.phone,
      email: s.email || '', address: s.address || '', date_of_birth: s.date_of_birth || '',
      class_id: s.class_id || '', section_id: s.section_id || '', admission_date: s.admission_date || ''
    });
    setShowModal(true);
  };

  const toNull = (v) => (v === '' || v === undefined || v === null ? null : v);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put('/api/students/' + editing.id + '/', {
          first_name: form.first_name, last_name: form.last_name,
          address: toNull(form.address), phone: toNull(form.phone), email: toNull(form.email),
          class_id: Number(form.class_id)
        });
        toast.success('Student updated');
        setShowModal(false);
      } else {
        const res = await api.post('/api/students/', {
          first_name: form.first_name, last_name: form.last_name,
          gender: form.gender.toUpperCase(), phone: toNull(form.phone), email: toNull(form.email),
          address: toNull(form.address), date_of_birth: form.date_of_birth || today,
          admission_date: form.admission_date || today,
          class_id: Number(form.class_id),
          section_id: form.section_id ? Number(form.section_id) : null
        });
        toast.success('Student added successfully!');
        setShowModal(false);
      }
      fetchStudents();
    } catch (err) {
      toast.error(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Delete Student', 'Are you sure you want to delete this student?');
    if (!ok) return;
    try {
      await api.delete('/api/students/' + id + '/');
      toast.success('Student deleted');
      fetchStudents();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleCreateLogin = async (e) => {
    e.preventDefault();
    try {
      if (loginStudent.user_id) {
        const res = await api.put('/api/students/' + loginStudent.id + '/update-login', loginForm);
        toast.success('Login updated! Username: ' + res.data.username);
      } else {
        const res = await api.post('/api/students/' + loginStudent.id + '/create-login', loginForm);
        toast.success('Login created! Username: ' + res.data.username);
      }
      setShowLoginModal(false);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update login');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (isTeacher && classes.length === 0) {
    return <div><h1 className="page-title">Students</h1><div className="card p-8 text-center text-gray-500">No classes assigned to you yet.</div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Students</h1>
        <div className="flex gap-2">
          {!isTeacher && <button onClick={() => window.open('/api/students/export/csv' + (classFilter ? '?class_id=' + classFilter : ''), '_blank')} className="btn-secondary">Export CSV</button>}
          {!isTeacher && <button onClick={openAdd} className="btn-primary">+ Add Student</button>}
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name, ID or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="w-48">
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="input-field">
              {isTeacher
                ? <option value="">-- Select Your Class --</option>
                : <option value="">All Classes</option>
              }
              {classList.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            {isTeacher && !classFilter && (
              <p className="text-xs text-amber-600 mt-1">Please select a class to view students</p>
            )}
          </div>
          <div className="w-48">
            <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="input-field" disabled={!classFilter}>
              <option value="">All Sections</option>
              {filterSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">ID</th>
              <th className="table-cell">Name</th>
              <th className="table-cell">Class</th>
              <th className="table-cell">Gender</th>
              <th className="table-cell">Phone</th>
              <th className="table-cell">Status</th>
              <th className="table-cell text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="table-cell text-center text-gray-400 py-8">No students found</td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{s.student_id || s.id}</td>
                <td className="table-cell">
                  <Link to={'/students/' + s.id} className="text-primary-600 hover:underline font-medium">{s.first_name} {s.last_name}</Link>
                </td>
                <td className="table-cell">{classMap[s.class_id] || 'Class ' + s.class_id}</td>
                <td className="table-cell">{s.gender}</td>
                <td className="table-cell">{s.phone}</td>
                <td className="table-cell">
                  <span className={getStatusBadge(s.is_active ? 'active' : 'inactive')}>{s.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="table-cell text-right">
                  {!isTeacher && (
                    <>
                      <button onClick={() => openEdit(s)} className="text-primary-600 hover:text-primary-800 mr-2">Edit</button>
                      <button onClick={() => { setLoginStudent(s); setLoginForm({ username: s.username || '', password: '' }); setShowLoginModal(true); }} className="text-green-600 hover:text-green-800 mr-2">{s.user_id ? 'Edit Login' : 'Login'}</button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </>
                  )}
                  {isTeacher && (
                    <Link to={'/students/' + s.id} className="text-primary-600 hover:underline text-sm">View</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={totalStudents} onPageChange={setPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Student' : 'Add Student'}</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value, section_id: ''})} className="input-field" required>
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <select value={form.section_id} onChange={e => setForm({...form, section_id: e.target.value})} className="input-field">
                    <option value="">Select Section</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date</label>
                <input type="date" value={form.admission_date} onChange={e => setForm({...form, admission_date: e.target.value})} className="input-field" />
              </div>
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
              <h3 className="text-lg font-semibold">{loginStudent?.user_id ? 'Edit Login' : 'Create Login'} — {loginStudent?.first_name} {loginStudent?.last_name}</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleCreateLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password {loginStudent?.user_id && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}</label>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="input-field" minLength={loginStudent?.user_id ? undefined : 6} required={!loginStudent?.user_id} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{loginStudent?.user_id ? 'Update Login' : 'Create Login'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
