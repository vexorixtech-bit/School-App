import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
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

const roleOptions = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'principal', label: 'Principal' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();
  const [form, setForm] = useState({
    username: '', email: '', full_name: '', password: '', role: 'admin', phone: ''
  });

  const fetchUsers = useCallback(async () => {
    try {
      const params = { page, per_page: 50 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const res = await api.get('/api/users/', { params });
      setUsers(res.data.users || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalUsers(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [roleFilter, search]);

  const openAdd = () => {
    setForm({ username: '', email: '', full_name: '', password: '', role: 'admin', phone: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...form, email: form.email || null };
      await api.post('/api/users/', payload);
      toast.success('User created successfully');
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (user) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    const ok = await confirm(action === 'deactivate' ? 'Deactivate User' : 'Activate User', `Are you sure you want to ${action} this user?`);
    if (!ok) return;
    try {
      await api.put('/api/users/' + user.id + '/', { is_active: !user.is_active });
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Users</h1>
        <button onClick={openAdd} className="btn-primary">+ Add User</button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input type="text" placeholder="Search by name, username or email..."
              value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
          </div>
          <div className="w-48">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field">
              <option value="">All Roles</option>
              {roleOptions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">Username</th>
              <th className="table-cell">Name</th>
              <th className="table-cell">Email</th>
              <th className="table-cell">Role</th>
              <th className="table-cell">Phone</th>
              <th className="table-cell">Status</th>
              <th className="table-cell text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 && (
              <tr><td colSpan="7" className="table-cell text-center text-gray-400 py-8">No users found</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{u.username}</td>
                <td className="table-cell">{u.full_name}</td>
                <td className="table-cell">{u.email}</td>
                <td className="table-cell">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 capitalize">
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="table-cell">{u.phone || '-'}</td>
                <td className="table-cell">
                  <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="table-cell text-right">
                  <button onClick={() => handleToggle(u)} className={'text-sm ' + (u.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800')}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={totalUsers} onPageChange={setPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Add User</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field" required>
                    {roleOptions.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" required minLength="6" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}
