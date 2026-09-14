/** Grilla de categorías con filtros y paginación. */
import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, RotateCcw, Layers } from "lucide-react";
import Pagination from "../../components/Pagination";
import CategoriaForm from "./CategoriaForm";
import type { Categoria, CategoriasFilters, CategoriaCreate } from "../../types";
import { useCategoriasPaginated, useCrearCategoria, useActualizarCategoria, useEliminarCategoria, useRestaurarCategoria, useDarDeBajaCategoria } from "../../hooks/useCategorias";

export default function CategoriasGrid() {
  const [filters, setFilters] = useState<CategoriasFilters>({
    page: 1,
    per_page: 10,
    search: "",
    estado: "activo",
    sort_by: "nombre",
    sort_order: "asc",
    created_from: "",
    created_to: "",
    updated_from: "",
    updated_to: "",
    starts_with: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Categoria | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [idAConfirmar, setIdAConfirmar] = useState<number | null>(null);

  // Debounce para búsqueda
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim(), page: 1 }));
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const { data, isLoading: loading } = useCategoriasPaginated(filters);

  const crearMut = useCrearCategoria();
  const actualizarMut = useActualizarCategoria();
  const darDeBajaMut = useDarDeBajaCategoria();
  const eliminarMut = useEliminarCategoria();
  const restaurarMut = useRestaurarCategoria();

  const handleFilterChange = (key: keyof CategoriasFilters, value: string | number) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const handleSave = async (formData: CategoriaCreate, id?: number) => {
    if (id) {
      await actualizarMut.mutateAsync({ id, data: formData });
    } else {
      await crearMut.mutateAsync(formData);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setIdAConfirmar(id);
  };

  const handleRestore = async (id: number) => {
    await restaurarMut.mutateAsync(id);
  };

  const isDeletedView = filters.estado === "inactivo";

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-dark">
            {isDeletedView ? "Categorías Dadas de Baja" : "Gestión de Categorías"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDeletedView
              ? "Categorías eliminadas. Podes reactivarlas."
              : "Listado plano de categorías para administración rápida."}
          </p>
        </div>
        {!isDeletedView && (
          <button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-green-main hover:bg-green-dark text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <Plus size={18} />
            Nueva Categoría
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Buscar */}
          <div className="relative xl:col-span-2 flex flex-col justify-end">
            <Search size={16} className="absolute left-3 bottom-3 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar categorías..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none"
            />
          </div>

          {/* Estado */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.estado}
              onChange={(e) => handleFilterChange("estado", e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
            >
              <option value="activo">Activos</option>
              <option value="inactivo">Dados de Baja</option>
              <option value="todos">Todos</option>
            </select>
          </div>

          {/* Ordenar por */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange("sort_by", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
            >
              <option value="nombre">Ordenar: Nombre</option>
              <option value="created_at">Ordenar: Creación</option>
              <option value="updated_at">Ordenar: Actualización</option>
            </select>
          </div>

          {/* Orden asc/desc */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.sort_order}
              onChange={(e) => handleFilterChange("sort_order", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>

          {/* Items por página */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.per_page}
              onChange={(e) => handleFilterChange("per_page", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
            >
              <option value={10}>10 por pág</option>
              <option value={20}>20 por pág</option>
              <option value={50}>50 por pág</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-green-main border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Layers size={48} className="mb-3 opacity-20" />
            <p>No se encontraron categorías.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] min-h-[450px] overflow-y-auto">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 shadow-sm">
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-500">ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Nombre</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Descripción</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((cat) => {
                  const isItemDeleted = cat.active_at !== null;
                  return (
                    <tr key={cat.id} className={`hover:bg-gray-50/50 transition-colors ${isItemDeleted ? 'bg-danger-light/10' : ''}`}>
                      <td className={`px-4 py-3 font-mono ${isItemDeleted ? 'text-danger' : 'text-gray-400'}`}>#{cat.id}</td>
                      <td className={`px-4 py-3 font-medium max-w-[200px] flex items-center gap-3 ${isItemDeleted ? 'text-danger line-through' : 'text-gray-900'}`} title={cat.nombre}>
                        {cat.imagen_url ? (
                          <img src={cat.imagen_url} alt={cat.nombre} className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 flex-shrink-0">
                            <Layers size={14} />
                          </div>
                        )}
                        <span className="truncate">{cat.nombre}</span>
                      </td>
                      <td className={`px-4 py-3 max-w-[250px] truncate ${isItemDeleted ? 'text-danger' : 'text-gray-500'}`} title={cat.descripcion || ""}>
                        {cat.descripcion || <span className="text-gray-300 italic">Sin descripción</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {isItemDeleted ? (
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleRestore(cat.id)}
                                className="p-1.5 text-green-main hover:bg-green-pale rounded transition-colors"
                                title="Restaurar"
                              >
                                <RotateCcw size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(cat.id)}
                                className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger-light rounded transition-colors"
                                title="Eliminar definitivamente"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditingItem(cat); setModalOpen(true); }}
                                className="p-1.5 text-gray-400 hover:text-green-main hover:bg-green-pale rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(cat.id)}
                                className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger-light rounded transition-colors"
                                title="Dar de baja"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && (
        <Pagination
          page={data.page}
          pages={data.pages}
          total={data.total}
          onPageChange={(p) => setFilters({ ...filters, page: p })}
        />
      )}

      <CategoriaForm
        isOpen={modalOpen}
        categoria={editingItem}
        parentId={null}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
        onSave={handleSave}
      />

      {idAConfirmar !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setIdAConfirmar(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
                {isDeletedView ? "Eliminar permanentemente" : "Dar de baja categoría"}
              </h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                {isDeletedView 
                  ? "Esta acción es irreversible y eliminará la categoría definitivamente." 
                  : "Podrás restaurarla después desde la vista de dados de baja."}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setIdAConfirmar(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (isDeletedView) {
                        await eliminarMut.mutateAsync(idAConfirmar);
                      } else {
                        await darDeBajaMut.mutateAsync(idAConfirmar);
                      }
                    } catch (err: any) {
                      alert(err.response?.data?.detail || "Error al procesar la solicitud");
                    }
                    setIdAConfirmar(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white font-medium text-sm hover:bg-danger-dark transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
