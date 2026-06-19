import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../context/AuthContext';

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const TIME_SLOTS = ["08:00","09:00","10:00","11:00","12:00","01:00","02:00","03:00","04:00"];

export default function Timetable() {
  const { user } = useAuth();
  const { confirm, ConfirmModal } = useConfirm();
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [filterSections, setFilterSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    class_id: '', section_id: '', subject_id: '', teacher_id: '',
    day_of_week: 0, start_time: '08:00', end_time: '09:00', room: ''
  });
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/timetable/';
      const params = [];
      if (classFilter) params.push('class_id=' + classFilter);
      if (teacherFilter) params.push('teacher_id=' + teacherFilter);
      if (sectionFilter) params.push('section_id=' + encodeURIComponent(sectionFilter));
      if (params.length) url += '?' + params.join('&');
      const res = await api.get(url);
      setEntries(Array.isArray(res.data) ? res.data : (res.data.entries || []));
    } catch {
      toast.error('Failed to fetch timetable');
    } finally {
      setLoading(false);
    }
  }, [classFilter, sectionFilter, teacherFilter]);

  useEffect(() => {
    if (isStudent) {
      api.get('/api/students/my-profile').then(res => {
        setClassFilter(String(res.data.class_id));
      }).catch(() => {});
    } else if (isTeacher) {
      api.get('/api/teachers/my-classes').then(res => {
        if (res.data.length > 0) setClassFilter(String(res.data[0].id));
      }).catch(() => {});
    }
    api.get('/api/classes/').then(res => setClasses(res.data)).catch(() => {});
    api.get('/api/teachers/').then(res => setTeachers(res.data.teachers || [])).catch(() => {});
  }, [fetchEntries, isStudent, isTeacher]);

  useEffect(() => {
    if (classFilter || (!isStudent && !isTeacher)) fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (classFilter) {
      setSectionFilter('');
      api.get('/api/classes/sections?class_id=' + classFilter).then(res => setFilterSections(res.data)).catch(() => setFilterSections([]));
    } else {
      setFilterSections([]);
    }
  }, [classFilter]);

  useEffect(() => {
    if (form.class_id) {
      api.get('/api/classes/sections?class_id=' + form.class_id).then(res => setSections(res.data)).catch(() => setSections([]));
      api.get('/api/classes/subjects?class_id=' + form.class_id).then(res => setSubjects(res.data)).catch(() => setSubjects([]));
    } else {
      setSections([]);
      setSubjects([]);
    }
  }, [form.class_id]);

  const checkConflict = (newEntry, excludeId) => {
    return entries.some(e => {
      if (excludeId && e.id === excludeId) return false;
      if (e.day_of_week !== newEntry.day_of_week) return false;
      if (e.teacher_id !== parseInt(newEntry.teacher_id) && e.room !== newEntry.room) return false;
      const overlap = (e.start_time < newEntry.end_time && e.end_time > newEntry.start_time);
      if (overlap && (e.teacher_id === parseInt(newEntry.teacher_id))) return true;
      if (overlap && e.room === newEntry.room && newEntry.room) return true;
      return false;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      class_id: parseInt(form.class_id),
      section_id: parseInt(form.section_id),
      subject_id: parseInt(form.subject_id),
      teacher_id: parseInt(form.teacher_id),
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      room: form.room || null,
    };
    const conflict = checkConflict(payload);
    if (conflict) {
      toast.error('Time conflict detected for teacher or room');
      return;
    }
    try {
      await api.post('/api/timetable/', payload);
      toast.success('Timetable entry added');
      setShowModal(false);
      setForm({
        class_id: '', section_id: '', subject_id: '', teacher_id: '',
        day_of_week: 0, start_time: '08:00', end_time: '09:00', room: ''
      });
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add entry');
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm('Delete Entry', 'Delete this timetable entry?')) return;
    try {
      await api.delete('/api/timetable/' + id);
      toast.success('Entry deleted');
      fetchEntries();
    } catch {
      toast.error('Delete failed');
    }
  };

  const DAY_MAP = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5 };

  const getEntryForSlot = (day, time) => {
    const dayIdx = DAY_MAP[day];
    return entries.filter(e => {
      const startHour = parseInt(e.start_time.split(':')[0]);
      const slotHour = parseInt(time.split(':')[0]);
      return e.day_of_week === dayIdx && startHour === slotHour;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Timetable</h1>
        {!isStudent && !isTeacher && <button onClick={() => { setForm(f => ({...f, class_id: isTeacher ? classFilter : f.class_id})); setShowModal(true); }} className="btn-primary">+ Add Entry</button>}
      </div>

      {!isStudent && (
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            {isTeacher ? (
              <input type="text" value={classes.find(c => String(c.id) === classFilter)?.name || ''} className="input-field" disabled />
            ) : (
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="input-field">
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="w-36">
            <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="input-field" disabled={!classFilter}>
              <option value="">All Sections</option>
              {filterSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className="input-field">
              <option value="">All Teachers</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name + ' ' + t.last_name}</option>
                  ))}
            </select>
          </div>
        </div>
      </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="table-cell min-w-[70px]">Time</th>
              {DAYS.map(day => (
                <th key={day} className="table-cell text-center min-w-[130px]">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {TIME_SLOTS.map((time, idx) => {
              const nextSlot = TIME_SLOTS[idx + 1] || '';
              return (
                <tr key={time} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-xs text-gray-500">{time}{nextSlot ? ' - ' + nextSlot : ''}</td>
                  {DAYS.map(day => {
                    const slotEntries = getEntryForSlot(day, time);
                    return (
                      <td key={day + time} className="table-cell p-1 text-center align-top">
                        {slotEntries.length === 0 ? (
                          <span className="text-xs text-gray-300">-</span>
                        ) : (
                          slotEntries.map(entry => (
                            <div key={entry.id} className="bg-primary-50 border border-primary-200 rounded px-1 py-0.5 mb-0.5 text-xs">
                              <div className="font-medium text-primary-700 truncate">{entry.subject}</div>
                              <div className="text-gray-500 truncate">{entry.teacher || 'T' + entry.teacher_id}</div>
                              <div className="text-gray-400">{entry.room || '-'}</div>
                              {!isStudent && !isTeacher && (
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-500 hover:text-red-700 mt-0.5 text-xs"
                              >
                                Remove
                              </button>
                              )}
                            </div>
                          ))
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && !isStudent && !isTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Add Timetable Entry</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select value={isTeacher ? classFilter : form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} className="input-field" required disabled={isTeacher}>
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <select value={form.section_id} onChange={e => setForm({...form, section_id: e.target.value})} className="input-field" required>
                    <option value="">Select Section</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} className="input-field" required>
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <select value={form.teacher_id} onChange={e => setForm({...form, teacher_id: e.target.value})} className="input-field" required>
                    <option value="">Select Teacher</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.first_name + ' ' + t.last_name}</option>
                          ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select value={form.day_of_week} onChange={e => setForm({...form, day_of_week: parseInt(e.target.value)})} className="input-field">
                  {DAYS.map((day, idx) => (
                    <option key={day} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input type="text" value={form.room} onChange={e => setForm({...form, room: e.target.value})} className="input-field" placeholder="Room 101" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}
