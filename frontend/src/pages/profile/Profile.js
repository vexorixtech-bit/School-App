import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [profile, setProfile] = useState(null);
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

  const handleLogout = () => {
    toast.success('Logged out successfully');
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Profile</h1>

      <div className="card mb-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-3xl font-bold border-4 border-gray-100 mb-4">
            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
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
