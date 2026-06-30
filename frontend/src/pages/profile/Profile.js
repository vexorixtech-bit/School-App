import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (isStudent) {
      api.get('/api/students/my-profile')
        .then(res => setProfile(res.data))
        .catch(() => {});
    } else if (isTeacher) {
      api.get('/api/teachers/my-classes')
        .then(res => {
          if (res.data?.length > 0) setProfile(res.data[0]);
        })
        .catch(() => {});
    }
  }, [isStudent, isTeacher]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const getPhotoUrl = () => {
    let url = null;
    if (isStudent && profile?.photo) url = profile.photo;
    else if (isTeacher && profile?.photo) url = profile.photo;
    else url = user?.profile_image || null;
    if (url && url.startsWith('/uploads/')) return API_URL + url;
    return url;
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      let res;
      if (isStudent) {
        res = await api.post('/api/students/my-profile/photo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProfile(prev => ({ ...prev, photo: res.data.photo_url }));
      } else if (isTeacher) {
        res = await api.post('/api/teachers/my-profile/photo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProfile(prev => ({ ...prev, photo: res.data.photo_url }));
      } else {
        res = await api.post('/api/users/my-profile/photo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUser(prev => ({ ...prev, profile_image: res.data.photo_url }));
      }
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    toast.success('Logged out successfully');
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const photoUrl = getPhotoUrl();

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Profile</h1>

      <div className="card mb-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" />
            ) : (
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-3xl font-bold border-4 border-gray-100">
                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-lg shadow-md hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
            <input type="file" ref={fileRef} onChange={handlePhoto} accept="image/*" className="hidden" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{user.full_name || 'User'}</h2>
          <p className="text-sm text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
          {profile && (profile.class_name || profile.name) && (
            <p className="text-sm text-gray-600 mt-1">
              {isTeacher ? `Class Teacher: ${profile.name}` : `Class: ${profile.class_name}${profile.section_name ? ` - ${profile.section_name}` : ''}`}
            </p>
          )}
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Account Details</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Username</p>
            <p className="text-gray-800">{user.username || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-gray-800">{user.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-gray-800">{user.phone || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Role</p>
            <p className="text-gray-800 capitalize">{user.role?.replace('_', ' ') || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Member Since</p>
            <p className="text-gray-800">{user.created_at ? formatDate(user.created_at) : '-'}</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowConfirm(true)}
        className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 border border-red-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm Logout</h2>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-all duration-200">Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-all duration-200">Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
