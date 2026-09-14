/** Grilla de pedidos del cliente con badge de estado. */
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { XCircle, X, RefreshCw } from "lucide-react";
import { usePedidos, useCancelarPedido } from "../../hooks/usePedidos";
import { useReordenar } from "../../hooks/useReordenar";
import { usePedidosWebSocket, type PedidoWsMessage } from "../../hooks/usePedidosWebSocket";
import { useAuthStore } from "../../store/authStore";
import PedidoTimeline from "../../components/PedidoTimeline";
import type { PedidosFilters, PedidoResponse } from "../../types";
import { parseBackendDate, ARGENTINA_TIME_ZONE } from "../../utils/dates";

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:  "bg-yellow-100 text-yellow-800",
  CONFIRMADO: "bg-blue-100 text-blue-800",
  EN_PREP:    "bg-orange-100 text-orange-800",
  LISTO:      "bg-emerald-100 text-emerald-800",
  EN_CAMINO:  "bg-purple-100 text-purple-800",
  ENTREGADO:  "bg-green-100 text-green-800",
  CANCELADO:  "bg-red-100 text-red-800",
};

export const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:  "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_PREP:    "En preparación",
  LISTO:      "Listo",
  EN_CAMINO:  "En camino",
  ENTREGADO:  "Entregado",
  CANCELADO:  "Cancelado",
};

// Estados en los que el cliente puede cancelar
const PUEDE_CANCELAR = ["PENDIENTE", "CONFIRMADO"];

// ─── Modal de confirmación de cancelación ─────────────────────────────────────

interface ConfirmCancelModalProps {
  pedido: PedidoResponse;
  onClose: () => void;
  onConfirmar: (motivo: string) => void;
  isPending: boolean;
}

function ConfirmCancelModal({ pedido, onClose, onConfirmar, isPending }: ConfirmCancelModalProps) {
  const [motivo, setMotivo] = useState("");

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col animate-in fade-in duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <XCircle size={20} className="text-red-500" />
              <h2 className="font-bold text-gray-900">Cancelar pedido #{pedido.id}</h2>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Cuerpo */}
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro que querés cancelar este pedido por{" "}
              <span className="font-semibold text-gray-900">
                ${Number(pedido.total).toLocaleString("es-AR")}
              </span>?
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Ej: Me equivoqué en el pedido, ya no lo necesito..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-2">
            <button
              onClick={() => onConfirmar(motivo)}
              disabled={isPending || !motivo.trim()}
              className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  Confirmar cancelación
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isPending}
              className="w-full text-sm text-gray-500 font-medium hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

interface Props {
  filters: PedidosFilters;
}

export default function MisPedidosGrid({ filters }: Props) {
  const queryClient     = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading } = usePedidos(filters);
  const cancelar        = useCancelarPedido();
  const { reordenar, isLoading: isReordenando } = useReordenar();

  const [pedidoACancelar, setPedidoACancelar] = useState<PedidoResponse | null>(null);

  const { isConnected, subscribeToOrder } = usePedidosWebSocket({
    enabled: isAuthenticated,
    onMessage: useCallback(
      (msg: PedidoWsMessage) => {
        if (msg.event !== "ERROR" && msg.event !== "SUBSCRIBED") {
          const updatedPedido = msg.data as PedidoResponse;

          if (updatedPedido && updatedPedido.id) {
            // Actualizar la caché de la lista directamente para respuesta instantánea
            queryClient.setQueryData(["pedidos", filters], (oldData: any) => {
              if (!oldData || !oldData.items) return oldData;
              return {
                ...oldData,
                items: oldData.items.map((p: PedidoResponse) =>
                  p.id === updatedPedido.id ? updatedPedido : p
                ),
              };
            });
            // También invalidar por las dudas para asegurar consistencia
            queryClient.invalidateQueries({ queryKey: ["pedidos"] });
          }
        }
      },
      [queryClient, filters],
    ),
  });

  useEffect(() => {
    if (isConnected && data?.items) {
      data.items
        .filter((pedido) => !["ENTREGADO", "CANCELADO"].includes(pedido.estado_codigo))
        .forEach((pedido) => subscribeToOrder(pedido.id));
    }
  }, [isConnected, data?.items, subscribeToOrder]);

  const confirmarCancelacion = (motivo: string) => {
    if (!pedidoACancelar) return;
    cancelar.mutate(
      { id: pedidoACancelar.id, motivo },
      { onSuccess: () => setPedidoACancelar(null) },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return <div className="text-center py-16 text-gray-500">No tenés pedidos todavía.</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {data.items.map((pedido) => (
          <div key={pedido.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <Link
              to={`/pedidos/${pedido.id}`}
              className="block p-5"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-gray-900">Pedido #{pedido.id}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    ESTADO_BADGE[pedido.estado_codigo] || "bg-gray-100 text-gray-800"
                  }`}>
                    {ESTADO_LABEL[pedido.estado_codigo] || pedido.estado_codigo}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {parseBackendDate(pedido.created_at).toLocaleDateString("es-AR", {
                    timeZone: ARGENTINA_TIME_ZONE,
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {pedido.forma_pago_codigo}
                </p>
              </div>
              <p className="font-bold text-gray-900 text-lg">
                ${Number(pedido.total).toLocaleString("es-AR")}
              </p>
              <PedidoTimeline estado={pedido.estado_codigo} compact isRetiro={pedido.direccion_id === null} />
            </Link>

            {/* Botones de acción — fuera del Link para no propagar el click */}
            <div className="px-5 pb-4 flex items-center gap-3">
              <button
                onClick={() => reordenar(pedido.id)}
                disabled={isReordenando}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={isReordenando ? "animate-spin" : ""} />
                Volver a pedir
              </button>
              {PUEDE_CANCELAR.includes(pedido.estado_codigo) && (
                <button
                  onClick={() => setPedidoACancelar(pedido)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <XCircle size={14} />
                  Cancelar pedido
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmación */}
      {pedidoACancelar && (
        <ConfirmCancelModal
          pedido={pedidoACancelar}
          isPending={cancelar.isPending}
          onClose={() => setPedidoACancelar(null)}
          onConfirmar={confirmarCancelacion}
        />
      )}
    </>
  );
}