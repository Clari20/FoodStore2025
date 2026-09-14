const DELIVERY_FLOW = ["PENDIENTE", "CONFIRMADO", "EN_PREP", "LISTO", "EN_CAMINO", "ENTREGADO"];
const PICKUP_FLOW = ["PENDIENTE", "CONFIRMADO", "EN_PREP", "LISTO", "ENTREGADO"];

export const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_PREP: "En preparacion",
  LISTO: "Listo",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const ESTADO_SHORT_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_PREP: "Preparacion",
  LISTO: "Listo",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
};

interface Props {
  estado: string;
  compact?: boolean;
  isRetiro?: boolean;
}

export default function PedidoTimeline({ estado, compact = false, isRetiro = false }: Props) {
  if (estado === "CANCELADO") {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        Pedido cancelado
      </div>
    );
  }

  const flow = isRetiro && estado !== "EN_CAMINO" ? PICKUP_FLOW : DELIVERY_FLOW;
  const currentIndex = flow.indexOf(estado);

  return (
    <div className={`w-full ${compact ? "mt-3" : "mt-5"}`}>
      <div className="flex items-start">
        {flow.map((step, index) => {
          const isCompleted = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isReached = isCompleted || isCurrent;
          const label = compact ? ESTADO_SHORT_LABEL[step] : ESTADO_LABEL[step];

          return (
            <div key={step} className="flex flex-1 items-start last:flex-none">
              <div className={`flex flex-col items-center gap-1 ${compact ? "w-12" : "w-20"}`}>
                <span
                  className={`rounded-full border-2 ${
                    compact ? "h-3 w-3" : "h-4 w-4"
                  } ${
                    isCurrent
                      ? "border-green-main bg-green-main ring-4 ring-green-main/15"
                      : isCompleted
                      ? "border-green-main bg-green-main"
                      : "border-gray-300 bg-white"
                  }`}
                />
                <span
                  className={`text-center font-medium leading-tight ${
                    compact ? "text-[10px]" : "text-[11px]"
                  } ${isReached ? "text-gray-800" : "text-gray-400"}`}
                >
                  {label}
                </span>
              </div>
              {index < flow.length - 1 && (
                <div
                  className={`mx-1.5 mt-1.5 h-0.5 flex-1 sm:mx-2 ${
                    isCompleted ? "bg-green-main" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {compact && (
        <p className="mt-1 text-xs text-gray-500">
          Estado actual: <span className="font-semibold text-gray-800">{ESTADO_LABEL[estado] ?? estado}</span>
        </p>
      )}
    </div>
  );
}
