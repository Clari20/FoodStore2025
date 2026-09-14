/** Página mis pedidos del cliente — wrapper fino sobre MisPedidosList. */
import { useState } from "react";
import MisPedidosGrid from "../features/pedidos/MisPedidosGrid";
import { usePedidos } from "../hooks/usePedidos";
import type { PedidosFilters } from "../types";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_PREP: "En preparación",
  LISTO: "Listo",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export default function MisPedidosPage() {
  const [filters, setFilters] = useState<PedidosFilters>({
    page: 1,
    per_page: 10,
  });

  const { data } = usePedidos(filters);

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
          <select
            value={filters.estado || ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, estado: e.target.value || undefined, page: 1 }))
            }
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <MisPedidosGrid filters={filters} />

        {/* Paginación */}
        {data && data.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              disabled={filters.page === 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {filters.page} / {data.pages}
            </span>
            <button
              disabled={filters.page === data.pages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
