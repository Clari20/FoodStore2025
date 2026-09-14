import { useRef } from 'react';
import { ArrowRight, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProductos } from '../hooks/useProductos';
import ProductCard from './ProductCard';

interface CategoryCarouselProps {
  id?: string;
  categoriaId: number;
  titulo: string;
}

export default function CategoryCarousel({ id, categoriaId, titulo }: CategoryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Buscamos solo productos disponibles para esta categoría, máximo 10 para no saturar el home
  const { data, isLoading, isError } = useProductos({
    categoria: categoriaId,
    disponible: 'true',
    page: 1,
    per_page: 10,
    search: '',
    estado: 'activo',
    sort_by: 'nombre',
    sort_order: 'asc',
    created_from: '',
    created_to: '',
    updated_from: '',
    updated_to: '',
    starts_with: ''
  });

  const productos = data?.items || [];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Ancho aproximado de la tarjeta + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{titulo}</h2>
          <Loader size={20} className="animate-spin text-green-main ml-4" />
        </div>
        <div className="flex gap-4 overflow-hidden opacity-50">
          <div className="w-64 h-80 bg-gray-100 rounded-2xl animate-pulse shrink-0"></div>
          <div className="w-64 h-80 bg-gray-100 rounded-2xl animate-pulse shrink-0"></div>
          <div className="w-64 h-80 bg-gray-100 rounded-2xl animate-pulse shrink-0"></div>
        </div>
      </section>
    );
  }

  if (isError) {
    console.error("CategoryCarousel error fetching for:", titulo, "id:", categoriaId);
    return null; // Si hay error fallamos en silencio para no arruinar el home, solo ocultamos el carrusel
  }

  // Si no hay productos activos en esta categoría, no renderizamos la sección
  if (productos.length === 0) {
    return null;
  }

  return (
    <section id={id} className="py-2">
      {/* Header del Carrusel */}
      <div className="flex justify-between items-end mb-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{titulo}</h2>
          <p className="text-sm text-gray-500">Descubrí nuestras opciones</p>
        </div>
        <Link
          to={`/catalogo?categoria=${categoriaId}`}
          className="text-sm text-green-main font-bold hover:text-green-dark flex items-center gap-1 transition-colors"
        >
          Ver todos <ArrowRight size={16} />
        </Link>
      </div>

      {/* Contenedor relativo para posicionar las flechas absolutas */}
      <div className="relative group">
        {/* Flecha Izquierda */}
        <button
          onClick={() => scroll('left')}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md rounded-full p-2 sm:p-2.5 text-gray-600 hover:text-green-main hover:border-green-main transition-all hover:scale-105 active:scale-95"
          title="Anterior"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Contenedor del Carrusel (CSS Scroll Snap) */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-6 pb-4 pt-1 snap-x snap-mandatory hide-scrollbar scroll-smooth px-4 sm:px-6"
        >
          {productos.map(producto => (
            <div key={producto.id} className="snap-start shrink-0">
              <ProductCard producto={producto} />
            </div>
          ))}

          {/* Tarjeta de "Ver más" al final del carrusel si hay más productos potenciales */}
          {productos.length >= 5 && (
            <div className="w-64 shrink-0 snap-start flex items-center justify-center">
              <Link
                to={`/catalogo?categoria=${categoriaId}`}
                className="flex flex-col items-center justify-center h-40 w-40 rounded-full bg-green-50 text-green-main hover:bg-green-100 hover:scale-105 transition-all duration-300 border border-green-100 shadow-sm"
              >
                <ArrowRight size={28} className="mb-2 text-green-main" />
                <span className="font-bold text-sm">Ver catálogo</span>
              </Link>
            </div>
          )}
        </div>

        {/* Flecha Derecha */}
        <button
          onClick={() => scroll('right')}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md rounded-full p-2 sm:p-2.5 text-gray-600 hover:text-green-main hover:border-green-main transition-all hover:scale-105 active:scale-95"
          title="Siguiente"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
