import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNotifs, setTotalNotifs] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [view, setView] = useState('inbox');
  const [showSendModal, setShowSendModal] = useState(false);
  const [form, setForm] = useState({
    recipient_type: 'all', recipient_id: '', title: '', message: ''
  });
  const [users, setUsers] = useState([]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications/', { params: { page, per_page: 20, box: view } });
      const data = res.data;
      setNotifications(data.notifications || []);
      setTotalPages(data.total_pages || 1);
      setTotalNotifs(data.total || 0);
      setUnreadCount(data.unread || 0);
    } catch {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [page, view]);

  useEffect(() => {
    fetchNotifications();
    api.get('/api/users/', { params: { per_page: 200 } }).then(res => setUsers(res.data.users || res.data || [])).catch(() => {});
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await api.put('/api/notifications/' + id + '/read');
      toast.success('Marked as read');
      fetchNotifications();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      toast.success('All marked as read');
      fetchNotifications();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      if (user.role === 'student') {
        await api.post('/api/notifications/send-to-class-teacher', {
          title: form.title, message: form.message,
          notification_type: 'general'
        });
        toast.success('Notification sent to class teacher');
      } else if (user.role === 'teacher') {
        await api.post('/api/notifications/send-to-my-class', {
          title: form.title, message: form.message,
          notification_type: 'general'
        });
        toast.success('Notification sent to your class students');
      } else if (form.recipient_type === 'all' || form.recipient_type === 'student' || form.recipient_type === 'teacher' || form.recipient_type === 'bulk') {
        await api.post('/api/notifications/send-bulk', {
          title: form.title, message: form.message,
          role: form.recipient_type === 'all' || form.recipient_type === 'bulk' ? null : form.recipient_type,
          notification_type: 'general'
        });
        toast.success('Notification sent');
      } else if (form.recipient_type === 'user') {
        if (!form.recipient_id) { toast.error('Please select a user'); return; }
        await api.post('/api/notifications/', {
          user_id: parseInt(form.recipient_id),
          title: form.title, message: form.message,
          notification_type: 'general'
        });
        toast.success('Notification sent');
      }
      setShowSendModal(false);
      setForm({ recipient_type: 'all', recipient_id: '', title: '', message: '' });
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send');
    }
  };

  const renderInbox = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {unreadCount > 0 ? unreadCount + ' unread notifications' : 'No unread notifications'}
        </p>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-sm">Mark All as Read</button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">No notifications</div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={'card flex items-start justify-between gap-4 ' + (!n.is_read ? 'border-l-4 border-l-primary-500 bg-primary-50' : '')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={'text-sm ' + (n.is_read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900')}>
                    {n.title}
                  </h4>
                  {!n.is_read && <span className="badge-info text-xs">New</span>}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.created_at ? formatDate(n.created_at) : ''}
                  {n.sender_name ? ' by ' + n.sender_name : ''}
                </p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="btn-secondary text-xs whitespace-nowrap"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={totalNotifs} onPageChange={setPage} />
    </div>
  );

  const renderSent = () => (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {totalNotifs > 0 ? totalNotifs + ' sent notifications' : 'No sent notifications'}
      </p>

      <div className="space-y-3">
        {loading ? (
          <div className="card text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">No sent notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="card flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-gray-900">{n.title}</h4>
                  <span className="badge-info text-xs">{n.notification_type}</span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.created_at ? formatDate(n.created_at) : ''}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={totalNotifs} onPageChange={setPage} />
    </div>
  );
  const renderRecipientOptions = () => {
    if (form.recipient_type !== 'user') return null;
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {form.recipient_type === 'student' ? 'Student' : form.recipient_type === 'teacher' ? 'Teacher' : 'User'}
        </label>
        <select
          value={form.recipient_id}
          onChange={e => setForm({...form, recipient_id: e.target.value})}
          className="input-field"
        >
          <option value="">Select</option>
          {users
            .filter(u => u.role === 'student' || u.role === 'teacher' || u.role === 'admin' || u.role === 'principal')
            .map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</option>
            ))}
        </select>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Notifications</h1>
        <button onClick={() => setShowSendModal(true)} className="btn-primary">+ Send Notification</button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('inbox')}
          className={'px-4 py-2 rounded-lg text-sm font-medium ' + (view === 'inbox' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
        >
          Inbox
        </button>
        <button
          onClick={() => setView('sent')}
          className={'px-4 py-2 rounded-lg text-sm font-medium ' + (view === 'sent' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
        >
          Sent
        </button>
      </div>

      <div className="card">
        {view === 'inbox' && renderInbox()}
        {view === 'sent' && renderSent()}
      </div>

      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Send Notification</h3>
              <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSend} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Type</label>
                {user.role === 'student' ? (
                  <div className="input-field bg-gray-50 text-gray-500">My Class Teacher</div>
                ) : user.role === 'teacher' ? (
                  <div className="input-field bg-gray-50 text-gray-500">My Class Students</div>
                ) : (
                <select
                  value={form.recipient_type}
                  onChange={e => setForm({...form, recipient_type: e.target.value, recipient_id: ''})}
                  className="input-field"
                >
                  <option value="all">All Users</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="user">Specific User</option>
                </select>
                )}
              </div>
              {renderRecipientOptions()}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="input-field"
                  required
                  placeholder="Notification title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  className="input-field"
                  rows="4"
                  required
                  placeholder="Write your message here..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSendModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
