'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { connectWebSocket, disconnectWebSocket } from '@/lib/ws';
import { api } from '@/lib/api';

export default function RootProvider({ children }: { children: React.ReactNode }) {
  const { token, setAuth, clearAuth } = useStore();

  useEffect(() => {
    if (token) {
      api.auth.me()
        .then((user) => {
          setAuth(user, token);
          connectWebSocket(token);
        })
        .catch((err) => {
          console.error('Session validation failed:', err);
          clearAuth();
          disconnectWebSocket();
        });
    }

    return () => {
      disconnectWebSocket();
    };
  }, [token, setAuth, clearAuth]);

  return <>{children}</>;
}
