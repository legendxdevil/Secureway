import { useStore } from './store';

let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectDelay = 1000; // Start at 1s

export const connectWebSocket = (token: string) => {
  if (ws) {
    ws.close();
  }

  const wsUrl = `ws://localhost:8080/ws?token=${token}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('SecureWay WebSocket Connected');
    const store = useStore.getState();
    store.setWsConnected(true);
    store.setWsReconnecting(false);
    reconnectDelay = 1000; // Reset backoff on success
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const { event: wsEvent, payload } = data;

      const store = useStore.getState();

      switch (wsEvent) {
        case 'scan.queued':
          store.updateScanProgress(payload.scan_id, 'queued', 5);
          store.addScanLog(payload.scan_id, '🚀 Scan job added to in-memory queue.');
          break;
        case 'scan.progress':
          store.updateScanProgress(payload.scan_id, payload.stage, payload.percent);
          break;
        case 'scan.log':
          store.addScanLog(payload.scan_id, payload.line);
          break;
        case 'scan.completed':
          store.updateScanProgress(payload.scan_id, 'completed', 100);
          break;
        case 'alert.new':
          store.addAlert(payload);
          break;
        default:
          console.warn('Unknown WebSocket event:', wsEvent);
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  };

  ws.onclose = () => {
    console.log('SecureWay WebSocket Disconnected, trying to reconnect...');
    ws = null;
    
    const store = useStore.getState();
    store.setWsConnected(false);
    
    // Attempt reconnect after exponential backoff delay if authenticated
    const currentToken = store.token;
    if (currentToken) {
      store.setWsReconnecting(true);
      reconnectTimer = setTimeout(() => {
        connectWebSocket(currentToken);
      }, reconnectDelay);
      
      // Exponentially increase delay up to 16 seconds
      reconnectDelay = Math.min(reconnectDelay * 2, 16000);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
  };
};

export const disconnectWebSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  reconnectDelay = 1000;
};
