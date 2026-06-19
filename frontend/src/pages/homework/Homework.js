import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

export default function Homework() {
  const { user } = useAuth();
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', subject: '', due_date: '' });

  const fetchHomework = useCallback(async () => {
    setLoading(true);
    try {
      const box = user?.role === 'student' ? 'inbox' : 'sent';
      const res = await api.get('/api/notifications/', { params: { page, per_page: 20, box } });
      const all = res.data.notifications || [];
      setHomework(all.filter(n => n.notification_type === 'homework'));
      setTotalPages(res.data.total_pages || 1);
    } catch {
      toast.error('Failed to fetch homework');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchHomework(); }, [fetchHomework]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) { toast.error('Title and message required'); return; }
    if (sending) return;
    setSending(true);
    try {
      await api.post('/api/notifications/send-homework', form);
      toast.success('Homework sent to your class!');
      setShowSendModal(false);
      setForm({ title: '', message: '', subject: '', due_date: '' });
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send homework');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Homework</h1>
        {user?.role === 'teacher' && (
          <button onClick={() => setShowSendModal(true)} className="btn-primary">+ Send Homework</button>
        )}
      </div>

      <div className="card">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : homework.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No homework yet</div>
          ) : (
            homework.map(h => (
              <div key={h.id} className="flex items-start gap-3 p-4 rounded-lg bg-white border border-gray-100 hover:border-primary-200 transition-colors">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900">{h.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{h.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(h.created_at)}{h.sender_name ? ' by ' + h.sender_name : ''}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} total={homework.length} onPageChange={setPage} />
      </div>

      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Send Homework</h3>
              <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSend} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text" value={form.subject}
                  onChange={e => setForm({...form, subject: e.target.value})}
                  className="input-field" placeholder="e.g. Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text" value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="input-field" required placeholder="Homework title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  className="input-field" rows="4" required placeholder="Describe the homework..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date" value={form.due_date}
                  onChange={e => setForm({...form, due_date: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSendModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={sending} className="btn-primary">
                  {sending ? 'Sending...' : 'Send to Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}