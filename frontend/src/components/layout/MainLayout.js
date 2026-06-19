import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import useWebSocket from '../../hooks/useWebSocket';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, showTimeoutWarning, setShowTimeoutWarning, logout } = useAuth();
  useWebSocket();
  const hasBg = user?.role === 'admin' || user?.role === 'student' || user?.role === 'teacher';
  const bgSrc = user?.role === 'student'
    ? 'https://images.pexels.com/photos/5636692/pexels-photo-5636692.jpeg?w=1200&q=60&auto=compress&cs=tinysrgb'
    : user?.role === 'teacher'
    ? 'https://media.istockphoto.com/id/1344268966/photo/teacher-taking-attendance-in-the-classroom.jpg?s=1024x1024&w=is&k=20&c=79l03zZiRwl9G7XW5y43EJ8UqOuNNoaDICrpuF_fm2Q='
    : 'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?w=1200&q=60&auto=compress&cs=tinysrgb';

  const inner = (
    <>
      {showTimeoutWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Your session will expire in 5 minutes. Save your work.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTimeoutWarning(false)} className="text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 px-3 py-1 rounded">Dismiss</button>
            <button onClick={logout} className="text-xs font-medium text-red-600 hover:text-red-800 bg-white px-3 py-1 rounded border border-red-200">Logout Now</button>
          </div>
        </div>
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </>
  );

  if (hasBg) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${bgSrc})` }}>
        <div className="min-h-screen backdrop-blur-sm bg-gradient-to-b from-white/70 via-white/60 to-white/75 flex h-screen">
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {inner}
    </div>
  );
}
