import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader, FolderHeart } from "lucide-react";
import { useCategoria, useCategoriasTree } from "../hooks/useCategorias";
import { useProductos } from "../hooks/useProductos";
import ProductCard from "../components/ProductCard";
import CategoryCarousel from "../components/CategoryCarousel";
import type { CategoriaTree } from "../types";

// Función recursiva para buscar un nodo por ID en el árbol de categorías
function findCategoryNode(nodes: CategoriaTree[], targetId: number): CategoriaTree | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.subcategorias && node.subcategorias.length > 0) {
      const found = findCategoryNode(node.subcategorias, targetId);
      if (found) return found;
    }
  }
  return null;
}

export default function CategoriaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const categoriaId = Number(id);

  // 1. Obtener detalles de la categoría seleccionada
  const { data: categoria, isLoading: catLoading, isError: catError } = useCategoria(categoriaId);

  // 2. Obtener productos directamente asociados a esta categoría
  const { data: productosData, isLoading: productsLoading } = useProductos({
    page: 1,
    per_page: 100, // Traemos una cantidad alta para mostrar la lista completa
    search: "",
    categoria: categoriaId,
    estado: "activo",
    disponible: "true",
    sort_by: "nombre",
    sort_order: "asc",
    created_from: "",
    created_to: "",
    updated_from: "",
    updated_to: "",
    starts_with: "",
  });

  // 3. Obtener el árbol completo de categorías para extraer las subcategorías (hijas) de la actual
  const { data: tree, isLoading: treeLoading } = useCategoriasTree("activo");

  const isLoading = catLoading || productsLoading || treeLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 gap-4">
        <Loader size={48} className="animate-spin text-green-main" />
        <p className="text-gray-500 font-medium">Cargando categoría...</p>
      </div>
    );
  }

  if (catError || !categoria) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto shadow-sm">
        <h3 className="text-xl font-bold text-danger-main mb-2">Categoría no encontrada</h3>
        <p className="text-gray-500 mb-6">La categoría que estás buscando no existe o fue dada de baja.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-green-main hover:bg-green-dark text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md"
        >
          <ArrowLeft size={18} />
          Volver al Inicio
        </Link>
      </div>
    );
  }

  // Buscar la subcategoría en el árbol
  const currentCategoryNode = tree ? findCategoryNode(tree, categoriaId) : null;
  const subcategorias = currentCategoryNode?.subcategorias || [];
  const productos = productosData?.items || [];

  return (
    <div className="space-y-12">
      {/* Botón Volver y Cabecera */}
      <div className="space-y-4">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 text-gray-600 hover:text-green-main font-bold text-sm transition-colors"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Volver al Inicio
        </Link>

        {/* Hero de Categoría */}
        <section className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100/50 rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-dark mb-4">
              Categoría
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">
              {categoria.nombre}
            </h1>
            <p className="text-base md:text-lg text-gray-600 font-medium">
              {categoria.descripcion || "Explorá todas las opciones deliciosas disponibles en esta sección."}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-green-200/10 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3" />
        </section>
      </div>

      {/* Listado de Productos Principales */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <FolderHeart className="text-green-main" size={24} />
          <h2 className="text-2xl font-bold text-gray-900">Productos en esta categoría</h2>
        </div>

        {productos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 flex flex-col items-center">
            <span className="text-4xl mb-3">🍽️</span>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Sin productos directos</h3>
            <p className="text-gray-400 max-w-sm">
              No hay platos asignados directamente a {categoria.nombre}. 
              {subcategorias.length > 0 && " ¡Pero revisá las subcategorías de abajo!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {productos.map((producto) => (
              <ProductCard key={producto.id} producto={producto} className="" />
            ))}
          </div>
        )}
      </section>

      {/* Carruseles Hijos (Subcategorías) */}
      {subcategorias.length > 0 && (
        <section className="border-t border-gray-100 pt-10 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Subcategorías de {categoria.nombre}
            </h2>
            <p className="text-gray-500">
              Explorá las distintas especialidades de esta variedad
            </p>
          </div>

          <div className="space-y-6">
            {subcategorias.map((sub) => (
              <CategoryCarousel
                key={sub.id}
                categoriaId={sub.id}
                titulo={sub.nombre}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
