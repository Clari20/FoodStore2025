/** Grilla de gestión de pedidos — filtros, paginación, botones FSM
 *  + slide-over de stock al hacer clic en Cancelar. */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Info, RotateCcw, Search, X, XCircle } from "lucide-react";
import { usePedidos, useAvanzarEstado, useFormasPago, usePedido } from "../../hooks/usePedidos";
import { usePedidosWebSocket, type PedidoWsMessage } from "../../hooks/usePedidosWebSocket";
import { useResumenStockCancelacion } from "../../hooks/useStockCancelacion";
import { useAuthStore } from "../../store/authStore";
import Pagination from "../../components/Pagination";
import type { PedidoResponse, PedidosFilters } from "../../types";
import { formatArgentinaDate } from "../../utils/dates";

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

const FSM: Record<string, string[]> = {
  PENDIENTE:  ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["EN_PREP", "CANCELADO"],
  EN_PREP:    ["LISTO", "CANCELADO"],
  LISTO:      ["EN_CAMINO", "ENTREGADO", "CANCELADO"],
  EN_CAMINO:  ["ENTREGADO", "CANCELADO"],
};


interface CancelacionSlideOverProps {
  pedido: PedidoResponse;
  isPending: boolean;
  onClose: () => void;
  onConfirmar: () => void;
}

function CancelacionSlideOver({ pedido, isPending, onClose, onConfirmar }: CancelacionSlideOverProps) {
  const { data: detalle, isLoading: loadingDetalle } = usePedido(pedido.id);
  const { resumen, isLoading: loadingStock } = useResumenStockCancelacion(
    detalle?.detalles ?? [],
    pedido.estado_codigo,
  );
  const isLoading = loadingDetalle || loadingStock;

  const recuperaInsumos = pedido.estado_codigo === "PENDIENTE" || pedido.estado_codigo === "CONFIRMADO";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col rounded-2xl max-h-[90vh] animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-red-50">
          <div className="flex items-center gap-3">
            <XCircle className="text-red-500 flex-shrink-0" size={22} />
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Cancelar pedido #{pedido.id}
              </h2>
              <p className="text-xs text-gray-500">
                Revisá el impacto en el stock antes de confirmar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Resumen monetario */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>${Number(pedido.subtotal).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Envío</span>
              <span>${Number(pedido.costo_envio).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${Number(pedido.total).toLocaleString("es-AR")}</span>
            </div>
          </div>

          {/* Impacto en stock */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <RotateCcw size={14} className="text-gray-400" />
              Impacto en el stock
            </h3>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !resumen ? (
              <p className="text-xs text-gray-400 italic">
                No se pudo calcular el impacto en el stock.
              </p>
            ) : (
              <>
                {/* Nota dinámica */}
                <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 mb-3">
                  <Info size={13} className="mt-0.5 flex-shrink-0 text-blue-400" />
                  <p>
                    {recuperaInsumos ? (
                      <>
                        Como el pedido está <strong>{pedido.estado_codigo === "PENDIENTE" ? "Pendiente" : "Confirmado"}</strong>, tanto los ingredientes de productos elaborados como los productos finalizados <strong>se repondrán</strong> al stock.
                      </>
                    ) : (
                      <>
                        Como el pedido ya está en <strong>Preparación</strong> o posterior, los ingredientes elaborados <strong>no se repondrán</strong>. Solo se devolverán productos finalizados (bebidas, etc.).
                      </>
                    )}
                  </p>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {resumen.items.map((item) => (
                    <div
                      key={item.producto_id}
                      className={`rounded-xl p-3.5 border flex items-start gap-3 ${
                        item.stock_repuesto
                          ? "bg-emerald-50 border-emerald-100"
                          : "bg-amber-50 border-amber-100"
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {item.stock_repuesto
                          ? <CheckCircle2 size={18} className="text-emerald-500" />
                          : <AlertTriangle size={18} className="text-amber-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.nombre_snapshot}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            ×{item.cantidad}
                          </span>
                        </div>
                        {item.stock_repuesto ? (
                          <p className="text-xs text-emerald-700 font-medium mt-0.5">
                            +{item.cantidad} unidad{item.cantidad !== 1 ? "es" : ""} devueltas al stock
                          </p>
                        ) : (
                          <div className="mt-0.5">
                            <p className="text-xs text-amber-700 font-medium">
                              Ingredientes no recuperables
                            </p>
                            {item.ingredientes.length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {item.ingredientes.map((ing, i) => (
                                  <span key={ing.nombre}>
                                    <span className={ing.es_alergeno ? "text-red-400 font-medium" : ""}>
                                      {ing.nombre}{ing.es_alergeno ? " ⚠" : ""}
                                    </span>
                                    {i < item.ingredientes.length - 1 && ", "}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Badges totales */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {resumen.total_repuestos > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={11} />
                      {resumen.total_repuestos} repuesto{resumen.total_repuestos !== 1 ? "s" : ""}
                    </span>
                  )}
                  {resumen.total_no_recuperados > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                      <AlertTriangle size={11} />
                      {resumen.total_no_recuperados} sin reposición
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-5 bg-white space-y-3 shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.06)]">
          <button
            onClick={onConfirmar}
            disabled={isPending}
            className="w-full bg-red-500 text-white font-bold py-3.5 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <XCircle size={18} />
                Confirmar cancelación
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-full text-sm text-gray-500 font-medium hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Volver sin cancelar
          </button>
        </div>
      </div>  {/* cierre del panel */}
    </div>    {/* cierre del centrador */}
    </>
  );
}


interface AccionButtonsProps {
  pedido: PedidoResponse;
  onSolicitarCancelacion: (pedido: PedidoResponse) => void;
}

function AccionButtons({ pedido, onSolicitarCancelacion }: AccionButtonsProps) {
  const avanzar = useAvanzarEstado();

  const siguientes = (FSM[pedido.estado_codigo] ?? []).filter((estado) => {
    // Si es retiro en local, no puede ir a EN_CAMINO
    if (pedido.direccion_id === null && estado === "EN_CAMINO") return false;
    // Si es delivery, no puede ir directo a ENTREGADO desde LISTO (debe pasar por EN_CAMINO primero)
    if (pedido.direccion_id !== null && pedido.estado_codigo === "LISTO" && estado === "ENTREGADO") return false;
    // Ocultar transiciones de cocina (Preparación / Listo) del tablero de administración.
    // Estas transiciones se gestionan exclusivamente desde la pantalla de Cocina KDS.
    if (estado === "EN_PREP" || estado === "LISTO") return false;
    return true;
  });

  if (siguientes.length === 0) return <span className="text-xs text-gray-400">—</span>;

  return (
    <div className="flex gap-2 flex-wrap">
      {siguientes.map((estado) =>
        estado === "CANCELADO" ? (
          <button
            key={estado}
            disabled={avanzar.isPending}
            onClick={() => onSolicitarCancelacion(pedido)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 bg-red-100 text-red-700 hover:bg-red-200"
          >
            → Cancelar
          </button>
        ) : (
          <button
            key={estado}
            disabled={avanzar.isPending}
            onClick={() =>
              avanzar.mutate({
                id: pedido.id,
                data: { estado_hacia: estado },
              })
            }
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 bg-green-100 text-green-800 hover:bg-green-200"
          >
            → {ESTADO_LABEL[estado] ?? estado}
          </button>
        )
      )}
    </div>
  );
}

export default function PedidosAdminGrid() {
  const [filters, setFilters]        = useState<PedidosFilters>({ page: 1, per_page: 10 });
  const [idInput, setIdInput]        = useState("");
  const [pedidoACancelar, setPedido] = useState<PedidoResponse | null>(null);
  const [toast, setToast] = useState<{ id: number; mensaje: string } | null>(null);

  const hasRole           = useAuthStore((s) => s.hasRole);
  const canManagePedidos  = hasRole("ADMIN") || hasRole("CAJERO");
  const estadoOptions     = Object.entries(ESTADO_LABEL);

  const queryClient          = useQueryClient();
  const { data, isLoading }  = usePedidos(filters);
  const { data: formasPago } = useFormasPago();
  const avanzar              = useAvanzarEstado();

  usePedidosWebSocket({
    enabled: canManagePedidos,
    onMessage: useCallback(
    (msg: PedidoWsMessage) => {
      if (msg.event !== "ERROR") queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      if (msg.event === "PEDIDO_CANCELADO") {
        const payload = msg.data as { id: number; cancelado_por?: string; motivo_cancelacion?: string };
        const pedidoId = payload.id;
        let msgTexto = `El pedido #${pedidoId} fue cancelado`;
        if (payload.cancelado_por === "cliente") {
          msgTexto = `El cliente canceló el pedido #${pedidoId}`;
        } else if (payload.cancelado_por === "mercadopago") {
          msgTexto = `Pago rechazado: Mercado Pago canceló el pedido #${pedidoId}`;
        } else if (payload.cancelado_por === "operador") {
          msgTexto = `Un operador canceló el pedido #${pedidoId}`;
        }
        setToast({ id: pedidoId, mensaje: msgTexto });
        setTimeout(() => setToast(null), 6000);
      }
    },
    [queryClient],
    ),
  });

  const handleFilter = (key: keyof PedidosFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));

  const applyId = () =>
    setFilters((f) => ({ ...f, id: idInput.trim() || undefined, page: 1 }));

  const confirmarCancelacion = () => {
    if (!pedidoACancelar) return;
    avanzar.mutate(
      {
        id: pedidoACancelar.id,
        data: { estado_hacia: "CANCELADO", motivo: "Cancelado por operador" },
      },
      { onSuccess: () => setPedido(null) },
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-dark">Cajero</h1>
        <p className="text-sm text-gray-500 mt-1">Confirma pedidos y gestiona entrega o envio.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number" min={1} value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyId()}
              onBlur={applyId}
              placeholder="Buscar por ID..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main focus:border-transparent outline-none"
            />
          </div>
          <select value={filters.estado || ""} onChange={(e) => handleFilter("estado", e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main focus:border-transparent outline-none bg-white">
            <option value="">Todos los estados</option>
            {estadoOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filters.forma_pago || ""} onChange={(e) => handleFilter("forma_pago", e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main focus:border-transparent outline-none bg-white">
            <option value="">Todos los pagos</option>
            {formasPago?.map((fp) => <option key={fp.codigo} value={fp.codigo}>{fp.descripcion}</option>)}
          </select>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Desde</span>
            <input type="date" value={filters.fecha_desde || ""}
              onChange={(e) => handleFilter("fecha_desde", e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main focus:border-transparent outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Hasta</span>
            <input type="date" value={filters.fecha_hasta || ""}
              onChange={(e) => handleFilter("fecha_hasta", e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main focus:border-transparent outline-none" />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-main border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data?.items.length ? (
          <div className="text-center py-16 text-gray-500">No hay pedidos con esos filtros.</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] min-h-[450px] overflow-y-auto">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 shadow-sm border-b border-gray-100">
                <tr>
                  {["ID","Usuario","Fecha","Pago","Estado","Total","Acciones"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">#{pedido.id}</td>
                    <td className="px-4 py-3 text-gray-600">#{pedido.usuario_id}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatArgentinaDate(pedido.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{pedido.forma_pago_codigo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_BADGE[pedido.estado_codigo] || "bg-gray-100 text-gray-600"}`}>
                        {ESTADO_LABEL[pedido.estado_codigo] ?? pedido.estado_codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ${Number(pedido.total).toLocaleString("es-AR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {canManagePedidos && (
                          <AccionButtons
                            pedido={pedido}
                            onSolicitarCancelacion={setPedido}
                          />
                        )}
                        <Link
                          to={`/gestion/pedidos/${pedido.id}`}
                          state={{ from: "/pedidos", backLabel: "Volver a pedidos" }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {data && (
        <Pagination
          page={data.page} pages={data.pages} total={data.total}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      )}
      {/* Toast de cancelación por cliente */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white border border-red-200 shadow-xl rounded-2xl px-5 py-4 max-w-sm animate-in slide-in-from-bottom duration-300">
          <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Pedido cancelado por el cliente</p>
            <p className="text-xs text-gray-500 mt-0.5">{toast.mensaje}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {/* Slide-over — se monta solo cuando hay un pedido seleccionado */}
      {pedidoACancelar && (
        <CancelacionSlideOver
          pedido={pedidoACancelar}
          isPending={avanzar.isPending}
          onClose={() => setPedido(null)}
          onConfirmar={confirmarCancelacion}
        />
      )}
    </div>
  );
}