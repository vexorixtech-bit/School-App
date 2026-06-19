import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <span className="text-sm text-gray-400 animate-pulse-soft">Loading dashboard...</span>
    </div>
  </div>
);

const quickLinks = {
  admin: [
    { label: 'Students', path: '/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
    { label: 'Teachers', path: '/teachers', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
    { label: 'Attendance', path: '/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { label: 'Fees', path: '/fees', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
  teacher: [],
  student: [],
};

function DashboardHero({ user, quickLinks }) {
  const roleLabel = { admin: 'Administrator', teacher: 'Teacher', student: 'Student', super_admin: 'Super Admin' };
  const isStudent = user?.role === 'student';
  return (
    <div className={"relative overflow-hidden rounded-2xl mb-8 min-h-[300px] flex items-center " + (isStudent ? 'bg-gradient-to-br from-[#0f172a]/95 via-[#1e3a5f]/90 to-[#0d2137]/95' : 'bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0d2137]')}>
      {isStudent && (
        <div className="absolute inset-0 opacity-15">
          <img
            src="https://images.pexels.com/photos/5636692/pexels-photo-5636692.jpeg?w=800&q=60&auto=compress&cs=tinysrgb"
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="absolute inset-0 opacity-10">
        <svg viewBox="0 0 1200 600" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="600" fill="#fff" />
          <circle cx="100" cy="100" r="60" fill="#fff" opacity="0.3" />
          <circle cx="300" cy="80" r="40" fill="#fff" opacity="0.2" />
          <circle cx="500" cy="120" r="50" fill="#fff" opacity="0.15" />
          <rect x="50" y="250" width="200" height="150" rx="10" fill="#fff" opacity="0.1" />
          <rect x="280" y="270" width="200" height="130" rx="10" fill="#fff" opacity="0.08" />
          <rect x="510" y="260" width="200" height="140" rx="10" fill="#fff" opacity="0.12" />
          <rect x="740" y="250" width="200" height="150" rx="10" fill="#fff" opacity="0.09" />
          <line x1="50" y1="450" x2="950" y2="450" stroke="#fff" strokeWidth="2" opacity="0.1" />
          <circle cx="150" cy="450" r="5" fill="#fff" opacity="0.3" />
          <circle cx="350" cy="450" r="5" fill="#fff" opacity="0.3" />
          <circle cx="550" cy="450" r="5" fill="#fff" opacity="0.3" />
          <circle cx="750" cy="450" r="5" fill="#fff" opacity="0.3" />
        </svg>
      </div>
      <div className="relative z-10 p-8 md:p-12 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-primary-300 text-sm font-medium tracking-wider uppercase mb-2">{roleLabel[user?.role] || user?.role}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome, {user?.full_name?.split(' ')[0] || 'User'}!</h1>
            <p className="text-blue-200/80 text-sm">School Management System</p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="text-3xl font-bold text-white">{user?.full_name?.[0] || 'S'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-2xl">
          {quickLinks.map((link, i) => (
            <Link
              key={i}
              to={link.path}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all duration-200 group"
            >
              <svg className="w-4 h-4 text-blue-200 group-hover:text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
              </svg>
              <span className="text-sm text-blue-100 group-hover:text-white whitespace-nowrap">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const { user } = useAuth();
  const [homework, setHomework] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profRes, notifRes] = await Promise.all([
          api.get('/api/students/my-profile'),
          api.get('/api/notifications/'),
        ]);
        setProfile(profRes.data);
        const all = notifRes.data.notifications || [];
        setHomework(all.filter(n => n.notification_type === 'homework').slice(0, 5));
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="py-6 px-6">
      <DashboardHero user={user} quickLinks={quickLinks.student} />
      {profile && (
        <div className="mb-6 text-sm text-gray-600 font-medium">Class: {profile.class_name} | Section: {profile.section_name || '-'}</div>
      )}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 transition-all">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Recent Homework
          </h3>
          {homework.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No homework assigned yet</div>
          ) : (
            <div className="space-y-3">
              {homework.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/70 hover:bg-white/90 transition-colors border border-gray-100">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{h.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{h.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const { user } = useAuth();
  const [homework, setHomework] = useState([]);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [hwForm, setHwForm] = useState({ title: '', message: '', subject: '', due_date: '' });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/notifications/').then(res => {
      const all = res.data.notifications || [];
      setHomework(all.filter(n => n.notification_type === 'homework').slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSendHomework = async (e) => {
    e.preventDefault();
    if (!hwForm.title || !hwForm.message) { toast.error('Title and message required'); return; }
    setSending(true);
    try {
      await api.post('/api/notifications/send-homework', hwForm);
      toast.success('Homework sent to your class!');
      setShowHomeworkModal(false);
      setHwForm({ title: '', message: '', subject: '', due_date: '' });
      const res = await api.get('/api/notifications/');
      setHomework((res.data.notifications || []).filter(n => n.notification_type === 'homework').slice(0, 5));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="py-6 px-6">
        <DashboardHero user={user} quickLinks={quickLinks.teacher} />

        <div className="mb-6">
          <button onClick={() => setShowHomeworkModal(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Send Homework
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 transition-all">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Recent Homework Sent
          </h3>
          {homework.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No homework sent yet</div>
          ) : (
            <div className="space-y-3">
              {homework.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/70 hover:bg-white/90 transition-colors">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{h.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{h.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showHomeworkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHomeworkModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Send Homework</h2>
              <button onClick={() => setShowHomeworkModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSendHomework} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" value={hwForm.subject} onChange={e => setHwForm({...hwForm, subject: e.target.value})} className="input-field" placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={hwForm.title} onChange={e => setHwForm({...hwForm, title: e.target.value})} className="input-field" placeholder="Homework title" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={hwForm.message} onChange={e => setHwForm({...hwForm, message: e.target.value})} className="input-field" rows={4} placeholder="Describe the homework..." required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={hwForm.due_date} onChange={e => setHwForm({...hwForm, due_date: e.target.value})} className="input-field" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowHomeworkModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={sending}>{sending ? 'Sending...' : 'Send to Class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div>
      <DashboardHero user={user} quickLinks={quickLinks.admin} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <TeacherDashboard />;
  if (user?.role === 'student') return <StudentDashboard />;
  return <AdminDashboard />;
}
