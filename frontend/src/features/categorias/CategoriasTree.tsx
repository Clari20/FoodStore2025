import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, Plus, ChevronRight, ChevronDown, Edit2, Trash2, Package, Search, ShoppingBag, RotateCcw } from "lucide-react";
import { useCategoriasTree, useEliminarCategoria, useCrearCategoria, useActualizarCategoria, useRestaurarCategoria, useDarDeBajaCategoria } from "../../hooks/useCategorias";
import CategoriaForm from "./CategoriaForm";
import type { Categoria, CategoriaTree as CategoriaTreeType, CategoriaCreate } from "../../types";

export default function CategoriasTree() {
  const [estado, setEstado] = useState<string>("todos");
  const { data: tree, isLoading } = useCategoriasTree(estado);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Categoria | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null);
  const navigate = useNavigate();

  const crearMut = useCrearCategoria();
  const actualizarMut = useActualizarCategoria();
  const darDeBajaMut = useDarDeBajaCategoria();
  const eliminarMut = useEliminarCategoria();
  const restaurarMut = useRestaurarCategoria();

  const handleSave = async (data: CategoriaCreate, id?: number) => {
    if (id) {
      await actualizarMut.mutateAsync({ id, data });
    } else {
      await crearMut.mutateAsync(data);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setIdAEliminar(id);
  };

  const handleRestore = async (id: number) => {
    await restaurarMut.mutateAsync(id);
  };

  const isDeletedView = estado === "inactivo";

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-dark">
            {isDeletedView ? "Categorías Dadas de Baja" : "Árbol de Categorías"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDeletedView ? "Categorías eliminadas. Podes reactivarlas." : "Gestiona la jerarquía del menú."}
          </p>
        </div>
        {!isDeletedView && (
          <button
            onClick={() => { setEditingItem(null); setSelectedParentId(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-green-main hover:bg-green-dark text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <FolderPlus size={18} />
            Nueva Categoría Raíz
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Buscador */}
          <div className="relative md:col-span-2">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar categoría por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none transition-all"
            />
          </div>

          {/* Filtro Estado */}
          <div>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
            >
              <option value="activo">Activos</option>
              <option value="inactivo">Dados de Baja</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-3 border-green-main border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tree?.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package size={48} className="mx-auto mb-3 opacity-20" />
            <p>No se encontraron categorías.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tree
              ?.filter(node => {
                const term = search.trim().toLowerCase();
                const matches = (n: CategoriaTreeType): boolean => 
                  n.nombre.toLowerCase().includes(term) || 
                  (n.descripcion?.toLowerCase().includes(term) ?? false) ||
                  (n.subcategorias?.some(matches) ?? false);
                return matches(node);
              })
              .map((node) => (
              <TreeNode 
                key={node.id} 
                node={node} 
                search={search.trim()}
                onEdit={(cat) => { setEditingItem(cat); setModalOpen(true); }}
                onDelete={handleDelete}
                onRestore={handleRestore}
                onAddSub={(parentId) => { setEditingItem(null); setSelectedParentId(parentId); setModalOpen(true); }}
                onViewProducts={(id) => navigate(`/productos?categoria=${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CategoriaForm
        isOpen={modalOpen}
        categoria={editingItem}
        parentId={selectedParentId}
        onClose={() => { setModalOpen(false); setEditingItem(null); setSelectedParentId(null); }}
        onSave={handleSave}
      />

      {idAEliminar !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setIdAEliminar(null)} />
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
                <button onClick={() => setIdAEliminar(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (isDeletedView) {
                        await eliminarMut.mutateAsync(idAEliminar);
                      } else {
                        await darDeBajaMut.mutateAsync(idAEliminar);
                      }
                    } catch (err: any) {
                      alert(err.response?.data?.detail || "Error al procesar la solicitud");
                    }
                    setIdAEliminar(null);
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

function TreeNode({ 
  node, 
  search,
  onEdit, 
  onDelete, 
  onRestore,
  onAddSub,
  onViewProducts
}: { 
  node: CategoriaTreeType, 
  search: string,
  onEdit: (c: Categoria) => void,
  onDelete: (id: number) => void,
  onRestore: (id: number) => void,
  onAddSub: (id: number) => void,
  onViewProducts: (id: number) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    if (search) setIsExpanded(true);
  }, [search]);

  const hasSub = node.subcategorias && node.subcategorias.length > 0;
  const isDeleted = node.active_at !== null;

  const filteredSubs = node.subcategorias?.filter(sub => {
    const term = search.trim().toLowerCase();
    const matches = (n: CategoriaTreeType): boolean => 
      n.nombre.toLowerCase().includes(term) || 
      (n.descripcion?.toLowerCase().includes(term) ?? false) ||
      (n.subcategorias?.some(matches) ?? false);
    return matches(sub);
  });

  const isMatch = node.nombre.toLowerCase().includes(search.trim().toLowerCase()) || 
                  (node.descripcion?.toLowerCase().includes(search.trim().toLowerCase()) ?? false);

  return (
    <div className="select-none">
      <div className={`flex items-center group py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors ${isDeleted ? 'bg-danger-light/10' : ''}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1 hover:bg-gray-200 rounded transition-colors ${!hasSub ? 'opacity-0 cursor-default' : ''}`}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex-1 flex items-center gap-3 ml-1 overflow-hidden">
          {node.imagen_url ? (
            <img src={node.imagen_url} alt={node.nombre} className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 flex-shrink-0">
              <Package size={10} />
            </div>
          )}
          <span title={node.nombre} className={`font-medium truncate max-w-[150px] ${hasSub ? 'text-gray-900' : 'text-gray-600'} ${isMatch && search ? 'bg-yellow-100 text-yellow-900 px-1 rounded' : ''} ${isDeleted ? 'text-danger line-through' : ''}`}>
            {node.nombre}
          </span>
          <span title={node.descripcion || ""} className={`text-xs font-normal truncate max-w-[250px] ${isDeleted ? 'text-danger' : 'text-gray-400'}`}>
            {node.descripcion}
          </span>
          {isDeleted && (
             <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-danger-light text-danger">
                Baja
             </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isDeleted ? (
            <div className="flex gap-1">
              <button
                onClick={() => onRestore(node.id)}
                className="p-1.5 text-green-main hover:bg-green-pale rounded"
                title="Restaurar"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => onDelete(node.id)}
                className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger-light rounded"
                title="Eliminar permanentemente"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onViewProducts(node.id)}
                className="p-1.5 text-gray-400 hover:text-green-dark hover:bg-green-pale rounded"
                title="Ver productos"
              >
                <ShoppingBag size={14} />
              </button>
              <button
                onClick={() => onAddSub(node.id)}
                className="p-1.5 text-gray-400 hover:text-green-main hover:bg-green-pale rounded"
                title="Agregar subcategoría"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => onEdit(node)}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => onDelete(node.id)}
                className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger-light rounded"
                title="Dar de baja"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {hasSub && isExpanded && (
        <div className="ml-6 border-l border-gray-100 pl-2 mt-1 space-y-1">
          {filteredSubs?.map((sub) => (
            <TreeNode 
              key={sub.id} 
              node={sub} 
              search={search}
              onEdit={onEdit}
              onDelete={onDelete}
              onRestore={onRestore}
              onAddSub={onAddSub}
              onViewProducts={onViewProducts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
