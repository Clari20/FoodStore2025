import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tags, Loader, ChevronRight } from 'lucide-react';
import { categoriasApi } from '../api/categoriasApi';

export default function NavbarCategoriesMenu() {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch de categorías usando React Query
  // Solo pedimos las activas y con un staleTime alto para no recargar a cada rato
  const { data: categorias, isLoading, isError } = useQuery({
    queryKey: ['categorias', 'tree', 'activo'],
    queryFn: () => categoriasApi.listTree('activo'),
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Link 
        to="/catalogo" 
        className="text-gray-600 hover:text-green-main flex items-center gap-2 font-medium transition-colors py-2"
        onClick={() => setIsOpen(false)}
      >
        <Tags size={18} />
        Categorías
      </Link>

      {/* El Dropdown del Súper Menú */}
      {isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="bg-white shadow-xl rounded-xl border border-gray-100 min-w-[250px] py-2 transform origin-top-left transition-all duration-200">
            
            {/* Estado de Carga */}
            {isLoading && (
              <div className="p-6 flex flex-col items-center justify-center text-gray-400 gap-3">
                <Loader size={24} className="animate-spin text-green-main" />
                <span className="text-sm font-medium">Cargando categorías...</span>
              </div>
            )}

            {/* Estado de Error */}
            {isError && (
              <div className="p-4 text-center text-sm text-danger-main">
                No pudimos cargar las categorías.
              </div>
            )}

            {/* Menú Flyout (Padres en lista, hijos al costado) */}
            {!isLoading && !isError && categorias && (
              <div className="flex flex-col">
                {categorias.map((padre) => (
                  <CategoryItem key={padre.id} item={padre} onClose={() => setIsOpen(false)} isFirstLevel={true} />
                ))}

                {categorias.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No hay categorías disponibles.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryItemProps {
  item: any;
  onClose: () => void;
  isFirstLevel?: boolean;
}

function CategoryItem({ item, onClose, isFirstLevel = false }: CategoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hasSub = item.subcategorias && item.subcategorias.length > 0;
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link 
        to={`/catalogo?categoria=${item.id}`} 
        className={`w-full text-left px-5 py-2.5 hover:bg-green-50 flex items-center justify-between transition-colors font-medium ${
          isFirstLevel 
            ? "text-gray-800 text-sm md:text-base" 
            : "text-gray-600 hover:text-green-main text-sm"
        }`}
        onClick={onClose}
      >
        <span>{item.nombre}</span>
        {hasSub && (
          <ChevronRight 
            size={16} 
            className={`text-gray-400 transition-colors ${isHovered ? "text-green-main" : ""}`} 
          />
        )}
      </Link>
      
      {hasSub && isHovered && (
        <div className="absolute right-full md:left-full md:right-auto top-0 pr-1 md:pl-1 md:pr-0 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="bg-white shadow-xl rounded-xl border border-gray-100 min-w-[200px] py-2">
            {item.subcategorias.map((sub: any) => (
              <CategoryItem key={sub.id} item={sub} onClose={onClose} isFirstLevel={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
