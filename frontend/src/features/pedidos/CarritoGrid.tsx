/** Grilla de ítems del carrito con controles de cantidad. */
import { Trash2, Plus, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "../../store/cartStore";

export default function CarritoGrid() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateCantidad = useCartStore((s) => s.updateCantidad);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const removidosNames = item.personalizacion && item.personalizacion.length > 0
          ? item.personalizacion.map(id => item.producto.ingredientes.find(i => i.ingrediente.id === id)?.ingrediente.nombre).filter(Boolean)
          : [];

        return (
        <div
          key={item.cartItemId || `legacy-${item.producto.id}`}
          className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3"
        >
          <Link to={`/producto/${item.producto.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.producto.imagenes && item.producto.imagenes.length > 0 ? (
                <img
                  src={item.producto.imagenes[0].startsWith('http') ? item.producto.imagenes[0] : `http://localhost:8000${item.producto.imagenes[0]}`}
                  alt={item.producto.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-green-main opacity-50">
                  {item.producto.nombre.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 line-clamp-1 hover:underline">
                {item.producto.nombre}
              </h3>
              {removidosNames && removidosNames.length > 0 && (
                <div className="text-[11px] font-bold text-red-500 mt-0.5 mb-1 leading-tight">
                  Sin: {removidosNames.join(", ")}
                </div>
              )}
              <p className="text-green-dark font-medium text-sm whitespace-nowrap">
                ${Number(item.producto.precio_base).toLocaleString("es-AR")} c/u
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() =>
                updateCantidad(item.cartItemId, item.cantidad - 1)
              }
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-semibold">
              {item.cantidad}
            </span>
            <button
              onClick={() =>
                updateCantidad(item.cartItemId, item.cantidad + 1)
              }
              disabled={item.cantidad >= item.producto.stock_disponible}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="text-right min-w-[72px] flex-shrink-0">
            <p className="font-bold text-gray-900">
              $
              {Number(item.producto.precio_base * item.cantidad).toLocaleString(
                "es-AR",
              )}
            </p>
          </div>

          <button
            onClick={() => removeItem(item.cartItemId)}
            className="text-red-400 hover:text-red-600 transition-colors ml-1 flex-shrink-0"
          >
            <Trash2 size={18} />
          </button>
        </div>
        );
      })}
    </div>
  );
}
