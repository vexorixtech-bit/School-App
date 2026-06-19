import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function useWebSocket() {
  const { user, token } = useAuth();
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    if (!token || !user) return;

    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8006';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws?token=' + encodeURIComponent(token);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' || data.type === 'homework') {
          toast.success(data.title || 'New notification', { duration: 4000 });
        } else if (data.type === 'payment_update') {
          toast.success('Payment confirmed!', { duration: 3000 });
          if (window.location.pathname === '/my-fees') {
            window.dispatchEvent(new CustomEvent('payment-updated'));
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(() => connect(), 5000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, user]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);
}
