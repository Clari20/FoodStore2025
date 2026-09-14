/** Detalle completo de un pedido: cabecera, ítems y historial de estados. */
import { useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { usePedido } from "../../hooks/usePedidos";
import { usePedidosWebSocket, type PedidoWsMessage } from "../../hooks/usePedidosWebSocket";
import PedidoTimeline from "../../components/PedidoTimeline";
import { PaymentButton } from "../../components/PaymentButton";
import { useReordenar } from "../../hooks/useReordenar";
import { useIngredientesPublicos } from "../../hooks/useIngredientes";
import { parseBackendDate, ARGENTINA_TIME_ZONE } from "../../utils/dates";


const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  CONFIRMADO: "bg-blue-100 text-blue-800",
  EN_PREP: "bg-orange-100 text-orange-800",
  LISTO: "bg-emerald-100 text-emerald-800",
  EN_CAMINO: "bg-purple-100 text-purple-800",
  ENTREGADO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_PREP: "En preparación",
  LISTO: "Listo",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

interface Props {
  pedidoId: number;
  backTo?: string;
  backLabel?: string;
  showReorder?: boolean;
}

export default function PedidoDetalleGrid({ pedidoId, backTo, backLabel = "Volver", showReorder = true }: Props) {
  const { data: pedido, isLoading, isError } = usePedido(pedidoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { reordenar, isLoading: isReordenando } = useReordenar();

  const { isConnected, subscribeToOrder } = usePedidosWebSocket({
    enabled: !!pedido,
    onMessage: useCallback(
      (msg: PedidoWsMessage) => {
        if (msg.event !== "ERROR" && msg.event !== "SUBSCRIBED") {
          queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] });
        }
      },
      [queryClient, pedidoId],
    ),
  });

  useEffect(() => {
    if (isConnected && pedido) {
      subscribeToOrder(pedido.id);
    }
  }, [isConnected, pedido, subscribeToOrder]);
  
  // Fetch public ingredients to map IDs to names for personalizacion
  const { data: ingredientes } = useIngredientesPublicos();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !pedido) {
    return (
      <div className="text-center py-16 text-gray-500">
        No se encontró el pedido o no tenés permiso para verlo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={16} /> {backLabel}
      </button>

      {/* Cabecera */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Pedido #{pedido.id}</h2>
            <p className="text-sm text-gray-500">
              {parseBackendDate(pedido.created_at).toLocaleDateString("es-AR", {
                timeZone: ARGENTINA_TIME_ZONE,
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span
            className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
              ESTADO_BADGE[pedido.estado_codigo] || "bg-gray-100 text-gray-800"
            }`}
          >
            {ESTADO_LABEL[pedido.estado_codigo] || pedido.estado_codigo}
          </span>
          {showReorder && (
            <button
              onClick={() => reordenar(pedido.id)}
              disabled={isReordenando}
              className="text-sm font-semibold px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={isReordenando ? "animate-spin" : ""} />
              Volver a pedir
            </button>
          )}
        </div>
        <PedidoTimeline estado={pedido.estado_codigo} isRetiro={pedido.direccion_id === null} />

        {/* Info de pago */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Forma de pago</p>
            <p className="font-semibold text-gray-900">{pedido.forma_pago_codigo}</p>
          </div>
          <div>
            <p className="text-gray-500">Subtotal</p>
            <p className="font-semibold text-gray-900">
              ${Number(pedido.subtotal).toLocaleString("es-AR")}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Costo de envío</p>
            <p className="font-semibold text-gray-900">
              ${Number(pedido.costo_envio).toLocaleString("es-AR")}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total</p>
            <p className="font-bold text-green-dark text-lg">
              ${Number(pedido.total).toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        {pedido.notas && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-500 text-sm">Notas</p>
            <p className="text-gray-800 text-sm mt-1">{pedido.notas}</p>
          </div>
        )}

        {pedido.estado_codigo === "CANCELADO" && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-red-800 font-bold text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                Pedido Cancelado
              </p>
              <p className="text-red-700 text-sm mt-1.5">
                <span className="font-semibold">Motivo:</span>{" "}
                {pedido.historial?.find((h) => h.estado_hacia === "CANCELADO")?.motivo || (
                  <span className="italic text-red-500/70">No se especificó motivo de cancelación.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {pedido.forma_pago_codigo === "MERCADOPAGO" && pedido.estado_codigo === "PENDIENTE" && (
          <div className="mt-6 pt-4 border-t border-gray-100 max-w-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Pago requerido</h4>
            <PaymentButton pedidoId={pedido.id} monto={Number(pedido.total)} />
          </div>
        )}
      </div>


      {/* Ítems del pedido */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Productos</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">Producto</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Cantidad</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio unit.</th>
              <th className="text-right px-6 py-3 font-semibold text-gray-600">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pedido.detalles.map((detalle, idx) => {
              const removidosNombres = detalle.personalizacion 
                ? detalle.personalizacion.map(id => (ingredientes || []).find(i => i.id === id)?.nombre).filter(Boolean)
                : [];
              
              return (
              <tr key={`${detalle.producto_id}-${idx}`}>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {detalle.nombre_snapshot}
                  {removidosNombres.length > 0 && (
                    <div className="text-[11px] font-bold text-red-500 mt-0.5 leading-tight">
                      Sin: {removidosNombres.join(", ")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-center text-gray-600">{detalle.cantidad}</td>
                <td className="px-4 py-4 text-right text-gray-600">
                  ${Number(detalle.precio_snapshot).toLocaleString("es-AR")}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                  ${Number(detalle.subtotal_snap).toLocaleString("es-AR")}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Historial de estados */}
      {pedido.historial.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Historial</h3>
          <div className="space-y-3">
            {pedido.historial.map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-main flex-shrink-0" />
                <span className="text-gray-500 w-36 flex-shrink-0">
                  {parseBackendDate(h.created_at).toLocaleDateString("es-AR", {
                    timeZone: ARGENTINA_TIME_ZONE,
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-gray-800">
                  {h.estado_desde
                    ? `${ESTADO_LABEL[h.estado_desde] ?? h.estado_desde} → `
                    : "Creado → "}
                  <span className="font-semibold">
                    {ESTADO_LABEL[h.estado_hacia] ?? h.estado_hacia}
                  </span>
                </span>
                {h.motivo && (
                  <span className="text-gray-400 italic">· {h.motivo}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
