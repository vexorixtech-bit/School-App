import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';

export default function Classes() {
  const { confirm, ConfirmModal } = useConfirm();
  const [activeTab, setActiveTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classForm, setClassForm] = useState({ name: '', code: '', description: '' });
  const [classFeeTypes, setClassFeeTypes] = useState([]);
  const feeTypeOptions = ['Tuition Fee', 'Admission Fee', 'Exam Fee', 'Library Fee', 'Sports Fee', 'Transport Fee', 'Lab Fee', 'Annual Fee', 'Other'];

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionForm, setSectionForm] = useState({ class_id: '', name: '' });

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ class_id: '', name: '', code: '' });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ class_id: '', subject_id: '', teacher_id: '' });

  const SECTIONS = [];

  const tabs = [
    { key: 'classes', label: 'Classes' },
    { key: 'sections', label: 'Sections' },
    { key: 'subjects', label: 'Subjects' },
    { key: 'assignments', label: 'Assignments' },
  ];

  const fetchAll = useCallback(async () => {
    try {
      const [clsRes, secRes, subRes, assignRes, teachRes] = await Promise.all([
        api.get('/api/classes/'),
        api.get('/api/classes/sections'),
        api.get('/api/classes/subjects'),
        api.get('/api/classes/assignments'),
        api.get('/api/teachers/'),
      ]);
      setClasses(clsRes.data);
      setSections(secRes.data);
      setSubjects(subRes.data);
      setAssignments(assignRes.data);
      setTeachers(teachRes.data.teachers || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    try {
      let classId;
      if (editingClass) {
        await api.put('/api/classes/' + editingClass.id + '/', classForm);
        classId = editingClass.id;
        toast.success('Class updated');
      } else {
        const res = await api.post('/api/classes/', classForm);
        classId = res.data.id;
        toast.success('Class added');
      }
      if (classFeeTypes.length > 0 && !editingClass) {
        for (const ft of classFeeTypes) {
          await api.post('/api/fees/structures', {
            class_id: classId,
            fee_type: ft.fee_type,
            amount: parseFloat(ft.amount),
            due_date: ft.due_date || null
          });
        }
        toast.success(classFeeTypes.length + ' fee types added');
      }
      setShowClassModal(false);
      setClassFeeTypes([]);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    }
  };

  const addFeeTypeRow = () => {
    setClassFeeTypes([...classFeeTypes, { fee_type: '', amount: '', due_date: '' }]);
  };
  const removeFeeTypeRow = (idx) => {
    setClassFeeTypes(classFeeTypes.filter((_, i) => i !== idx));
  };
  const updateFeeTypeRow = (idx, field, value) => {
    const updated = [...classFeeTypes];
    updated[idx][field] = value;
    setClassFeeTypes(updated);
  };

  const handleDeleteClass = async (id) => {
    const ok = await confirm('Delete Class', 'Delete this class?');
    if (!ok) return;
    try {
      await api.delete('/api/classes/' + id + '/');
      toast.success('Class deactivated');
      fetchAll();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/classes/sections', {
        name: sectionForm.name,
        class_id: Number(sectionForm.class_id)
      });
      toast.success('Section added');
      setShowSectionModal(false);
      setSectionForm({ class_id: '', name: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/classes/subjects', {
        name: subjectForm.name,
        code: subjectForm.code,
        class_id: Number(subjectForm.class_id)
      });
      toast.success('Subject added');
      setShowSubjectModal(false);
      setSubjectForm({ class_id: '', name: '', code: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDeleteSection = async (id) => {
    if (!await confirm('Delete Section', 'Delete this section?')) return;
    try {
      await api.delete('/api/classes/sections/' + id);
      toast.success('Section deleted');
      fetchAll();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!await confirm('Delete Subject', 'Delete this subject?')) return;
    try {
      await api.delete('/api/classes/subjects/' + id);
      toast.success('Subject deactivated');
      fetchAll();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!await confirm('Remove Assignment', 'Remove this teacher assignment?')) return;
    try {
      await api.delete('/api/classes/assignments/' + id);
      toast.success('Assignment removed');
      fetchAll();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/classes/assign-subject', {
        subject_id: Number(assignForm.subject_id),
        teacher_id: Number(assignForm.teacher_id),
        class_id: Number(assignForm.class_id)
      });
      toast.success('Subject assigned');
      setShowAssignModal(false);
      setAssignForm({ class_id: '', subject_id: '', teacher_id: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    }
  };

  const classMap = {};
  classes.forEach(c => { classMap[c.id] = c.name; });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div>
      <h1 className="page-title">Classes Management</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={'px-4 py-2 rounded-md text-sm font-medium transition-colors ' + (activeTab === tab.key ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-800')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'classes' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingClass(null); setClassForm({ name: '', code: '', description: '' }); setShowClassModal(true); }} className="btn-primary">+ Add Class</button>
          </div>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">ID</th>
                  <th className="table-cell">Name</th>
                  <th className="table-cell">Code</th>
                  <th className="table-cell">Description</th>
                  <th className="table-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.length === 0 && <tr><td colSpan="5" className="table-cell text-center text-gray-400 py-8">No classes created</td></tr>}
                {classes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{c.id}</td>
                    <td className="table-cell font-medium text-gray-800">{c.name}</td>
                    <td className="table-cell text-gray-500">{c.code}</td>
                    <td className="table-cell text-gray-500">{c.description || '-'}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => { setEditingClass(c); setClassForm({ name: c.name, code: c.code, description: c.description || '' }); setShowClassModal(true); }} className="text-primary-600 hover:text-primary-800 mr-3">Edit</button>
                      <button onClick={() => handleDeleteClass(c.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sections' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowSectionModal(true)} className="btn-primary">+ Add Section</button>
          </div>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">ID</th>
                  <th className="table-cell">Class</th>
                  <th className="table-cell">Section</th>
                  <th className="table-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sections.length === 0 && <tr><td colSpan="4" className="table-cell text-center text-gray-400 py-8">No sections added</td></tr>}
                {sections.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{s.id}</td>
                    <td className="table-cell">{s.class_name || 'Class ' + s.class_id}</td>
                    <td className="table-cell font-medium">{s.name}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => handleDeleteSection(s.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowSubjectModal(true)} className="btn-primary">+ Add Subject</button>
          </div>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">ID</th>
                  <th className="table-cell">Class</th>
                  <th className="table-cell">Subject</th>
                  <th className="table-cell">Code</th>
                  <th className="table-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.length === 0 && <tr><td colSpan="5" className="table-cell text-center text-gray-400 py-8">No subjects added</td></tr>}
                {subjects.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{s.id}</td>
                    <td className="table-cell">{s.class_name || 'Class ' + s.class_id}</td>
                    <td className="table-cell font-medium">{s.name}</td>
                    <td className="table-cell text-gray-500">{s.code || '-'}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => handleDeleteSubject(s.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAssignModal(true)} className="btn-primary">+ Assign Subject</button>
          </div>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Class</th>
                  <th className="table-cell">Subject</th>
                  <th className="table-cell">Teacher</th>
                  <th className="table-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.length === 0 && <tr><td colSpan="4" className="table-cell text-center text-gray-400 py-8">No assignments made</td></tr>}
                {assignments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{a.class_name}</td>
                    <td className="table-cell">{a.subject_name}</td>
                    <td className="table-cell">{a.teacher_name}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => handleDeleteAssignment(a.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editingClass ? 'Edit Class' : 'Add Class'}</h3>
              <button onClick={() => { setShowClassModal(false); setClassFeeTypes([]); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleClassSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                  <input type="text" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input type="text" value={classForm.code} onChange={e => setClassForm({...classForm, code: e.target.value})} className="input-field" placeholder="e.g. C01" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={classForm.description} onChange={e => setClassForm({...classForm, description: e.target.value})} className="input-field" rows="2" />
              </div>

              {!editingClass && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Fee Setup (optional)</label>
                    <button type="button" onClick={addFeeTypeRow} className="text-sm font-medium text-primary-600 hover:text-primary-800">+ Add Fee Type</button>
                  </div>
                  {classFeeTypes.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No fee types added. You can add later in Fee Structure tab.</p>
                  )}
                  {classFeeTypes.map((ft, idx) => (
                    <div key={idx} className="flex gap-2 items-end mb-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <select value={ft.fee_type} onChange={e => updateFeeTypeRow(idx, 'fee_type', e.target.value)} className="input-field text-sm" required>
                          <option value="">Select</option>
                          {feeTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <input type="number" min="0" step="0.01" placeholder="Amount" value={ft.amount} onChange={e => updateFeeTypeRow(idx, 'amount', e.target.value)} className="input-field text-sm" required />
                      </div>
                      <div className="w-36">
                        <input type="date" value={ft.due_date} onChange={e => updateFeeTypeRow(idx, 'due_date', e.target.value)} className="input-field text-sm" />
                      </div>
                      <button type="button" onClick={() => removeFeeTypeRow(idx)} className="text-red-500 hover:text-red-700 text-sm pb-1">&times;</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowClassModal(false); setClassFeeTypes([]); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingClass ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Add Section</h3>
              <button onClick={() => setShowSectionModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSectionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select value={sectionForm.class_id} onChange={e => setSectionForm({...sectionForm, class_id: e.target.value})} className="input-field" required>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                <input type="text" value={sectionForm.name} onChange={e => setSectionForm({...sectionForm, name: e.target.value})} className="input-field" placeholder="e.g. A, B, C" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSectionModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Add Subject</h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubjectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select value={subjectForm.class_id} onChange={e => setSubjectForm({...subjectForm, class_id: e.target.value})} className="input-field" required>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input type="text" value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                <input type="text" value={subjectForm.code} onChange={e => setSubjectForm({...subjectForm, code: e.target.value})} className="input-field" placeholder="e.g. MATC01" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Assign Subject to Teacher</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select value={assignForm.class_id} onChange={e => setAssignForm({...assignForm, class_id: e.target.value, subject_id: '', teacher_id: ''})} className="input-field" required>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select value={assignForm.subject_id} onChange={e => setAssignForm({...assignForm, subject_id: e.target.value})} className="input-field" required>
                  <option value="">Select Subject</option>
                  {subjects
                    .filter(s => !assignForm.class_id || Number(s.class_id) === Number(assignForm.class_id))
                    .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                <select value={assignForm.teacher_id} onChange={e => setAssignForm({...assignForm, teacher_id: e.target.value})} className="input-field" required>
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}
