/** Grilla de ingredientes con filtros y paginación. */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, AlertTriangle, ArrowUpDown, Download, RotateCcw } from "lucide-react";
import { ingredientesApi } from "../../api/ingredientesApi";
import { productosApi } from "../../api/productosApi";
import Pagination from "../../components/Pagination";
import IngredienteForm from "./IngredienteForm";
import type { Ingrediente, IngredientesFilters, IngredienteCreate, ProductoAfectadoResponse } from "../../types";
import { useIngredientes, useCrearIngrediente, useActualizarIngrediente, useEliminarIngrediente, useRestaurarIngrediente, useDarDeBajaIngrediente } from "../../hooks/useIngredientes";
import { formatArgentinaDate } from "../../utils/dates";

interface Props {
  estado?: string;
}

export default function IngredientesGrid({ estado = "activo" }: Props) {
  const [searchParams] = useSearchParams();
  const initialSortBy = searchParams.get("sort_by") || "nombre";

  const [filters, setFilters] = useState<IngredientesFilters>({
    page: 1,
    per_page: 10,
    search: "",
    es_alergeno: "",
    es_producto_terminado: "",
    estado: estado,
    sort_by: initialSortBy,
    sort_order: "asc",
    created_from: "",
    created_to: "",
    updated_from: "",
    updated_to: "",
    starts_with: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingrediente | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [itemAConfirmar, setItemAConfirmar] = useState<{ id: number; tipo: 'eliminar' | 'baja' } | null>(null);
  const [ingredienteARestaurar, setIngredienteARestaurar] = useState<Ingrediente | null>(null);
  const [productosAfectadosRestaurar, setProductosAfectadosRestaurar] = useState<ProductoAfectadoResponse[]>([]);
  const [productosAActivarIds, setProductosAActivarIds] = useState<number[]>([]);
  const [mostrarConfirmacionAlta, setMostrarConfirmacionAlta] = useState(false);

  const { data, isLoading: loading } = useIngredientes(filters);

  const crearMut = useCrearIngrediente();
  const actualizarMut = useActualizarIngrediente();
  const eliminarMut = useEliminarIngrediente();
  const darDeBajaMut = useDarDeBajaIngrediente();
  const restaurarMut = useRestaurarIngrediente();

  // Buscar mientras se escribe, con debounce para no disparar una request por tecla.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim(), page: 1 }));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: searchInput.trim(), page: 1 }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleFilterChange = (key: keyof IngredientesFilters, value: string | number) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const handleCreatedDateChange = (value: string) => {
    setFilters((f) => ({
      ...f,
      created_from: value,
      created_to: value,
      page: 1,
    }));
  };

  const handleSave = async (formData: IngredienteCreate & { actualizar_precios_productos?: boolean }, id?: number) => {
    if (id) {
      return await actualizarMut.mutateAsync({ id, data: formData });
    } else {
      return await crearMut.mutateAsync(formData);
    }
  };

  const handleEliminar = (id: number) => {
    setItemAConfirmar({ id, tipo: 'eliminar' });
  };

  const handleDarDeBaja = (id: number) => {
    setItemAConfirmar({ id, tipo: 'baja' });
  };

  const handleExportCsv = async () => {
    try {
      const blob = await ingredientesApi.exportCsv(filters);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ingredientes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Error exportando a CSV:", err);
      alert("Error al exportar los datos.");
    }
  };

  const toggleSort = (col: string) => {
    setFilters((f) => ({
      ...f,
      sort_by: col,
      sort_order: f.sort_by === col && f.sort_order === "asc" ? "desc" : "asc",
      page: 1,
    }));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-dark">Gestión de Ingrediente</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los ingredientes del sistema.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-green-main hover:bg-green-dark text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={18} />
            Nuevo Ingrediente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* 1. Buscar por nombre */}
          <div className="relative xl:col-span-2 flex flex-col justify-end">
            <Search size={16} className="absolute left-3 bottom-3 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSearch}
              placeholder="Buscar por nombre..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-main focus:border-transparent outline-none"
            />
          </div>

          {/* Filtrar por alérgeno */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.es_alergeno}
              onChange={(e) => handleFilterChange("es_alergeno", e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-main focus:border-transparent outline-none bg-white"
            >
              <option value="">Todos (Alérgenos)</option>
              <option value="true">Solo Alérgenos</option>
              <option value="false">Sin Alérgenos</option>
            </select>
          </div>

          {/* Filtrar por tipo (Insumo / Venta) */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.es_producto_terminado}
              onChange={(e) => handleFilterChange("es_producto_terminado", e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-main focus:border-transparent outline-none bg-white"
            >
              <option value="">Todos (Tipo)</option>
              <option value="false">Solo Insumos</option>
              <option value="true">Solo Venta (Terminados)</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.estado}
              onChange={(e) => handleFilterChange("estado", e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-main focus:border-transparent outline-none bg-white"
            >
              <option value="activo">Activos</option>
              <option value="inactivo">Dados de Baja</option>
              <option value="todos">Todos (Estado)</option>
            </select>
          </div>

          {/* 3. Fecha de creación */}
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Creado el día</span>
            <input
              type="date"
              value={filters.created_from}
              onChange={(e) => handleCreatedDateChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-main focus:border-transparent outline-none"
            />
          </div>

          {/* 4. Ordenar por */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange("sort_by", e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-main focus:border-transparent outline-none bg-white"
            >
              <option value="nombre">Ordenar: Nombre</option>
              <option value="stock_critico">Ordenar: Stock Crítico</option>
              <option value="created_at">Ordenar: Creación</option>
              <option value="updated_at">Ordenar: Actualización</option>
            </select>
          </div>

          {/* 5. Orden asc/desc */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.sort_order}
              onChange={(e) => handleFilterChange("sort_order", e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-main focus:border-transparent outline-none bg-white"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>

          {/* 6. Items por página */}
          <div className="flex flex-col justify-end">
            <select
              value={filters.per_page}
              onChange={(e) => handleFilterChange("per_page", Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-main focus:border-transparent outline-none bg-white"
            >
              <option value={10}>10 por pág</option>
              <option value={20}>20 por pág</option>
              <option value={50}>50 por pág</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla / Grilla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-green-main border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package size={48} className="mb-3 opacity-50" />
            <p className="font-medium">No se encontraron ingredientes</p>
            <p className="text-sm mt-1">Intenta con otros filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] min-h-[450px] overflow-y-auto">
            <table className="w-full relative">
              <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 shadow-sm">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-green-main transition-colors"
                    onClick={() => toggleSort("nombre")}
                  >
                    <div className="flex items-center gap-1">
                      Nombre
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                   <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Costo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Alergeno
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-green-main transition-colors"
                    onClick={() => toggleSort("created_at")}
                  >
                    <div className="flex items-center gap-1">
                      Creado
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((item) => {
                  const isItemDeleted = item.active_at !== null;
                  return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-gray-50/50 ${isItemDeleted ? 'bg-danger-light/10' : ''}`}
                  >
                    <td className={`px-4 py-3 text-sm font-mono ${isItemDeleted ? 'text-danger' : 'text-gray-500'}`}>
                      #{item.id}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium max-w-[150px] truncate ${isItemDeleted ? 'text-danger line-through' : 'text-gray-900'}`} title={item.nombre}>
                      {item.nombre}
                    </td>
                    <td className={`px-4 py-3 text-sm font-bold ${isItemDeleted ? 'text-danger' : 'text-gray-900'}`}>
                      ${item.precio_costo?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col">
                        <span className={`font-bold ${item.stock_actual <= (item.stock_minimo || 0) ? 'text-danger' : 'text-gray-700'}`}>
                          {item.stock_actual}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">Mín: {item.stock_minimo || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.es_producto_terminado ? (
                        <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-bold uppercase border border-green-100">Venta</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-[10px] font-bold uppercase border border-gray-100">Insumo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.es_alergeno ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange/10 text-orange">
                          <AlertTriangle size={12} />
                          Alergeno
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-pale text-green-dark">
                          Seguro
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isItemDeleted ? 'text-danger' : 'text-gray-500'}`}>
                      {formatArgentinaDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isItemDeleted ? (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  const afectados = await ingredientesApi.getProductosAfectados(item.id);
                                  if (afectados.length > 0) {
                                    setIngredienteARestaurar(item);
                                    setProductosAfectadosRestaurar(afectados);
                                    setProductosAActivarIds(afectados.map(p => p.id));
                                    setMostrarConfirmacionAlta(true);
                                  } else {
                                    await restaurarMut.mutateAsync(item.id);
                                  }
                                } catch (err) {
                                  console.error("Error buscando productos afectados", err);
                                  await restaurarMut.mutateAsync(item.id);
                                }
                              }}
                              className="p-2 text-green-main hover:bg-green-pale rounded-lg transition-colors"
                              title="Restaurar"
                            >
                              <RotateCcw size={16} />
                            </button>
                            <button
                              onClick={() => handleEliminar(item.id)}
                              className="p-2 text-gray-400 hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
                              title="Eliminar permanentemente"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingItem(item); setModalOpen(true); }}
                              className="p-2 text-gray-500 hover:text-green-main hover:bg-green-pale rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDarDeBaja(item.id)}
                              className="p-2 text-gray-500 hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
                              title="Dar de baja"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {data && (
        <Pagination
          page={data.page}
          pages={data.pages}
          total={data.total}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      )}

      {/* Modal crear/editar */}
      <IngredienteForm
        isOpen={modalOpen}
        ingrediente={editingItem}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
        onSave={handleSave}
      />

      {itemAConfirmar && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setItemAConfirmar(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
                {itemAConfirmar.tipo === 'eliminar' ? 'Eliminar ingrediente' : 'Dar de baja ingrediente'}
              </h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                {itemAConfirmar.tipo === 'eliminar'
                  ? 'Esta acción es IRREVERSIBLE y el ingrediente desaparecerá del sistema.'
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

      {mostrarConfirmacionAlta && ingredienteARestaurar && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setMostrarConfirmacionAlta(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-50 rounded-xl text-green-600">
                  <RotateCcw size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Restaurar Insumo</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Estás restaurando el insumo <strong>{ingredienteARestaurar.nombre}</strong>. Este forma parte de las siguientes recetas. Seleccioná los productos que querés volver a marcar como <strong>disponibles para la venta</strong>:
              </p>

              <div className="max-h-48 overflow-y-auto mb-6 border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-2">
                {productosAfectadosRestaurar.map(p => {
                  const isSelected = productosAActivarIds.includes(p.id);
                  return (
                    <label key={p.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-100/50 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProductosAActivarIds(prev => [...prev, p.id]);
                            } else {
                              setProductosAActivarIds(prev => prev.filter(id => id !== p.id));
                            }
                          }}
                          className="w-3.5 h-3.5 text-green-main focus:ring-green-main border-gray-300 rounded"
                        />
                        <span className="font-semibold text-gray-700">{p.nombre}</span>
                      </div>
                      <span className="text-gray-500 font-mono">
                        (usa {p.cantidad_ingrediente} {p.unidad_ingrediente})
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarConfirmacionAlta(false);
                    setIngredienteARestaurar(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await restaurarMut.mutateAsync(ingredienteARestaurar.id);
                      if (productosAActivarIds.length > 0) {
                        await Promise.all(
                          productosAActivarIds.map(id => productosApi.updateDisponibilidad(id, true))
                        );
                      }
                    } catch (err) {
                      console.error("Error al restaurar insumo o activar productos", err);
                    } finally {
                      setMostrarConfirmacionAlta(false);
                      setIngredienteARestaurar(null);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-green-main text-white font-bold text-sm hover:bg-green-dark transition-colors shadow-sm"
                >
                  Confirmar Alta
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Re-exportar el icono para el empty state
function Package(props: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
