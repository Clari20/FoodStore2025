import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Loader, Info, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { productosApi } from '../api/productosApi';
import { useCartStore } from '../store/cartStore';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cantidad, setCantidad] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [removidos, setRemovidos] = useState<number[]>([]);
  
  const { addItem } = useCartStore();

  const { data: producto, isLoading, isError } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => productosApi.getById(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 gap-4">
        <Loader size={48} className="animate-spin text-green-main" />
        <span className="text-lg font-medium">Cargando producto...</span>
      </div>
    );
  }

  if (isError || !producto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Producto no encontrado</h2>
        <p className="text-gray-500 mb-6">El producto que estás buscando no existe o no está disponible.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-green-main text-white px-6 py-3 rounded-full font-bold hover:bg-green-dark transition-colors"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(producto as any, cantidad, removidos);
    toast.success(`${producto.nombre} agregado al carrito`);
  };

  const toggleRemovable = (ingId: number) => {
    setRemovidos(prev => prev.includes(ingId) ? prev.filter(i => i !== ingId) : [...prev, ingId]);
  };

  // Color de placeholder según ID
  const colors = [
    'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700',
    'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700',
    'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
  ];
  const colorClass = colors[producto.id % colors.length];

  return (
    <div className="max-w-4xl mx-auto pb-6 md:pb-10">
      {/* Botón Volver */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-green-main transition-colors mb-4 font-medium bg-white px-4 py-2 rounded-full shadow-sm w-fit text-sm"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="bg-white rounded-3xl shadow-md border border-gray-100/80 overflow-hidden flex flex-col md:flex-row md:h-[500px]">
        
        {/* Lado Izquierdo: Imagen / Color Placeholder */}
        <div className="md:w-1/2 flex flex-col h-[260px] md:h-full relative bg-gray-50/50">
          <div className={`flex-1 flex items-center justify-center relative overflow-hidden ${colorClass} transition-colors duration-300`}>
            {producto.imagenes && producto.imagenes.length > 0 ? (
              <img 
                src={producto.imagenes[activeImage].startsWith('http') ? producto.imagenes[activeImage] : `http://localhost:8000${producto.imagenes[activeImage]}`} 
                alt={producto.nombre} 
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
              />
            ) : (
              <span className="text-[8rem] md:text-[12rem] font-black opacity-15 transform -rotate-12 scale-150 select-none">
                {producto.nombre.substring(0, 2).toUpperCase()}
              </span>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"></div>
          </div>
          
          {/* Thumbnails si hay más de 1 imagen */}
          {producto.imagenes && producto.imagenes.length > 1 && (
            <div className="flex gap-2 p-3 bg-white border-t border-gray-100 justify-center">
              {producto.imagenes.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    activeImage === idx ? 'border-green-main shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.startsWith('http') ? img : `http://localhost:8000${img}`} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lado Derecho: Detalles */}
        <div className="md:w-1/2 flex flex-col justify-between h-full md:max-h-[500px]">
          
          {/* Contenido Principal con Scroll Interno si es necesario */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 lg:p-8 scrollbar-thin">
            {/* Categorías */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {producto.categorias
                .filter(cat => !cat.categoria.active_at)
                .map(cat => (
                <span key={cat.categoria.id} className="text-[9px] font-extrabold uppercase tracking-widest bg-green-50 text-green-main border border-green-100 px-2.5 py-0.5 rounded-full">
                  {cat.categoria.nombre}
                </span>
              ))}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight mb-2">
              {producto.nombre}
            </h1>

            <p className="text-gray-500 text-sm mb-4 leading-relaxed">
              {producto.descripcion || "Este producto no tiene una descripción detallada, pero te aseguramos que es riquísimo."}
            </p>

            {/* Ingredientes / Info */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/80">
              <h3 className="font-bold text-gray-900 text-sm mb-2.5 flex items-center gap-1.5">
                <Info size={16} className="text-green-main" /> ¿Qué trae?
              </h3>
              
              {producto.ingredientes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {producto.ingredientes.map(ing => {
                    const isRemoved = removidos.includes(ing.ingrediente.id);
                    return (
                      <div 
                        key={ing.ingrediente.id} 
                        onClick={() => ing.es_removible && toggleRemovable(ing.ingrediente.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border shadow-sm text-xs transition-all ${
                          ing.es_removible ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                        } ${
                          isRemoved 
                            ? 'bg-red-50 border-red-100 opacity-70' 
                            : 'bg-white border-gray-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRemoved ? 'bg-red-400' : 'bg-green-main'}`} />
                        <span className={`text-gray-700 font-medium capitalize truncate ${isRemoved ? 'line-through text-gray-400' : ''}`} title={ing.ingrediente.nombre}>
                          {ing.ingrediente.nombre}
                        </span>
                        {ing.es_removible && (
                          <span className={`ml-auto text-[10px] font-bold ${isRemoved ? 'text-red-500' : 'text-gray-400'}`}>
                            {isRemoved ? 'Sin' : 'Con'}
                          </span>
                        )}
                        {ing.ingrediente.es_alergeno && !ing.es_removible && (
                          <span className="text-danger-main text-[9px] font-extrabold ml-auto bg-danger-50 px-1.5 py-0.5 rounded" title="Alérgeno">
                            Alerg.
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No hay información detallada de ingredientes.</p>
              )}
            </div>
          </div>

          {/* Footer Fijo en la Base */}
          <div className="p-5 md:p-6 lg:p-8 pt-4 border-t border-gray-100 bg-white">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Precio Unitario</span>
                <span className="text-3xl font-black text-green-main">
                  ${producto.precio_base}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {/* Selector de cantidad */}
              <div className="flex items-center justify-between bg-gray-100 rounded-xl p-1 w-1/3 min-w-[110px]">
                <button 
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-green-main hover:scale-105 active:scale-95 transition-all"
                >
                  <Minus size={14} />
                </button>
                <span className="text-base font-bold text-gray-800 w-8 text-center select-none">
                  {cantidad}
                </span>
                <button 
                  onClick={() => setCantidad(cantidad + 1)}
                  disabled={cantidad >= producto.stock_disponible}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-green-main hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Botón Agregar al Carrito */}
              <button 
                onClick={handleAddToCart}
                disabled={producto.stock_disponible === 0}
                className="flex-1 bg-green-main text-white font-bold text-base rounded-xl flex items-center justify-center gap-2 hover:bg-green-dark transition-all shadow-md hover:shadow-lg shadow-green-main/20 active:scale-[0.98] py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
              >
                <ShoppingCart size={18} className="fill-current" />
                {producto.stock_disponible === 0 ? "Sin stock" : "Agregar al Pedido"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
