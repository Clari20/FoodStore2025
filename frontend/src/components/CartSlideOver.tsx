import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUiStore } from '../store/uiStore';
import { useCartStore } from '../store/cartStore';

export default function CartSlideOver() {
  const { cartOpen, closeCart } = useUiStore();
  const { items = [], removeItem, updateQuantity, clearCart } = useCartStore();
  const navigate = useNavigate();

  const totalItems = items.reduce((total, item) => total + (item.cantidad || 0), 0);
  const totalPrice = items.reduce((total, item) => total + ((item.producto?.precio_base || 0) * (item.cantidad || 0)), 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(price);
  };

  if (!cartOpen) return null;

  return (
    <>
      {/* Overlay oscuro de fondo */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={closeCart}
      />

      {/* Panel lateral */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-green-main" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Tu Pedido</h2>
            <span className="bg-green-main text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
              {totalItems}
            </span>
          </div>
          <button 
            onClick={closeCart} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido (Lista de items) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 opacity-70">
              <ShoppingBag size={64} strokeWidth={1} />
              <p className="text-lg font-medium text-gray-500">Tu changuito está vacío</p>
              <button 
                onClick={() => {
                  closeCart();
                  navigate("/catalogo");
                }}
                className="text-green-main font-semibold hover:underline"
              >
                Volver al catálogo
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const removidosNames = item.personalizacion && item.personalizacion.length > 0
                  ? item.personalizacion.map(id => item.producto.ingredientes.find(i => i.ingrediente.id === id)?.ingrediente.nombre).filter(Boolean)
                  : [];

                return (
                <li key={item.cartItemId || `legacy-${item.producto.id}`} className="flex gap-4 p-3 bg-white border border-gray-100 shadow-sm rounded-2xl">
                  {/* Imagen del Producto */}
                  <Link to={`/producto/${item.producto.id}`} className="shrink-0 hover:opacity-80 transition-opacity" onClick={closeCart}>
                    <div className="w-20 h-20 bg-green-50 rounded-xl flex items-center justify-center overflow-hidden">
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
                  </Link>

                  {/* Info */}
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <Link to={`/producto/${item.producto.id}`} className="font-bold text-gray-800 leading-tight line-clamp-2 hover:underline" onClick={closeCart}>
                        {item.producto.nombre}
                      </Link>
                      <button 
                        onClick={() => removeItem(item.cartItemId)}
                        className="text-gray-400 hover:text-danger-main transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {removidosNames && removidosNames.length > 0 && (
                      <div className="text-xs font-bold text-red-500 mb-1">
                        Sin: {removidosNames.join(", ")}
                      </div>
                    )}
                    
                    <div className="text-sm font-bold text-gray-900 mb-2">
                      {formatPrice(item.producto.precio_base)}
                    </div>

                    {/* Controles de Cantidad */}
                    <div className="mt-auto flex items-center gap-3">
                      <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                        <button 
                          onClick={() => updateQuantity(item.cartItemId, item.cantidad - 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-green-main transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-gray-800">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.cantidad + 1)}
                          disabled={item.cantidad >= item.producto.stock_disponible}
                          className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-green-main transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>

        {/* Footer (Total y Checkout) */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-white shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 font-medium">Subtotal</span>
              <span className="text-2xl font-black text-gray-900">
                {formatPrice(totalPrice)}
              </span>
            </div>
            
            <button
              onClick={() => { closeCart(); navigate("/carrito"); }}
              className="w-full bg-green-main text-white font-bold text-lg py-4 rounded-xl hover:bg-green-dark transition-colors shadow-lg shadow-green-main/30 active:scale-95"
            >
              Continuar Compra
            </button>
            
            <button 
              onClick={clearCart}
              className="w-full mt-3 text-sm text-gray-400 font-medium hover:text-danger-main transition-colors"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  );
}
