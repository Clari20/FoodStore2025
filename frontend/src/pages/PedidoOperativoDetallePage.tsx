import { Navigate, useLocation, useParams } from "react-router-dom";
import PedidoDetalleGrid from "../features/pedidos/PedidoDetalleGrid";
import { useAuthStore } from "../store/authStore";

type LocationState = {
  from?: string;
  backLabel?: string;
};

export default function PedidoOperativoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const pedidoId = Number(id);
  const location = useLocation();
  const hasRole = useAuthStore((s) => s.hasRole);

  const state = (location.state ?? {}) as LocationState;
  const fallbackPath = hasRole("COCINA_STOCK") && !hasRole("CAJERO") ? "/cocina" : "/pedidos";
  const backTo = state.from ?? fallbackPath;
  const backLabel = state.backLabel ?? (backTo === "/cocina" ? "Volver a cocina" : "Volver a pedidos");

  if (!pedidoId || isNaN(pedidoId)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return (
    <div className="max-w-5xl">
      <PedidoDetalleGrid pedidoId={pedidoId} backTo={backTo} backLabel={backLabel} showReorder={false} />
    </div>
  );
}
