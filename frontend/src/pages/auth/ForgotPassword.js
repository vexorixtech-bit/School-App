import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to email');
    } catch (err) {
      toast.error('Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?w=1200&q=60&auto=compress&cs=tinysrgb)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/85 via-[#1e293b]/80 to-[#0f172a]/85" />
      <div className="w-full max-w-md relative animate-fade-in-up">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Reset Password</h1>
            <p className="text-slate-400 mt-1">Enter your email to receive reset link</p>
          </div>
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 text-2xl">✓</span>
              </div>
              <p className="text-slate-300 mb-4">Reset link has been sent to your email.</p>
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all duration-200 text-sm hover:bg-white/10" placeholder="Enter your email" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/30 hover:from-primary-500 hover:to-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-primary-400 hover:text-primary-300">Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
