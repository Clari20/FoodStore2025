/** Página de detalle de pedido — usa useParams para leer el :id de la URL. */
import { useParams, Navigate } from "react-router-dom";
import PedidoDetalleGrid from "../features/pedidos/PedidoDetalleGrid";

export default function PedidoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const pedidoId = Number(id);

  if (!pedidoId || isNaN(pedidoId)) {
    return <Navigate to="/mis-pedidos" replace />;
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <PedidoDetalleGrid pedidoId={pedidoId} />
      </div>
    </div>
  );
}
