import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { pedidosApi } from "../api/pedidosApi";
import axiosClient from "../api/axiosClient";
import { PaymentButton } from "../components/PaymentButton";
import { useReordenar } from "../hooks/useReordenar";
import { RefreshCw } from "lucide-react";
import type { PedidoDetail } from "../types";

type ResultStatus = "confirmando" | "aprobado" | "pendiente_mp" | "rechazado" | "error";

export default function PaymentResultPage() {
  const { id, status } = useParams<{ id: string; status: string }>();
  const [searchParams] = useSearchParams();
  const [resultStatus, setResultStatus] = useState<ResultStatus>("confirmando");
  const [pedido, setPedido] = useState<PedidoDetail | null>(null);
  const [loadingPedido, setLoadingPedido] = useState(false);
  const { reordenar, isLoading: isReordenando } = useReordenar();

  const pedidoId = Number(id);
  const paymentId = searchParams.get("payment_id");

  useEffect(() => {
    const confirmarPago = async () => {
      try {
        const payload = {
          pedido_id: pedidoId,
          payment_id: paymentId ? Number(paymentId) : null,
        };

        const res = await axiosClient.post("/pagos/confirm", payload);
        const backendEstado = res.data.estado;

        if (backendEstado === "aprobado") {
          setResultStatus("aprobado");
        } else if (backendEstado === "pendiente") {
          // Si la URL dice failure pero el backend dice pendiente,
          // confiar en la redirección de MP
          if (status === "failure") {
            setResultStatus("rechazado");
            cargarPedido();
          } else {
            setResultStatus("pendiente_mp");
          }
        } else {
          setResultStatus("rechazado");
          cargarPedido();
        }
      } catch (error) {
        console.error("Error al confirmar pago:", error);
        // Si falla el confirm, igualmente mostrar rechazo si MP redirigió a failure
        if (status === "failure") {
          setResultStatus("rechazado");
        } else {
          setResultStatus("error");
        }
        cargarPedido();
      }
    };

    confirmarPago();
  }, [pedidoId, paymentId, status]);

  const cargarPedido = async () => {
    setLoadingPedido(true);
    try {
      const data = await pedidosApi.getById(pedidoId);
      setPedido(data);
    } catch (err) {
      console.error("Error al cargar pedido:", err);
    } finally {
      setLoadingPedido(false);
    }
  };

  // --- 1. CONFIRMANDO PAGO ---
  if (resultStatus === "confirmando") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-12 px-4 text-center">
        <div className="relative mb-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Confirmando tu pago</h2>
        <p className="mt-2 text-slate-500 max-w-md">
          Estamos verificando la transacción con Mercado Pago. Por favor, no cierres esta ventana.
        </p>
      </div>
    );
  }

  // --- 2. PAGO APROBADO ---
  if (resultStatus === "aprobado") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-12 px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 shadow-md">
          <svg
            className="h-10 w-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800">¡Pago Exitoso!</h2>
        <p className="mt-2 text-slate-600 max-w-md">
          Tu pago para el pedido #{pedidoId} fue procesado y aprobado correctamente. El pedido ya está listo para comenzar a prepararse.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link
            to={`/pedidos/${pedidoId}`}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-blue-700"
          >
            Ver Detalle del Pedido
          </Link>
          <Link
            to="/catalogo"
            className="rounded-lg bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200"
          >
            Seguir Comprando
          </Link>
        </div>
      </div>
    );
  }

  // --- 3. PAGO PENDIENTE EN MP ---
  if (resultStatus === "pendiente_mp") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-12 px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-50 shadow-md">
          <svg
            className="h-10 w-10 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800">Pago Pendiente</h2>
        <p className="mt-2 text-slate-600 max-w-md">
          El pago está en proceso de autorización. Te notificaremos cuando Mercado Pago lo apruebe.
        </p>
        <div className="mt-8">
          <Link
            to="/mis-pedidos"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-blue-700"
          >
            Ir a Mis Pedidos
          </Link>
        </div>
      </div>
    );
  }

  // --- 4. RECHAZADO / ERROR ---
  return (
    <div className="mx-auto max-w-md py-12 px-4 text-center">
      <div className="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-red-50 shadow-md">
        <svg
          className="h-10 w-10 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h2 className="text-3xl font-extrabold text-slate-800">No pudimos procesar tu pago</h2>
      <p className="mt-2 text-slate-600">
        El pago para el pedido #{pedidoId} fue rechazado o no pudo concretarse.
      </p>

      {loadingPedido ? (
        <div className="mt-8 text-slate-500 text-sm">Cargando detalles del pedido...</div>
      ) : pedido ? (
        <div className="mt-8 p-6 rounded-xl border border-slate-200 bg-white shadow-sm text-left">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen del Pedido</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Pedido ID:</span>
              <span className="font-semibold text-slate-800">#{pedido.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Monto Total:</span>
              <span className="font-bold text-blue-600">${Number(pedido.total).toFixed(2)}</span>
            </div>
          </div>

          {pedido.estado_codigo === "PENDIENTE" && (
            <div className="mt-6">
              <PaymentButton pedidoId={pedido.id} monto={Number(pedido.total)} />
            </div>
          )}
        </div>
      ) : (
        <p className="mt-6 text-sm text-red-500">No se pudieron obtener los datos del pedido.</p>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={() => reordenar(pedidoId)}
          disabled={isReordenando}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isReordenando ? "animate-spin" : ""} />
          Volver a pedir
        </button>
        <Link to="/catalogo" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
          &larr; Ir al catálogo
        </Link>
      </div>
    </div>
  );
}
