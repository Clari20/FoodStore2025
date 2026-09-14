import { useEffect } from "react";
import { useWsStore } from "../store/wsStore";
import type { PedidoWsMessage } from "../store/wsStore";

export type { PedidoWsMessage };

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface UsePedidosWebSocketOptions {
  enabled?: boolean;
  onMessage?: (message: PedidoWsMessage) => void;
}

export function usePedidosWebSocket({
  enabled = true,
  onMessage,
}: UsePedidosWebSocketOptions = {}) {
  const { isConnected, connect, disconnect, subscribeToOrder, unsubscribeFromOrder, addListener, removeListener } = useWsStore();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (onMessage) {
      addListener(onMessage);
    }

    connect(API_URL);

    return () => {
      if (onMessage) {
        removeListener(onMessage);
      }
      disconnect();
    };
  }, [enabled, connect, disconnect, addListener, removeListener, onMessage]);

  return { isConnected, subscribeToOrder, unsubscribeFromOrder };
}
