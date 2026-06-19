import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate, calculateAge } from '../../utils/helpers';

export default function MyProfile() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/api/students/my-profile').then(res => {
      setStudent(res.data);
      setForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
        address: res.data.address || '',
        city: res.data.city || '',
        state: res.data.state || '',
        blood_group: res.data.blood_group || '',
      });
    }).catch(() => toast.error('Failed to load profile')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/api/students/my-profile', form);
      setStudent(res.data);
      setEditing(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/api/students/my-profile/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStudent(prev => ({ ...prev, photo: res.data.photo_url }));
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (!student) {
    return <div className="text-center py-12 text-gray-500">Profile not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">My Profile</h1>

      <div className="card mb-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            {student.photo ? (
              <img src={student.photo} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" />
            ) : (
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-3xl font-bold">
                {student.first_name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? '...' : '+'}
            </button>
            <input type="file" ref={fileRef} onChange={handlePhoto} accept="image/*" className="hidden" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{student.first_name} {student.last_name}</h2>
          <p className="text-sm text-gray-500">ID: {student.student_id}</p>
          <p className="text-sm text-gray-500 mt-1">{student.class_name} | {student.section_name || '-'}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-800">Personal Details</h3>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-primary text-sm">Edit</button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" rows="2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <input type="text" value={form.blood_group} onChange={e => setForm({...form, blood_group: e.target.value})} className="input-field" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setEditing(false); setForm({ first_name: student.first_name, last_name: student.last_name, phone: student.phone || '', email: student.email || '', address: student.address || '', city: student.city || '', state: student.state || '', blood_group: student.blood_group || '' }); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Name</p><p className="text-gray-800">{student.first_name} {student.last_name}</p></div>
              <div><p className="text-xs text-gray-500">Gender</p><p className="text-gray-800 capitalize">{student.gender}</p></div>
              <div><p className="text-xs text-gray-500">DOB</p><p className="text-gray-800">{formatDate(student.dob)} ({calculateAge(student.dob)} yrs)</p></div>
              <div><p className="text-xs text-gray-500">Blood Group</p><p className="text-gray-800">{student.blood_group || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Phone</p><p className="text-gray-800">{student.phone || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p className="text-gray-800">{student.email || '-'}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Address</p><p className="text-gray-800">{student.address || '-'}</p></div>
              <div><p className="text-xs text-gray-500">City</p><p className="text-gray-800">{student.city || '-'}</p></div>
              <div><p className="text-xs text-gray-500">State</p><p className="text-gray-800">{student.state || '-'}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
