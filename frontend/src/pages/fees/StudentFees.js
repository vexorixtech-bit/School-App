import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate, getStatusBadge } from '../../utils/helpers';

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

export default function StudentFees() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingFee, setPayingFee] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({ enabled: false, key_id: '' });

  useEffect(() => {
    api.get('/api/payments/config').then(res => setPaymentConfig(res.data)).catch(() => {});
  }, []);

  const fetchMyFees = useCallback(async () => {
    try {
      const res = await api.get('/api/fees/my-fees');
      setData(res.data);
    } catch {
      toast.error('Failed to load fees');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchMyFees(); }, []);

  useEffect(() => {
    const handler = () => fetchMyFees();
    window.addEventListener('payment-updated', handler);
    return () => window.removeEventListener('payment-updated', handler);
  }, [fetchMyFees]);

  const handlePayOnline = async (fee) => {
    setPayingFee(fee.id);
    try {
      if (paymentConfig.demo_mode) {
        await api.post('/api/payments/demo-pay', { fee_ids: [fee.id] });
        toast.success('Demo payment successful! (no real money)');
        fetchMyFees();
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
            fetchMyFees();
          } catch {
            toast.error('Payment verification failed');
          }
        },
        modal: { ondismiss: () => setPayingFee(null) },
        prefill: { email: localStorage.getItem('user_email') || '', contact: '' },
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

  const handleDownloadReceipt = async (feeId) => {
    try {
      const res = await api.get('/api/fees/' + feeId + '/receipt', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipt_' + feeId + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download receipt');
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="page-title">My Fees</h1>
        <div className="card flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (!data || !data.fees || data.fees.length === 0) {
    return (
      <div>
        <h1 className="page-title">My Fees</h1>
        <div className="card text-center py-16 text-gray-400">No fee records found</div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Due', value: `₹${data.total_due?.toLocaleString() || 0}`, color: 'text-red-600' },
    { label: 'Total Fees', value: `₹${data.fees.reduce((s, f) => s + f.amount, 0).toLocaleString()}`, color: 'text-gray-900' },
    { label: 'Paid', value: `₹${data.fees.reduce((s, f) => s + (f.paid_amount || 0), 0).toLocaleString()}`, color: 'text-green-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">My Fees</h1>
        <span className="text-sm text-gray-500">{data.student_name} - {data.class_name}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="card">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
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
            {data.fees.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{f.fee_type}</td>
                <td className="table-cell text-right">₹{f.amount?.toLocaleString()}</td>
                <td className="table-cell text-right text-green-600">₹{(f.paid_amount || 0).toLocaleString()}</td>
                <td className="table-cell text-right text-red-600">₹{Math.max(0, f.amount - (f.paid_amount || 0)).toLocaleString()}</td>
                <td className="table-cell">{f.due_date ? formatDate(f.due_date) : '-'}</td>
                <td className="table-cell"><span className={getStatusBadge(f.status)}>{f.status}</span></td>
                <td className="table-cell text-right">
                  {f.paid_amount > 0 ? (
                    <button
                      onClick={() => handleDownloadReceipt(f.id)}
                      className="text-sm font-medium text-primary-600 hover:text-primary-800"
                    >
                      Receipt
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePayOnline(f)}
                      disabled={payingFee === f.id}
                      className="text-sm font-medium text-green-600 hover:text-green-800 disabled:text-gray-400"
                    >
                      {payingFee === f.id ? 'Processing...' : paymentConfig.demo_mode ? 'Demo Pay' : 'Pay Online'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
