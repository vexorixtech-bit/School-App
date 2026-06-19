import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', class_id: '' });
  const [posterFile, setPosterFile] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/events/', { params: { year, month: month + 1 } });
      setEvents(res.data.events || []);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => {
    if (user?.role === 'teacher' || user?.role === 'super_admin' || user?.role === 'admin') {
      api.get('/api/classes/').then(res => setClasses(res.data?.classes || res.data || [])).catch(() => {});
    }
  }, [user]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const eventMap = {};
  events.forEach(e => {
    const d = parseInt(e.event_date.split('-')[2], 10);
    if (!eventMap[d]) eventMap[d] = [];
    eventMap[d].push(e);
  });

  const handlePrev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const handleNext = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setForm({ ...form, event_date: dateStr });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.event_date || !form.class_id) { toast.error('Title, date, and class required'); return; }
    if (creating) return;
    setCreating(true);
    try {
      const params = new URLSearchParams();
      params.append('title', form.title);
      params.append('event_date', form.event_date);
      params.append('class_id', form.class_id);
      if (form.description) params.append('description', form.description);

      const res = await api.post('/api/events/?' + params.toString());
      const event = res.data;

      if (posterFile && event.id) {
        const fd = new FormData();
        fd.append('file', posterFile);
        await api.post('/api/events/' + event.id + '/poster', fd);
      }

      toast.success('Event created!');
      setShowModal(false);
      setForm({ title: '', description: '', event_date: '', class_id: '' });
      setPosterFile(null);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.delete('/api/events/' + id);
      toast.success('Event deleted');
      fetchEvents();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const selectedEvents = selectedDate ? (eventMap[parseInt(selectedDate.split('-')[2], 10)] || []) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Events Calendar</h1>
        {(user?.role === 'teacher' || user?.role === 'super_admin' || user?.role === 'admin') && (
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Event</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrev} className="btn-secondary text-sm px-3 py-1">&larr;</button>
              <h3 className="font-semibold text-gray-800">{MONTHS[month]} {year}</h3>
              <button onClick={handleNext} className="btn-secondary text-sm px-3 py-1">&rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAYS.map(d => <div key={d} className="text-xs font-medium text-gray-500 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const hasEvent = eventMap[day];
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const isSelected = selectedDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={'relative py-2 text-sm rounded-lg transition-colors ' + (
                      isSelected ? 'bg-primary-600 text-white' :
                      isToday ? 'bg-primary-100 text-primary-700 font-bold' :
                      'hover:bg-gray-100 text-gray-700'
                    )}
                  >
                    {day}
                    {hasEvent && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="card mt-4">
              <h3 className="font-semibold text-gray-800 mb-3">Events on {selectedDate}</h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-gray-400">No events on this date</p>
              ) : (
                selectedEvents.map(e => (
                  <div key={e.id} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 mb-2">
                    {e.poster_image && (
                      <img src={e.poster_image} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900">{e.title}</h4>
                      {e.description && <p className="text-sm text-gray-600 mt-1">{e.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{e.class_name}{e.teacher_name ? ' by ' + e.teacher_name : ''}</p>
                    </div>
                    {(user?.role === 'teacher' || user?.role === 'super_admin' || user?.role === 'admin') && (
                      <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">All Events This Month</h3>
            {loading ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" /></div>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No events this month</p>
            ) : (
              <div className="space-y-3">
                {events.map(e => (
                  <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {e.event_date.split('-')[2]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{e.title}</p>
                      <p className="text-xs text-gray-400">{e.class_name}{e.teacher_name ? ' - ' + e.teacher_name : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Add Event</h3>
              <button onClick={() => { setShowModal(false); setPosterFile(null); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} className="input-field" required>
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" required placeholder="Event title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows="3" placeholder="Event description..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poster Image</label>
                <input type="file" accept="image/*" onChange={e => setPosterFile(e.target.files[0])} className="input-field" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setPosterFile(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}