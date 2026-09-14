import { create } from "zustand";

export interface PedidoWsMessage {
  event: string;
  data: unknown;
}

interface WsState {
  isConnected: boolean;
  ws: WebSocket | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  listeners: Set<(msg: PedidoWsMessage) => void>;
  connect: (apiUrl: string) => void;
  disconnect: () => void;
  addListener: (listener: (msg: PedidoWsMessage) => void) => void;
  removeListener: (listener: (msg: PedidoWsMessage) => void) => void;
  subscribeToOrder: (orderId: number) => void;
  unsubscribeFromOrder: (orderId: number) => void;
}

export const useWsStore = create<WsState>((set, get) => ({
  isConnected: false,
  ws: null,
  reconnectTimer: null,
  listeners: new Set(),

  addListener: (listener) => {
    const newListeners = new Set(get().listeners);
    newListeners.add(listener);
    set({ listeners: newListeners });
  },

  removeListener: (listener) => {
    const newListeners = new Set(get().listeners);
    newListeners.delete(listener);
    set({ listeners: newListeners });
  },

  connect: (apiUrl) => {
    const { ws: currentWs, reconnectTimer } = get();
    if (currentWs) return; // Already connecting/connected

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      set({ reconnectTimer: null });
    }

    const url = new URL(apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/api/v1/pedidos/ws";
    url.search = "";

    const ws = new WebSocket(url.toString());
    set({ ws });

    ws.onopen = () => {
      // Ignorar sockets fantasma de un ciclo de connect/disconnect anterior
      // (p.ej. el doble montaje de React StrictMode) que ya fueron reemplazados.
      if (get().ws !== ws) return;
      set({ isConnected: true });
      get().listeners.forEach(l => l({ event: "WS_CONNECTED", data: null }));
    };

    ws.onmessage = (event) => {
      if (get().ws !== ws) return;
      try {
        const msg = JSON.parse(event.data) as PedidoWsMessage;
        get().listeners.forEach(l => l(msg));
      } catch {
        get().listeners.forEach(l => l({ event: "ERROR", data: { detail: "Mensaje WebSocket invalido" } }));
      }
    };

    ws.onclose = (event) => {
      // Si este socket ya no es el que el store tiene activo, no pisar
      // el estado de la conexión vigente (evita el bug de carrera).
      if (get().ws !== ws) return;
      set({ isConnected: false, ws: null });
      if (event.code === 1000 || event.code === 1008) return;

      // Simple reconnect logic
      const timer = setTimeout(() => {
        get().connect(apiUrl);
      }, 3000);
      set({ reconnectTimer: timer });
    };
  },

  disconnect: () => {
    const { ws, reconnectTimer, listeners } = get();
    if (listeners.size > 0) return; // Only disconnect if no one is listening
    
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener("open", () => ws.close(1000), { once: true });
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000);
      }
    }
    set({ ws: null, isConnected: false, reconnectTimer: null });
  },

  subscribeToOrder: (orderId) => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "subscribe-order", order_id: orderId }));
    }
  },

  unsubscribeFromOrder: (orderId) => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "unsubscribe-order", order_id: orderId }));
    }
  },
}));
