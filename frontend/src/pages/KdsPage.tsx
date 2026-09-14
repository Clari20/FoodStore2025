import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, RefreshCw, Truck, Wifi } from "lucide-react";
import { useAvanzarEstado, usePedidosCocina } from "../hooks/usePedidos";
import { usePedidosWebSocket, type PedidoWsMessage } from "../hooks/usePedidosWebSocket";
import type { PedidoResponse } from "../types";
import { formatArgentinaTime } from "../utils/dates";

const ESTADO_LABEL: Record<string, string> = {
  CONFIRMADO: "Confirmados",
  EN_PREP: "En preparacion",
};

const EVENTOS_PEDIDO = new Set([
  "NUEVO_PEDIDO",
  "PEDIDO_CONFIRMADO",
  "PEDIDO_EN_PREPARACION",
  "PEDIDO_LISTO",
  "PEDIDO_EN_CAMINO",
  "PEDIDO_ENTREGADO",
  "PEDIDO_CANCELADO",
  "WS_CONNECTED",
]);

function PedidoKdsCard({
  pedido,
  onAction,
  disabled,
}: {
  pedido: PedidoResponse;
  onAction: (pedido: PedidoResponse) => void;
  disabled: boolean;
}) {
  const isConfirmado = pedido.estado_codigo === "CONFIRMADO";
  const Icon = isConfirmado ? CheckCircle2 : Truck;

  return (
    <article className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">Pedido #{pedido.id}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {formatArgentinaTime(pedido.created_at)}
          </p>
        </div>
        <span className="text-sm font-bold text-gray-900">
          ${Number(pedido.total).toLocaleString("es-AR")}
        </span>
      </div>

      {pedido.notas && (
        <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-md p-2">{pedido.notas}</p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction(pedido)}
        className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
          isConfirmado
            ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
            : "bg-green-100 text-green-800 hover:bg-green-200"
        }`}
      >
        <Icon size={16} />
        {isConfirmado ? "Iniciar preparacion" : "Marcar listo"}
      </button>
      <Link
        to={`/gestion/pedidos/${pedido.id}`}
        state={{ from: "/cocina", backLabel: "Volver a cocina" }}
        className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        Ver detalle
      </Link>
    </article>
  );
}

export default function KdsPage() {
  const queryClient = useQueryClient();
  const avanzarEstado = useAvanzarEstado();
  const { data: pedidos = [], isLoading } = usePedidosCocina();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const { isConnected } = usePedidosWebSocket({
    onMessage: useCallback(
      (msg: PedidoWsMessage) => {
        if (EVENTOS_PEDIDO.has(msg.event)) {
          queryClient.invalidateQueries({ queryKey: ["pedidos"] });
        }
      },
      [queryClient],
    ),
  });

  const handleAction = (pedido: PedidoResponse) => {
    const estado_hacia = pedido.estado_codigo === "CONFIRMADO" ? "EN_PREP" : "LISTO";
    setLoadingId(pedido.id);
    avanzarEstado.mutate(
      { id: pedido.id, data: { estado_hacia } },
      { onSettled: () => setLoadingId(null) },
    );
  };

  const porEstado = {
    CONFIRMADO: pedidos.filter((pedido) => pedido.estado_codigo === "CONFIRMADO"),
    EN_PREP: pedidos.filter((pedido) => pedido.estado_codigo === "EN_PREP"),
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-green-dark">Cocina KDS</h1>
          <p className="text-sm text-gray-500 mt-1">Pedidos confirmados y en preparacion.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 text-xs font-semibold ${isConnected ? "text-green-700" : "text-gray-400"}`}>
            <Wifi size={15} />
            En vivo
          </span>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["pedidos", "cocina"] })}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-main border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(porEstado).map(([estado, items]) => (
            <section key={estado} className="min-h-[420px]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase text-gray-600">{ESTADO_LABEL[estado]}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white/60 py-12 text-center text-sm text-gray-400">
                    Sin pedidos
                  </div>
                ) : (
                  items.map((pedido) => (
                    <PedidoKdsCard
                      key={pedido.id}
                      pedido={pedido}
                      disabled={loadingId === pedido.id || avanzarEstado.isPending}
                      onAction={handleAction}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
