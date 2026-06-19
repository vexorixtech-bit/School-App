import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Login successful');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?w=1200&q=60&auto=compress&cs=tinysrgb)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/85 via-[#1e293b]/80 to-[#0f172a]/85" />

      <div className="w-full max-w-md relative animate-fade-in-up">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-600/30 animate-glow">
              <span className="text-white text-xl font-bold">SE</span>
            </div>
            <h1 className="text-2xl font-bold text-white">School ERP</h1>
            <p className="text-slate-400 mt-1 text-sm">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all duration-200 text-sm hover:bg-white/10"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all duration-200 text-sm hover:bg-white/10"
                placeholder="Enter password"
                required
              />
            </div>
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-slate-400 hover:text-white transition-colors">Forgot password?</Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/30 hover:from-primary-500 hover:to-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/5">
            <p className="text-xs text-slate-400 font-medium mb-2">Demo Credentials:</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              <p className="text-xs text-slate-500">superadmin / admin123</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">School Management System v1.0</p>
      </div>
    </div>
  );
}
