import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { productosApi } from "../api/productosApi";
import { categoriasApi } from "../api/categoriasApi";
import ProductCard from "../components/ProductCard";
import { useDebounce } from "../hooks/useDebounce";

export default function StorefrontCatalogoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCategoria = searchParams.get("categoria");
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const selectedCategoria = queryCategoria ? Number(queryCategoria) : undefined;
  
  const [sortOption, setSortOption] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const perPage = 12;

  // Derivar sort_by y sort_order
  let sortBy = "";
  let sortOrder = "";

  if (sortOption === "precio_asc") {
    sortBy = "precio_base";
    sortOrder = "asc";
  } else if (sortOption === "precio_desc") {
    sortBy = "precio_base";
    sortOrder = "desc";
  } else if (sortOption === "nombre_asc") {
    sortBy = "nombre";
    sortOrder = "asc";
  } else if (sortOption === "nombre_desc") {
    sortBy = "nombre";
    sortOrder = "desc";
  }

  // Traer Categorías (Solo activas)
  const { data: categoriasData } = useQuery({
    queryKey: ["categorias", "activas"],
    queryFn: () =>
      categoriasApi.listPaginated({
        page: 1,
        per_page: 100,
        search: "",
        estado: "activo",
        sort_by: "nombre",
        sort_order: "asc",
        created_from: "",
        created_to: "",
        updated_from: "",
        updated_to: "",
        starts_with: "",
      }),
  });
  const categorias = categoriasData?.items || [];
  const categoriaInfo = selectedCategoria !== undefined ? categorias.find(c => c.id === selectedCategoria) : undefined;

  // Traer Productos
  const { data: productosData, isLoading, isError } = useQuery({
    queryKey: [
      "productos",
      "catalogo",
      page,
      perPage,
      debouncedSearch,
      selectedCategoria,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      productosApi.list({
        page,
        per_page: perPage,
        search: debouncedSearch,
        categoria: selectedCategoria,
        estado: "activo",
        disponible: "true",
        sort_by: sortBy,
        sort_order: sortOrder,
        created_from: "",
        created_to: "",
        updated_from: "",
        updated_to: "",
        starts_with: "",
      }),
  });

  const productos = productosData?.items || [];
  const totalPages = productosData?.pages || 1;

  // Manejadores
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleCategoriaSelect = (id?: number) => {
    if (id) {
      searchParams.set("categoria", String(id));
    } else {
      searchParams.delete("categoria");
    }
    setSearchParams(searchParams);
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
    setPage(1);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col gap-8 min-h-screen">

      {/* Cabecera de Categoría Seleccionada o Catálogo */}
      {categoriaInfo ? (
        <section className="relative w-full h-44 sm:h-52 rounded-3xl overflow-hidden shadow-md border border-gray-100 flex items-end p-6 sm:p-8 animate-in fade-in duration-300">
          {categoriaInfo.imagen_url ? (
            <>
              <img 
                src={categoriaInfo.imagen_url} 
                alt={categoriaInfo.nombre} 
                className="absolute inset-0 w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-green-dark to-green-main" />
          )}
          <div className="relative z-10 text-white">
            <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight drop-shadow-md">
              {categoriaInfo.nombre}
            </h1>
            {categoriaInfo.descripcion && (
              <p className="text-white/80 text-sm max-w-xl font-medium drop-shadow-sm line-clamp-2">
                {categoriaInfo.descripcion}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-gradient-to-r from-green-dark to-green-main rounded-3xl p-8 sm:p-10 text-white shadow-md flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-sm">Nuestro Catálogo</h1>
          <p className="text-white/85 font-medium max-w-md">Encontrá tus platos favoritos en un solo lugar.</p>
        </section>
      )}

      {/* Buscador y Ordenamiento */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        {/* Barra de Búsqueda */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar hamburguesas, bebidas, postres..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-main/20 focus:border-green-main transition-all outline-none shadow-sm font-medium"
          />
        </div>

        {/* Ordenamiento */}
        <div className="flex items-center gap-2 w-full md:w-auto bg-white rounded-2xl py-2 px-3 border border-gray-200 shadow-sm">
          <div className="pl-2">
            <SlidersHorizontal className="h-5 w-5 text-gray-400" />
          </div>
          <select
            value={sortOption}
            onChange={handleSortChange}
            className="block w-full py-1 pl-2 pr-8 bg-transparent text-gray-700 font-medium border-none focus:ring-0 outline-none cursor-pointer"
          >
            <option value="todos">Todos</option>
            <option value="precio_asc">Precio: Menor a Mayor</option>
            <option value="precio_desc">Precio: Mayor a Menor</option>
            <option value="nombre_asc">Nombre: A - Z</option>
            <option value="nombre_desc">Nombre: Z - A</option>
          </select>
        </div>
      </section>

      {/* Categorías (Pills) con Flechas */}
      <section className="w-full relative">
        {/* Flecha Izquierda */}
        <button 
          onClick={() => scrollCategories('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md rounded-full p-1.5 sm:p-2 text-gray-600 hover:text-green-main hover:border-green-main transition-all"
        >
          <ChevronLeft size={18} />
        </button>

        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto pb-4 gap-3 hide-scrollbar px-8 sm:px-10 scroll-smooth"
        >
          <button
            onClick={() => handleCategoriaSelect(undefined)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm snap-start shrink-0 border ${selectedCategoria === undefined
                ? "bg-green-main text-white border-green-main"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-main hover:text-green-main"
              }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoriaSelect(cat.id)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm snap-start shrink-0 border flex items-center gap-2 ${selectedCategoria === cat.id
                  ? "bg-green-main text-white border-green-main"
                  : "bg-white text-gray-600 border-gray-200 hover:border-green-main hover:text-green-main"
                }`}
            >
              {cat.imagen_url && (
                <img src={cat.imagen_url} alt={cat.nombre} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              )}
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Flecha Derecha */}
        <button 
          onClick={() => scrollCategories('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md rounded-full p-1.5 sm:p-2 text-gray-600 hover:text-green-main hover:border-green-main transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </section>

      {/* Grilla de Productos */}
      <section className="flex-1">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-main"></div>
          </div>
        ) : isError ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <h3 className="text-xl font-bold text-danger-main mb-2">Error al cargar el catálogo</h3>
            <p className="text-gray-500">Por favor, intentá nuevamente más tarde.</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 flex flex-col items-center">
            <div className="text-6xl mb-4">🕵️‍♂️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron productos</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              No hay productos que coincidan con tu búsqueda o filtros actuales.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                searchParams.delete("categoria");
                setSearchParams(searchParams);
              }}
              className="mt-6 px-6 py-2 bg-green-50 text-green-main font-bold rounded-xl hover:bg-green-100 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
            {productos.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </section>

      {/* Paginación */}
      {totalPages > 1 && (
        <section className="flex justify-center items-center gap-4 py-8">
          <button
            onClick={() => {
              setPage(p => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={page === 1}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-green-main disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <span className="font-medium text-gray-500">Página</span>
            <span className="font-bold text-gray-900">{page}</span>
            <span className="font-medium text-gray-500">de</span>
            <span className="font-bold text-gray-900">{totalPages}</span>
          </div>

          <button
            onClick={() => {
              setPage(p => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={page === totalPages}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-green-main disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronRight size={24} />
          </button>
        </section>
      )}

    </div>
  );
}
