import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

function parseToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setShowTimeoutWarning(false);
  }, []);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/api/auth/me').then(res => {
        setUser(res.data);
      }).catch(() => {
        logout();
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) return;
    const payload = parseToken(token);
    if (!payload || !payload.exp) return;

    const expMs = payload.exp * 1000;
    const warningMs = 5 * 60 * 1000;
    const now = Date.now();
    const timeUntilExpiry = expMs - now;
    const timeUntilWarning = timeUntilExpiry - warningMs;

    if (timeUntilWarning <= 0) {
      if (timeUntilExpiry > 0) {
        setShowTimeoutWarning(true);
      }
      return;
    }

    const warningTimer = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, timeUntilWarning);

    const expiryTimer = setTimeout(() => {
      toast.error('Session expired. Please login again.');
      logout();
    }, timeUntilExpiry);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expiryTimer);
    };
  }, [token, logout]);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    localStorage.setItem('token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, showTimeoutWarning, setShowTimeoutWarning }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
