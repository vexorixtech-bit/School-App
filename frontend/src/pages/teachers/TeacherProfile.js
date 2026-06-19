import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function TeacherProfile() {
  const { id } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingLogin, setEditingLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginSaving, setLoginSaving] = useState(false);

  useEffect(() => {
    api.get('/api/teachers/' + id + '/')
      .then(res => setTeacher(res.data))
      .catch(() => toast.error('Failed to load teacher profile'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveLogin = async () => {
    if (!loginForm.username) { toast.error('Username is required'); return; }
    setLoginSaving(true);
    try {
      const res = await api.put('/api/teachers/' + id + '/update-login', loginForm);
      toast.success('Login updated! Username: ' + res.data.username);
      setEditingLogin(false);
      setTeacher(prev => ({ ...prev, username: res.data.username }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update login');
    } finally {
      setLoginSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (!teacher) {
    return <div className="text-center py-12 text-gray-500">Teacher not found</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/teachers" className="text-gray-400 hover:text-gray-600">&larr; Back</Link>
        <h1 className="page-title mb-0">Teacher Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-2xl font-bold shrink-0">
              {(teacher.first_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">{teacher.first_name} {teacher.last_name}</h2>
              <p className="text-sm text-gray-500">ID: {teacher.teacher_id || teacher.id}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
                <span><strong>Gender:</strong> {teacher.gender}</span>
                <span><strong>Qualification:</strong> {teacher.qualification || '-'}</span>
                <span><strong>Specialization:</strong> {teacher.specialization || '-'}</span>
                <span><strong>Phone:</strong> {teacher.phone || '-'}</span>
                <span><strong>Email:</strong> {teacher.email || '-'}</span>
                {teacher.class_name && <span><strong>Class Teacher of:</strong> {teacher.class_name}</span>}
                {teacher.subjects?.length > 0 && (
                  <span><strong>Subjects:</strong> {teacher.subjects.map(s => s.subject_name).join(', ')}</span>
                )}
              </div>
              {teacher.username && (
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
                      <p className="text-sm text-gray-600"><strong>Username:</strong> {teacher.username}</p>
                      <p className="text-sm text-gray-600"><strong>Password:</strong> teacher123</p>
                      <button onClick={() => { setLoginForm({ username: teacher.username, password: '' }); setEditingLogin(true); }} className="text-xs text-primary-600 hover:text-primary-800 mt-1">Edit Login</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
