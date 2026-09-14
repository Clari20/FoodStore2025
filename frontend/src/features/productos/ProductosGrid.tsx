import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, Package, RotateCcw, XCircle } from "lucide-react";
import {
  useProductos,
  useDarDeBajaProducto,
  useEliminarProducto,
  useCrearProducto,
  useActualizarProducto,
  useRestaurarProducto,
  useActualizarDisponibilidadProducto,
} from "../../hooks/useProductos";
import { useCategoriasFlat } from "../../hooks/useCategorias";
import Pagination from "../../components/Pagination";
import ProductoForm from "./ProductoForm";
import type { Producto, ProductosFilters, ProductoCreate } from "../../types";
import { useAuthStore } from "../../store/authStore";

export default function ProductosGrid() {
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get("categoria");

  const [filters, setFilters] = useState<ProductosFilters>({
    page: 1,
    per_page: 10,
    search: "",
    categoria: catParam ? Number(catParam) : undefined,
    disponible: "",
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
  const [editingItem, setEditingItem] = useState<Producto | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [itemAConfirmar, setItemAConfirmar] = useState<{ id: number; tipo: 'eliminar' | 'baja' } | null>(null);

  const hasRole = useAuthStore((s) => s.hasRole);
  const isAdmin = hasRole("ADMIN");
  const isStock = hasRole("COCINA_STOCK");
  const canManageFull = isAdmin;
  const canManageStock = isAdmin || isStock;
  // Sincronizar filtros si cambia el parámetro de URL
  useEffect(() => {
    if (catParam) {
      setFilters(prev => ({ ...prev, categoria: Number(catParam), page: 1 }));
    }
  }, [catParam]);

  // Debounce para búsqueda
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim(), page: 1 }));
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const { data, isLoading } = useProductos(filters);
  const { data: categorias } = useCategoriasFlat();

  const crearMut = useCrearProducto();
  const actualizarMut = useActualizarProducto();
  const darDeBajaMut = useDarDeBajaProducto();
  const eliminarMut = useEliminarProducto();
  const restaurarMut = useRestaurarProducto();

  const actualizarDisponibilidadMut = useActualizarDisponibilidadProducto();

  const handleFilterChange = (key: keyof ProductosFilters, value: any) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const handleSave = async (formData: ProductoCreate, id?: number) => {
    if (id) {
      await actualizarMut.mutateAsync({ id, data: formData });
    } else {
      await crearMut.mutateAsync(formData);
    }
    setModalOpen(false);
  };

  const handleDarDeBaja = (id: number) => {
    setItemAConfirmar({ id, tipo: 'baja' });
  };

  const handleEliminar = (id: number) => {
    setItemAConfirmar({ id, tipo: 'eliminar' });
  };

  const handleRestore = async (id: number) => {
    await restaurarMut.mutateAsync(id);
  };

  const handleToggleDisponibilidad = async (producto: Producto) => {
    await actualizarDisponibilidadMut.mutateAsync({
      id: producto.id,
      disponible: !producto.disponible,
    });
  };

  const isDeletedView = filters.estado === "inactivo";

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-dark">
            {isDeletedView ? "Productos Dados de Baja" : "Gestión de Productos"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDeletedView 
              ? "Productos eliminados. Podes reactivarlos." 
              : "Administra los platos y bebidas del menú."}
          </p>
        </div>
        {!isDeletedView && canManageFull && (
          <button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-green-main hover:bg-green-dark text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <Plus size={18} />
            Nuevo Producto
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
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none"
            />
          </div>

          {/* Categoría */}
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Categoría</span>
            <select
              value={filters.categoria || ""}
              onChange={(e) => {
                const val = e.target.value;
                handleFilterChange("categoria", val ? Number(val) : undefined);
                if (val) searchParams.set("categoria", val);
                else searchParams.delete("categoria");
                setSearchParams(searchParams);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
            >
              <option value="">Todas</option>
              {categorias?.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Disponibilidad */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.disponible}
              onChange={(e) => handleFilterChange("disponible", e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
            >
              <option value="">Todos (Stock)</option>
              <option value="true">Solo Disponibles</option>
              <option value="false">Sin Stock</option>
            </select>
          </div>

          {/* Estado (Activo/Inactivo) */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.estado}
              onChange={(e) => handleFilterChange("estado", e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
            >
              <option value="activo">Activos</option>
              <option value="inactivo">Dados de Baja</option>
              <option value="todos">Ver Todos</option>
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
              <option value="precio_base">Ordenar: Precio</option>
              <option value="stock_cantidad">Ordenar: Stock</option>
              <option value="created_at">Ordenar: Creación</option>
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
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-green-main border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package size={48} className="mb-3 opacity-20" />
            <p>No se encontraron productos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] min-h-[450px] overflow-y-auto">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 shadow-sm">
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-500">ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Producto</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Categorías</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Precio</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Stock</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Estado</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((prod) => {
                  const isItemBaja = prod.active_at !== null;
                  return (
                    <tr key={prod.id} className={`hover:bg-gray-50/50 transition-colors ${isItemBaja ? 'bg-danger-light/10' : ''}`}>
                      <td className={`px-4 py-3 font-mono ${isItemBaja ? 'text-danger' : 'text-gray-400'}`}>#{prod.id}</td>
                      <td className="px-4 py-3">
                        <div title={prod.nombre} className={`font-medium truncate max-w-[200px] ${isItemBaja ? 'text-danger line-through' : 'text-gray-900'}`}>{prod.nombre}</div>
                        <div title={prod.descripcion || ""} className="text-xs text-gray-500 truncate max-w-[200px]">{prod.descripcion}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {prod.categorias?.map(c => (
                            <span key={c.categoria.id} className={`px-2 py-0.5 rounded text-[10px] font-medium ${c.es_principal ? 'bg-green-pale text-green-dark border border-green-main/20' : 'bg-gray-100 text-gray-600'}`}>
                              {c.categoria.nombre}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${isItemBaja ? 'text-danger' : 'text-gray-900'}`}>${prod.precio_base.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${prod.stock_cantidad < 5 ? 'text-danger' : 'text-gray-700'}`}>
                              {prod.stock_cantidad}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Físico</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-medium ${prod.stock_disponible < 5 ? 'text-orange' : 'text-green-main'}`}>
                              {prod.stock_disponible}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Elaborable</span>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5">{prod.unidad_venta?.simbolo || 'u'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isItemBaja ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-danger-light text-danger">
                            Baja
                          </span>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            !prod.disponible 
                              ? 'bg-gray-100 text-gray-500' 
                              : prod.stock_disponible === 0 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-green-pale text-green-dark'
                          }`}>
                            {!prod.disponible 
                              ? 'No disponible' 
                              : prod.stock_disponible === 0 
                                ? 'Sin stock' 
                                : 'Disponible'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {isItemBaja ? (
                            <>
                              {canManageFull && (
                                <>
                                  <button
                                    onClick={() => handleRestore(prod.id)}
                                    className="p-1.5 text-green-main hover:bg-green-pale rounded transition-colors"
                                    title="Restaurar"
                                  >
                                    <RotateCcw size={16} />
                                  </button>

                                  <button
                                    onClick={() => handleEliminar(prod.id)}
                                    className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger-light rounded transition-colors"
                                    title="Eliminar permanentemente"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              {canManageStock && (
                                <>
                                  <button
                                    onClick={() => handleToggleDisponibilidad(prod)}
                                    className="px-2 py-1 text-xs font-semibold text-gray-500 hover:text-green-main hover:bg-green-pale rounded transition-colors"
                                    title={prod.disponible ? "Marcar no disponible" : "Marcar disponible"}
                                  >
                                    {prod.disponible ? "Off" : "On"}
                                  </button>
                                </>
                              )}

                              {canManageFull && (
                                <>
                                  <button
                                    onClick={() => { setEditingItem(prod); setModalOpen(true); }}
                                    className="p-1.5 text-gray-400 hover:text-green-main hover:bg-green-pale rounded transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 size={16} />
                                  </button>

                                  <button
                                    onClick={() => handleDarDeBaja(prod.id)}
                                    className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger-light rounded transition-colors"
                                    title="Dar de baja"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
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

      <ProductoForm
        isOpen={modalOpen}
        producto={editingItem}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
        onSave={handleSave}
      />

      {itemAConfirmar && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setItemAConfirmar(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
                {itemAConfirmar.tipo === 'eliminar' ? 'Eliminar producto' : 'Dar de baja producto'}
              </h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                {itemAConfirmar.tipo === 'eliminar'
                  ? 'Esta acción es IRREVERSIBLE y el producto desaparecerá del sistema.'
                  : 'Podrás restaurarlo después.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setItemAConfirmar(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (itemAConfirmar.tipo === 'eliminar') {
                      await eliminarMut.mutateAsync(itemAConfirmar.id);
                    } else {
                      await darDeBajaMut.mutateAsync(itemAConfirmar.id);
                    }
                    setItemAConfirmar(null);
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
