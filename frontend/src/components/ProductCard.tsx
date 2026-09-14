import { ShoppingCart, Settings2 } from "lucide-react";
import type { Producto } from "../types";
import { useCartStore } from '../store/cartStore';
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  producto: Producto;
  className?: string;
}

export default function ProductCard({ producto, className }: ProductCardProps) {
  const { addItem, items } = useCartStore();
  const navigate = useNavigate();

  const inCart = items.find((i) => i.producto.id === producto.id);
  const sinStock = producto.stock_disponible === 0 || !producto.disponible;
  const stockAgotado = !!inCart && inCart.cantidad >= producto.stock_disponible;
  const bloqueado = sinStock || stockAgotado;

  const tieneRemovibles = producto.ingredientes?.some(i => i.es_removible);

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bloqueado && !tieneRemovibles) return;
    
    if (tieneRemovibles) {
      navigate(`/producto/${producto.id}`);
      return;
    }

    addItem(producto, 1);
    toast.success(`${producto.nombre} agregado al carrito`);
  };

  // Generamos un color consistente basado en el ID para el placeholder
  const colors = [
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
  ];
  const colorClass = colors[producto.id % colors.length];

  return (
    <Link
      to={`/producto/${producto.id}`}
      className={`group bg-white rounded-3xl shadow-sm transition-all duration-300 overflow-hidden border flex flex-col block ${
        sinStock 
          ? "opacity-70 grayscale-[40%] border-gray-200" 
          : "hover:shadow-xl hover:-translate-y-1 border-gray-50"
      } ${className ?? "w-64 shrink-0 snap-start"}`}
    >
      {/* Imagen Placeholder o Real */}
      <div className={`h-40 w-full flex flex-col justify-center items-center ${colorClass} relative overflow-hidden`}>
        {producto.stock_disponible <= 5 && producto.stock_disponible > 0 && (
          <span className="absolute top-3 right-3 bg-white/90 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10">
            ¡Quedan {producto.stock_disponible}!
          </span>
        )}
        
        {sinStock && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-xs font-black uppercase tracking-wider z-10 backdrop-blur-[1px]">
            {!producto.disponible ? "No Disponible" : "Sin Stock"}
          </div>
        )}
        
        {producto.imagenes && producto.imagenes.length > 0 ? (
          <img 
            src={producto.imagenes[0].startsWith('http') ? producto.imagenes[0] : `http://localhost:8000${producto.imagenes[0]}`} 
            alt={producto.nombre} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <span className="text-4xl font-black opacity-20 transform -rotate-12 scale-150">
            {producto.nombre.substring(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5 flex flex-col flex-1 relative">
        {/* Título y Descripción */}
        <div className="mb-4 flex-1">
          <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 group-hover:text-green-main transition-colors line-clamp-2">
            {producto.nombre}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">
            {producto.descripcion || "Sin descripción detallada."}
          </p>
        </div>

        {/* Precio y Botón Agregar */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Precio</span>
            <span className="text-xl font-black text-gray-900">
              ${producto.precio_base}
            </span>
          </div>

          <button
            onClick={handleAction}
            disabled={bloqueado && !tieneRemovibles}
            className={`px-4 h-10 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm z-10 ${
              bloqueado && !tieneRemovibles
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : tieneRemovibles
                ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                : "bg-green-50 text-green-main hover:bg-green-main hover:text-white"
            }`}
            title={sinStock && !tieneRemovibles ? "Sin stock" : stockAgotado && !tieneRemovibles ? "Stock máximo" : tieneRemovibles ? "Personalizar ingredientes" : "Agregar al carrito"}
          >
            {tieneRemovibles ? (
              <>
                <Settings2 size={18} />
                <span className="text-xs">Personalizar</span>
              </>
            ) : (
              <ShoppingCart size={20} className="fill-current" />
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
