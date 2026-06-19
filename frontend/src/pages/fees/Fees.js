import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate, getStatusBadge } from '../../utils/helpers';
import Pagination from '../../components/Pagination';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../context/AuthContext';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Fees() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const { confirm, ConfirmModal } = useConfirm();
  const [view, setView] = useState('collections');
  const [classes, setClasses] = useState([]);
  const [structures, setStructures] = useState([]);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [studentIdSearch, setStudentIdSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [filterSections, setFilterSections] = useState([]);
  const [studentFilter, setStudentFilter] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFees, setTotalFees] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [structureForm, setStructureForm] = useState({ class_id: '', fee_type: '', amount: '', due_date: '' });
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_mode: 'cash', transaction_id: '', notes: '' });
  const [paymentConfig, setPaymentConfig] = useState({ enabled: false, key_id: '' });
  const [payingFee, setPayingFee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFee, setEditFee] = useState(null);
  const [editForm, setEditForm] = useState({ fee_type: '', amount: '', due_date: '', status: '' });

  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 50 };
      if (classFilter) params.class_id = classFilter;
      if (sectionFilter) params.section_id = sectionFilter;
      if (studentFilter) params.student_id = studentFilter;
      if (statusFilter) params.status = statusFilter;
      if (studentIdSearch) params.search = studentIdSearch;
      else if (search && !studentFilter) params.search = search;
      const res = await api.get('/api/fees/', { params });
      setFees(res.data.fees || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalFees(res.data.total || 0);
    } catch {
      toast.error('Failed to fetch fees');
    } finally {
      setLoading(false);
    }
  }, [classFilter, studentFilter, statusFilter, search, studentIdSearch, page]);

  const fetchStructures = useCallback(async () => {
    try {
      const res = await api.get('/api/fees/structures');
      setStructures(res.data);
    } catch {
      toast.error('Failed to fetch fee structures');
    }
  }, []);

  useEffect(() => {
    const loadClasses = isTeacher
      ? api.get('/api/teachers/my-classes')
      : api.get('/api/classes/');
    loadClasses.then(res => {
      const cls = res.data;
      setClasses(cls);
      if (isTeacher && cls.length > 0) {
        setClassFilter(String(cls[0].id));
      } else if (!isTeacher) {
        fetchFees();
      }
    }).catch(() => {});
    api.get('/api/payments/config').then(res => setPaymentConfig(res.data)).catch(() => {});
  }, [isTeacher, fetchFees]);

  useEffect(() => {
    if (classFilter) {
      api.get('/api/students/?per_page=200&class_id=' + classFilter)
        .then(res => setClassStudents(res.data.students || []))
        .catch(() => setClassStudents([]));
      api.get('/api/classes/sections?class_id=' + classFilter)
        .then(res => setFilterSections(res.data))
        .catch(() => setFilterSections([]));
    } else {
      setClassStudents([]);
      setFilterSections([]);
    }
    setStudentFilter('');
    setSectionFilter('');
  }, [classFilter]);


  const openEditFee = (fee) => {
    setEditFee(fee);
    setEditForm({ fee_type: fee.fee_type, amount: String(fee.amount), due_date: fee.due_date || '', status: fee.status });
    setShowEditModal(true);
  };

  const handleEditFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/fees/' + editFee.id + '/', {
        fee_type: editForm.fee_type,
        amount: Number(editForm.amount),
        due_date: editForm.due_date,
        status: editForm.status
      });
      toast.success('Fee updated');
      setShowEditModal(false);
      setEditFee(null);
      fetchFees();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update fee');
    }
  };

  const handleDeleteFee = async (feeId) => {
    if (!await confirm('Delete Fee', 'Delete this fee record?')) return;
    try {
      await api.delete('/api/fees/' + feeId + '/');
      toast.success('Fee deleted');
      fetchFees();
    } catch {
      toast.error('Failed to delete fee');
    }
  };

  useEffect(() => {
    if (view === 'collections' && classFilter) fetchFees();
  }, [fetchFees, view, classFilter]);

  useEffect(() => {
    if (view === 'structures') fetchStructures();
  }, [fetchStructures, view]);

  const handleGenerateMonthly = async () => {
    if (!await confirm('Generate Fees', 'Generate monthly fees for all active students?')) return;
    try {
      await api.post('/api/fees/generate-monthly');
      toast.success('Monthly fees generated');
      fetchFees();
    } catch {
      toast.error('Failed to generate fees');
    }
  };

  const handleStructureSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingStructure) {
        await api.put('/api/fees/structures/' + editingStructure.id, structureForm);
        toast.success('Fee structure updated');
      } else {
        await api.post('/api/fees/structures', structureForm);
        toast.success('Fee structure added');
      }
      setShowStructureModal(false);
      setEditingStructure(null);
      setStructureForm({ class_id: '', fee_type: '', amount: '', due_date: '' });
      fetchStructures();
    } catch {
      toast.error('Failed to save fee structure');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditStructure = (s) => {
    setEditingStructure(s);
    setStructureForm({
      class_id: String(s.class_id),
      fee_type: s.fee_type,
      amount: String(s.amount),
      due_date: s.due_date || ''
    });
    setShowStructureModal(true);
  };

  const handleDeleteStructure = async (id) => {
    if (!await confirm('Delete Fee Structure', 'Are you sure you want to delete this fee structure?')) return;
    try {
      await api.delete('/api/fees/structures/' + id);
      toast.success('Fee structure deleted');
      fetchStructures();
    } catch {
      toast.error('Failed to delete fee structure');
    }
  };

  const openPayModal = (fee) => {
    setSelectedFee(fee);
    setPaymentForm({ amount: fee.balance || fee.amount, payment_mode: 'cash', transaction_id: '', notes: '' });
    setShowModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedFee || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/api/fees/pay', {
        fee_id: selectedFee.id,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_mode,
        transaction_id: paymentForm.transaction_id,
        notes: paymentForm.notes,
      });
      toast.success('Payment recorded');
      setShowModal(false);
      setSelectedFee(null);
      fetchFees();
    } catch {
      toast.error('Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayOnline = async (fee) => {
    setPayingFee(fee.id);
    try {
      if (paymentConfig.demo_mode) {
        await api.post('/api/payments/demo-pay', { fee_ids: [fee.id] });
        toast.success('Demo payment successful! (no real money)');
        fetchFees();
        setPayingFee(null);
        return;
      }

      const ready = await loadRazorpayScript();
      if (!ready) { toast.error('Failed to load payment gateway'); setPayingFee(null); return; }

      const orderRes = await api.post('/api/payments/create-order', { fee_ids: [fee.id] });
      const { order_id, amount, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount: amount,
        currency: 'INR',
        name: 'School ERP',
        description: fee.fee_type,
        order_id: order_id,
        handler: async (response) => {
          try {
            await api.post('/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              fee_ids: [fee.id],
            });
            toast.success('Payment successful!');
            fetchFees();
          } catch {
            toast.error('Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => setPayingFee(null),
        },
        prefill: {
          email: localStorage.getItem('user_email') || '',
          contact: '',
        },
        theme: { color: '#4F46E5' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { toast.error('Payment failed'); setPayingFee(null); });
      rzp.open();
    } catch {
      toast.error('Failed to initiate payment');
      setPayingFee(null);
    }
  };

  const renderCollections = () => (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-4 flex-1">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setStudentIdSearch(''); }}
              className="input-field"
            />
          </div>
          <div className="w-36">
            <input
              type="text"
              placeholder="Student ID (SCH...)"
              value={studentIdSearch}
              onChange={e => { setStudentIdSearch(e.target.value); setSearch(''); }}
              className="input-field"
            />
          </div>
          <div className="w-40">
            <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setStudentFilter(''); setSearch(''); setStudentIdSearch(''); }} className="input-field">
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {classFilter && (
            <div className="w-40">
              <select value={sectionFilter} onChange={e => { setSectionFilter(e.target.value); setStudentFilter(''); }} className="input-field">
                <option value="">All Sections</option>
                {filterSections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {classFilter && (
            <div className="w-44">
              <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="input-field">
                <option value="">All Students</option>
                {classStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id})</option>
                ))}
              </select>
            </div>
          )}
          <div className="w-36">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
        {!isTeacher && <button onClick={handleGenerateMonthly} className="btn-primary whitespace-nowrap">+ Generate Monthly Fees</button>}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">Student</th>
              <th className="table-cell">Class</th>
              <th className="table-cell">Fee Type</th>
              <th className="table-cell text-right">Amount</th>
              <th className="table-cell text-right">Paid</th>
              <th className="table-cell text-right">Balance</th>
              <th className="table-cell">Due Date</th>
              <th className="table-cell">Status</th>
              <th className="table-cell text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="table-cell text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" />
                </td>
              </tr>
            ) : fees.length === 0 ? (
              <tr>
                <td colSpan="9" className="table-cell text-center text-gray-400 py-8">No fee records found</td>
              </tr>
            ) : fees.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{f.student_name}</td>
                <td className="table-cell">{f.class_name}</td>
                <td className="table-cell">{f.fee_type}</td>
                <td className="table-cell text-right">{'\u20B9'}{f.amount?.toLocaleString()}</td>
                <td className="table-cell text-right text-green-600">{'\u20B9'}{(f.paid_amount || 0)?.toLocaleString()}</td>
                <td className="table-cell text-right text-red-600">{'\u20B9'}{(f.balance || f.amount)?.toLocaleString()}</td>
                <td className="table-cell">{f.due_date ? formatDate(f.due_date) : '-'}</td>
                <td className="table-cell">
                  <span className={getStatusBadge(f.status)}>{f.status}</span>
                </td>
                <td className="table-cell text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditFee(f)} className="text-sm font-medium text-primary-600 hover:text-primary-800">Edit</button>
                    <button onClick={() => handleDeleteFee(f.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Del</button>
                    <button
                      onClick={() => openPayModal(f)}
                      className={'text-sm font-medium ' + (f.status === 'paid' ? 'text-gray-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-800')}
                      disabled={f.status === 'paid'}
                    >
                      Offline
                    </button>
                    {f.status !== 'paid' && (
                      <button
                        onClick={() => handlePayOnline(f)}
                        disabled={payingFee === f.id}
                        className="text-sm font-medium text-green-600 hover:text-green-800 disabled:text-gray-400"
                      >
                        {payingFee === f.id ? '...' : paymentConfig.demo_mode ? 'Demo Pay' : 'Online'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={totalFees} onPageChange={setPage} />
      </div>
    </div>
  );

  const renderStructures = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="w-56">
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="input-field">
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowStructureModal(true)} className="btn-primary">+ Add Fee Type</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">Class</th>
              <th className="table-cell">Fee Type</th>
              <th className="table-cell text-right">Amount</th>
              <th className="table-cell">Due Date</th>
              <th className="table-cell text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {structures
              .filter(s => !classFilter || s.class_id === parseInt(classFilter))
              .map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{s.class_name}</td>
                  <td className="table-cell">{s.fee_type}</td>
                  <td className="table-cell text-right">{'\u20B9'}{s.amount?.toLocaleString()}</td>
                  <td className="table-cell">{s.due_date ? 'Day ' + s.due_date : '-'}</td>
                  <td className="table-cell text-right">
                    <button onClick={() => openEditStructure(s)} className="text-primary-600 hover:text-primary-800 mr-2">Edit</button>
                    <button onClick={() => handleDeleteStructure(s.id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            {structures.length === 0 && (
              <tr>
                <td colSpan="5" className="table-cell text-center text-gray-400 py-8">No fee structures defined</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showStructureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editingStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}</h3>
              <button onClick={() => { setShowStructureModal(false); setEditingStructure(null); setStructureForm({ class_id: '', fee_type: '', amount: '', due_date: '' }); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleStructureSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={structureForm.class_id}
                  onChange={e => setStructureForm({ ...structureForm, class_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                <select
                  value={structureForm.fee_type}
                  onChange={e => setStructureForm({ ...structureForm, fee_type: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Fee Type</option>
                  <option value="Tuition Fee">Tuition Fee</option>
                  <option value="Admission Fee">Admission Fee</option>
                  <option value="Exam Fee">Exam Fee</option>
                  <option value="Library Fee">Library Fee</option>
                  <option value="Sports Fee">Sports Fee</option>
                  <option value="Transport Fee">Transport Fee</option>
                  <option value="Lab Fee">Lab Fee</option>
                  <option value="Annual Fee">Annual Fee</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({'\u20B9'})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={structureForm.amount}
                  onChange={e => setStructureForm({ ...structureForm, amount: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={structureForm.due_date}
                  onChange={e => setStructureForm({ ...structureForm, due_date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowStructureModal(false); setEditingStructure(null); setStructureForm({ class_id: '', fee_type: '', amount: '', due_date: '' }); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editingStructure ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="page-title">Fees</h1>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('collections')}
          className={'px-4 py-2 rounded-lg text-sm font-medium ' + (view === 'collections' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
        >
          Collections
        </button>
        <button
          onClick={() => setView('structures')}
          className={'px-4 py-2 rounded-lg text-sm font-medium ' + (view === 'structures' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
        >
          Fee Structure
        </button>
      </div>

      <div className="card">
        {view === 'collections' && renderCollections()}
        {view === 'structures' && renderStructures()}
      </div>

      {showEditModal && editFee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Edit Fee</h3>
              <button onClick={() => { setShowEditModal(false); setEditFee(null); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-sm text-gray-600"><span className="font-medium">{editFee.student_name}</span> - Current: {'\u20B9'}{editFee.amount?.toLocaleString()}</p>
            </div>
            <form onSubmit={handleEditFeeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                <select value={editForm.fee_type} onChange={e => setEditForm({...editForm, fee_type: e.target.value})} className="input-field" required>
                  <option value="Tuition Fee">Tuition Fee</option>
                  <option value="Library Fee">Library Fee</option>
                  <option value="Sports Fee">Sports Fee</option>
                  <option value="Transport Fee">Transport Fee</option>
                  <option value="Exam Fee">Exam Fee</option>
                  <option value="Admission Fee">Admission Fee</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({'\u20B9'})</label>
                <input type="number" min="0" step="0.01" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="input-field">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setEditFee(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update Fee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && selectedFee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Record Payment</h3>
              <button onClick={() => { setShowModal(false); setSelectedFee(null); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{selectedFee.student_name}</span> - {selectedFee.fee_type}
              </p>
              <p className="text-sm text-gray-500">
                Total: {'\u20B9'}{selectedFee.amount?.toLocaleString()} |
                Paid: {'\u20B9'}{(selectedFee.paid_amount || 0)?.toLocaleString()} |
                Balance: {'\u20B9'}{(selectedFee.balance || selectedFee.amount)?.toLocaleString()}
              </p>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({'\u20B9'})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={selectedFee.balance || selectedFee.amount}
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentForm.payment_mode}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                  className="input-field"
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (optional)</label>
                <input
                  type="text"
                  value={paymentForm.transaction_id}
                  onChange={e => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setSelectedFee(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Recording...' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}
