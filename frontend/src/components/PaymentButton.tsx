import { useState } from "react";
import axiosClient from "../api/axiosClient";

interface PaymentButtonProps {
  pedidoId: number;
  monto: number;
}

export function PaymentButton({ pedidoId, monto }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePagar = async () => {
    setLoading(true);
    setError(null);

    try {
      // Llamada al backend de FoodStore
      const res = await axiosClient.post("/pagos/create-preference", {
        pedido_id: pedidoId,
      });

      const { init_point } = res.data;

      if (init_point) {
        // Redirigir al Checkout Pro de Mercado Pago (Sandbox)
        window.location.href = init_point;
      } else {
        setError("No se recibió la URL de pago desde el servidor");
      }
    } catch (err: any) {
      console.error("Error al iniciar el pago:", err);
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(", "));
      } else if (detail && typeof detail === "object") {
        setError(JSON.stringify(detail));
      } else {
        setError("Hubo un error al conectar con Mercado Pago");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handlePagar}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Conectando con Mercado Pago...
          </>
        ) : (
          `Pagar $${monto.toFixed(2)} con Mercado Pago`
        )}
      </button>
      <p className="text-center text-xs text-slate-400">
        Redirección segura a la plataforma de Mercado Pago.
      </p>
    </div>
  );
}
