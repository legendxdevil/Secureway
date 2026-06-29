import { create } from 'zustand';
import { User, Alert } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

interface AlertState {
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  markAlertReadInStore: (id: string) => void;
}

interface ScanProgress {
  stage: string;
  percent: number;
}

interface ScanState {
  scanProgress: Record<string, ScanProgress>; // scanId -> progress
  scanLogs: Record<string, string[]>; // scanId -> array of log lines
  updateScanProgress: (scanId: string, stage: string, percent: number) => void;
  addScanLog: (scanId: string, line: string) => void;
  clearScanData: (scanId: string) => void;
}

interface WsState {
  wsConnected: boolean;
  wsReconnecting: boolean;
  setWsConnected: (connected: boolean) => void;
  setWsReconnecting: (reconnecting: boolean) => void;
}

type AppStore = AuthState & AlertState & ScanState & WsState;

export const useStore = create<AppStore>((set) => ({
  // Auth state
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
  
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  clearAuth: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, alerts: [] });
  },

  // Alerts state
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => {
    // Prevent duplicate alerts
    if (state.alerts.some((a) => a.id === alert.id)) {
      return state;
    }
    return { alerts: [alert, ...state.alerts] };
  }),
  markAlertReadInStore: (id) => set((state) => ({
    alerts: state.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
  })),

  // Scan state
  scanProgress: {},
  scanLogs: {},
  
  updateScanProgress: (scanId, stage, percent) => set((state) => ({
    scanProgress: {
      ...state.scanProgress,
      [scanId]: { stage, percent },
    },
  })),
  
  addScanLog: (scanId, line) => set((state) => {
    const logs = state.scanLogs[scanId] || [];
    return {
      scanLogs: {
        ...state.scanLogs,
        [scanId]: [...logs, line],
      },
    };
  }),
  
  clearScanData: (scanId) => set((state) => {
    const nextProgress = { ...state.scanProgress };
    const nextLogs = { ...state.scanLogs };
    delete nextProgress[scanId];
    delete nextLogs[scanId];
    return {
      scanProgress: nextProgress,
      scanLogs: nextLogs,
    };
  }),

  // WS state
  wsConnected: true,
  wsReconnecting: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setWsReconnecting: (reconnecting) => set({ wsReconnecting: reconnecting }),
}));
