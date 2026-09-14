import { useEffect, useState } from "react";
import { X, Check, UploadCloud, Trash2, AlertTriangle } from "lucide-react";
import { useCategoriasFlat } from "../../hooks/useCategorias";
import { useIngredientes } from "../../hooks/useIngredientes";
import { useUnidadesMedida } from "../../hooks/useUnidadesMedida";
import type { Producto, ProductoCategoriaCreate, ProductoCreate, ProductoIngredienteCreate } from "../../types";
import { uploadApi } from "../../api/uploadApi";

interface Props {
  isOpen: boolean;
  producto: Producto | null;
  onClose: () => void;
  onSave: (data: ProductoCreate, id?: number) => Promise<void>;
}

interface ProductoFormData {
  nombre: string;
  descripcion: string;
  precio_base: number | string;
  stock_cantidad: number | string;
  margen_ganancia: number | string;
  disponible: boolean;
  activo: boolean;
  unidad_venta_id: number | null;
  imagenes: string[];
  categorias: ProductoCategoriaCreate[];
  ingredientes: ProductoIngredienteCreate[];
}

export default function ProductoForm({ isOpen, producto, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<ProductoFormData>({
    nombre: "",
    descripcion: "",
    precio_base: "",
    stock_cantidad: "",
    margen_ganancia: "",
    disponible: true,
    activo: true,
    unidad_venta_id: null,
    imagenes: [],
    categorias: [],
    ingredientes: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [searchCat, setSearchCat] = useState("");
  const [searchIng, setSearchIng] = useState("");

  const { data: categorias } = useCategoriasFlat();
  const { data: ingredientesData } = useIngredientes({
    page: 1,
    per_page: 500,
    search: "",
    es_alergeno: "",
    estado: "todos",
    sort_by: "nombre",
    sort_order: "asc",
    created_from: "",
    created_to: "",
    updated_from: "",
    updated_to: "",
    starts_with: ""
  });
  const { data: unidadesMedida } = useUnidadesMedida();

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        precio_base: producto.precio_base ?? "",
        stock_cantidad: producto.stock_cantidad ?? "",
        margen_ganancia: producto.margen_ganancia ?? "",
        disponible: producto.disponible,
        activo: producto.active_at === null,
        unidad_venta_id: producto.unidad_venta?.id || null,
        imagenes: producto.imagenes || [],
        categorias: producto.categorias.map(c => ({
          categoria_id: c.categoria.id,
          es_principal: c.es_principal
        })),
        ingredientes: producto.ingredientes.map(i => ({
          ingrediente_id: i.ingrediente.id,
          cantidad: i.cantidad,
          unidad_medida_id: i.unidad_medida?.id || 1, // fallback
          es_removible: i.es_removible
        }))
      });
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        precio_base: "",
        stock_cantidad: "",
        margen_ganancia: "",
        disponible: true,
        activo: true,
        unidad_venta_id: null,
        imagenes: [],
        categorias: [],
        ingredientes: []
      });
    }
    setError("");
  }, [producto, isOpen]);

  // Cálculo de costo teórico basado en los ingredientes seleccionados
  const calculatedCosto = formData.ingredientes.reduce((total, pi) => {
    const ingInfo = ingredientesData?.items.find(i => i.id === pi.ingrediente_id);
    const unidadReceta = unidadesMedida?.find(u => u.id === pi.unidad_medida_id);

    if (ingInfo) {
      // Factores de conversión (normalizamos a la unidad base, ej: gramos o mililitros)
      const fIng = ingInfo.unidad_medida?.factor_conversion || 1;
      const fReceta = unidadReceta?.factor_conversion || 1;

      const qtyBase = Number(pi.cantidad || 0) * fReceta;
      const priceBase = ingInfo.precio_costo / fIng;

      return total + (qtyBase * priceBase);
    }
    return total;
  }, 0);

  const precioSugerido = calculatedCosto * (1 + Number(formData.margen_ganancia || 0));

  // Detectar si alguno de los ingredientes seleccionados es un insumo terminado
  const tieneInsumoTerminado = formData.ingredientes.some(pi => {
    const ing = ingredientesData?.items.find(i => i.id === pi.ingrediente_id);
    return ing?.es_producto_terminado;
  });

  // Si tiene ingredientes, el stock físico debe ser 0 (se calcula dinámicamente)
  const esElaborable = formData.ingredientes.length > 0;

  // Detectar si alguno de los ingredientes seleccionados está dado de baja (inactivo)
  const tieneIngredientesInactivos = formData.ingredientes.some(pi => {
    const ing = ingredientesData?.items.find(i => i.id === pi.ingrediente_id);
    return ing && ing.active_at !== null;
  });

  if (!isOpen) return null;

  const toggleCategoria = (id: number) => {
    setFormData(prev => {
      const isSelected = prev.categorias.some(c => c.categoria_id === id);

      if (isSelected) {
        // Al deseleccionar, por ahora solo sacamos la que clickeó el usuario
        return { ...prev, categorias: prev.categorias.filter(c => c.categoria_id !== id) };
      } else {
        // Al seleccionar, subimos en la jerarquía para marcar a los padres
        let newCats = [...prev.categorias];
        let currentId: number | null = id;

        while (currentId) {
          // Si no está ya seleccionada, la agregamos
          if (!newCats.some(c => c.categoria_id === currentId)) {
            const esPrimer = newCats.length === 0;
            newCats.push({ categoria_id: currentId, es_principal: esPrimer });
          }

          // Buscamos el padre en la lista plana de categorías que ya tenemos cargada
          const catInfo = categorias?.find(c => c.id === currentId);
          currentId = catInfo?.padre_id || null;
        }

        return { ...prev, categorias: newCats };
      }
    });
  };

  const setCategoriaPrincipal = (id: number) => {
    setFormData(prev => ({
      ...prev,
      categorias: prev.categorias.map(c => ({
        ...c,
        es_principal: c.categoria_id === id
      }))
    }));
  };

  const toggleIngrediente = (id: number) => {
    setFormData(prev => {
      const exists = prev.ingredientes.find(i => i.ingrediente_id === id);
      if (exists) {
        return { ...prev, ingredientes: prev.ingredientes.filter(i => i.ingrediente_id !== id) };
      } else {
        // Verificar si el insumo que estamos agregando es un producto terminado
        const ingInfo = ingredientesData?.items.find(i => i.id === id);

        const yaHayTerminado = prev.ingredientes.some(pi => {
          const ing = ingredientesData?.items.find(i => i.id === pi.ingrediente_id);
          return ing?.es_producto_terminado;
        });

        if (ingInfo?.es_producto_terminado) {
          // Avisamos si ya había insumos normales seleccionados para que no se "destilden solos" sin aviso
          if (prev.ingredientes.length > 0 && !yaHayTerminado) {
            if (!window.confirm("Elegir un producto terminado eliminará los otros insumos normales que ya marcaste. ¿Querés continuar?")) {
              return prev;
            }
          }
          // Si es terminado, reemplaza todos los demas ingredientes (solo puede ir uno)
          return {
            ...prev,
            ingredientes: [
              { ingrediente_id: id, cantidad: 1, unidad_medida_id: ingInfo?.unidad_medida?.id || unidadesMedida?.[0]?.id || 1, es_removible: false }
            ]
          };
        }

        // Si ya hay un insumo terminado, no se puede agregar más (insumos normales)
        if (yaHayTerminado) return prev; // Bloqueado

        return {
          ...prev,
          ingredientes: [
            ...prev.ingredientes,
            { ingrediente_id: id, cantidad: 1, unidad_medida_id: ingInfo?.unidad_medida?.id || unidadesMedida?.[0]?.id || 1, es_removible: false }
          ]
        };
      }
    });
  };

  const updateIngrediente = (
    id: number,
    field: keyof ProductoIngredienteCreate,
    value: string | number | boolean,
  ) => {
    setFormData(prev => ({
      ...prev,
      ingredientes: prev.ingredientes.map(i => i.ingrediente_id === id ? { ...i, [field]: value } : i)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(formData.precio_base || 0) <= 0) {
      setError("El precio base debe ser mayor a 0");
      return;
    }
    if (formData.categorias.length === 0) {
      setError("Debés seleccionar al menos una categoría para el producto.");
      return;
    }
    if (formData.ingredientes.length === 0) {
      setError("Debés agregar al menos un ingrediente para el producto.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const dataToSend = {
        ...formData,
        precio_base: Number(formData.precio_base || 0),
        stock_cantidad: formData.ingredientes.length > 0 ? 0 : Number(formData.stock_cantidad || 0),
        margen_ganancia: Number(formData.margen_ganancia || 0),
        activo: formData.disponible, // Sincronizamos activo con disponible
        descripcion: formData.descripcion?.trim() || null,
        ingredientes: formData.ingredientes.map((i) => ({ ...i, cantidad: Number(i.cantidad || 0) }))
      } satisfies ProductoCreate;
      await onSave(dataToSend, producto?.id);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string | { msg?: string }[] } } };
      const detail = axiosErr.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail[0]?.msg || "Error al guardar el producto"
          : detail || "Error al guardar el producto",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {producto ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <p className="text-xs text-gray-500">Configura la receta, costos y precios de venta.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-danger-light text-danger-dark px-4 py-3 rounded-lg text-sm border border-danger/20">
            {error}
          </div>
        )}

        {tieneIngredientesInactivos && (
          <div className="mx-6 mt-4 bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg text-sm border border-yellow-200/50 flex items-center gap-2 font-medium animate-in fade-in duration-200">
            <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0" />
            <span>
              <strong>Atención:</strong> Este producto contiene ingredientes que están dados de baja en el inventario. Debés reemplazarlos o darlos de alta para habilitar la venta.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-semibold text-gray-700">Nombre del Producto</label>
                <span className="text-xs text-gray-400">{formData.nombre.length}/100</span>
              </div>
              <input
                type="text" required
                maxLength={100}
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-main outline-none"
                placeholder="Ej: Hamburguesa con Queso"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-semibold text-gray-700">Descripción</label>
                <span className="text-xs text-gray-400">{(formData.descripcion || "").length}/500</span>
              </div>
              <textarea
                maxLength={500}
                value={formData.descripcion || ""}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-main outline-none h-16 resize-none"
                placeholder="Ingredientes principales, preparación..."
              />
            </div>

            {/* Subida de Imágenes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Imágenes del Producto (hasta 3 fotos)</label>
              <div className="flex gap-4">
                {formData.imagenes?.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden group shadow-sm">
                    <img src={img.startsWith('http') ? img : `http://localhost:8000${img}`} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imagenes: formData.imagenes?.filter((_, i) => i !== idx) })}
                      className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {(formData.imagenes?.length || 0) < 3 && (
                  <label className={`w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-green-50 transition-colors text-gray-400 hover:text-green-main hover:border-green-main ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <UploadCloud size={24} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center px-1">Subir Foto</span>
                    <input
                      type="file" className="hidden" accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setLoading(true);
                            const url = await uploadApi.uploadImagen(file);
                            setFormData({ ...formData, imagenes: [...(formData.imagenes || []), url] });
                          } catch (err: unknown) {
                            const axiosErr = err as { response?: { data?: { detail?: string } } };
                            setError(axiosErr.response?.data?.detail || "Error al subir la imagen");
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="md:col-span-2 bg-green-50/30 p-4 rounded-xl border border-green-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3 border-b border-green-100 pb-2 mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-green-800 uppercase tracking-wider">Rentabilidad y Precio</h3>
                <div className="text-[10px] text-green-600 font-medium">Cálculo basado en insumos</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo Insumos</label>
                <div className="text-lg font-bold text-gray-900">${calculatedCosto.toFixed(2)}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Margen Ganancia (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" step="0.1"
                    value={formData.margen_ganancia === "" ? "" : Number(formData.margen_ganancia) * 100}
                    onChange={(e) => setFormData({ ...formData, margen_ganancia: e.target.value === "" ? "" : Number(e.target.value) / 100 })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm"
                  />
                  <span className="text-sm font-bold text-gray-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Sugerido</label>
                <div className="text-lg font-bold text-green-main">${precioSugerido.toFixed(2)}</div>
              </div>

              <div className="md:col-span-3 pt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Precio Final de Venta ($)</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="number" step="0.01" required
                    value={formData.precio_base}
                    onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
                    className="flex-1 px-4 py-2.5 border-2 border-green-main rounded-xl focus:ring-4 focus:ring-green-100 outline-none text-lg font-bold text-green-800"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, precio_base: Number(precioSugerido.toFixed(2)) })}
                    className="text-[10px] bg-green-main text-white px-3 py-2 rounded-lg font-bold hover:bg-green-dark transition-colors"
                  >
                    USAR SUGERIDO
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Stock Físico (Pre-hecho)
                {esElaborable && (
                  <span className="ml-2 text-[10px] font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                    Calculado desde ingredientes
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="number" required
                  value={esElaborable ? 0 : formData.stock_cantidad}
                  disabled={esElaborable}
                  onChange={(e) => setFormData({ ...formData, stock_cantidad: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-main outline-none ${esElaborable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                />
                <select
                  value={formData.unidad_venta_id || ""}
                  disabled={!!producto}
                  onChange={(e) => setFormData({ ...formData, unidad_venta_id: Number(e.target.value) || null })}
                  className={`px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm bg-white ${
                    producto ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="">Und.</option>
                  {unidadesMedida?.map(u => (
                    <option key={u.id} value={u.id}>{u.simbolo}</option>
                  ))}
                </select>
              </div>
            </div>


          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-900 uppercase tracking-wider text-[10px]">Categorías</label>
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={searchCat}
                  onChange={(e) => setSearchCat(e.target.value)}
                  className="text-[10px] px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-green-main outline-none w-32"
                />
              </div>
              <div className="border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1 bg-gray-50/30">
                {categorias
                  ?.filter(c => !categorias.some(sub => sub.padre_id === c.id)) // Solo hojas
                  .filter(c => c.nombre.toLowerCase().includes(searchCat.toLowerCase()))
                  .sort((a, b) => {
                    const isSelectedA = formData.categorias.some(cat => cat.categoria_id === a.id);
                    const isSelectedB = formData.categorias.some(cat => cat.categoria_id === b.id);
                    if (isSelectedA && !isSelectedB) return -1;
                    if (!isSelectedA && isSelectedB) return 1;
                    return 0;
                  })
                  .map(c => {
                    const isSelected = formData.categorias.some(cat => cat.categoria_id === c.id);
                    const isPrincipal = formData.categorias.find(cat => cat.categoria_id === c.id)?.es_principal;

                    return (
                      <div key={c.id} className="flex flex-col gap-1 p-2 hover:bg-white rounded-lg transition-colors group">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-green-main border-green-main text-white' : 'border-gray-300 bg-white group-hover:border-green-main'}`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                          <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleCategoria(c.id)} />
                          <span className="text-sm text-gray-700">{c.nombre}</span>
                        </label>
                        {isSelected && (
                          <label className="flex items-center gap-2 ml-8 text-xs cursor-pointer">
                            <input type="radio" name="cat_principal" checked={isPrincipal || false} onChange={() => setCategoriaPrincipal(c.id)} className="text-green-main w-3 h-3" />
                            <span className="text-gray-500">Principal</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-900 uppercase tracking-wider text-[10px]">Receta (Insumos)</label>
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={searchIng}
                  onChange={(e) => setSearchIng(e.target.value)}
                  className="text-[10px] px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-green-main outline-none w-32"
                />
              </div>
              <div className="border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1 bg-gray-50/30">
                {ingredientesData?.items?.filter(i => i.nombre.toLowerCase().includes(searchIng.toLowerCase()))
                  .sort((a, b) => {
                    const isSelectedA = formData.ingredientes.some(ing => ing.ingrediente_id === a.id);
                    const isSelectedB = formData.ingredientes.some(ing => ing.ingrediente_id === b.id);
                    if (isSelectedA && !isSelectedB) return -1;
                    if (!isSelectedA && isSelectedB) return 1;
                    return 0;
                  })
                  .map(i => {
                    const ingredienteData = formData.ingredientes.find(ing => ing.ingrediente_id === i.id);
                    const isSelected = !!ingredienteData;
                    const esTerminado = i.es_producto_terminado;
                    const isInactive = i.active_at !== null;
                    // Si el producto ya tiene un insumo terminado, bloqueamos TODO para que no se pueda destildar ni cambiar.
                    const bloqueado = tieneInsumoTerminado;

                    return (
                      <div key={i.id} className={`flex flex-col gap-2 p-2 rounded-lg transition-colors border ${
                        isInactive && isSelected
                          ? 'bg-red-50/40 border-red-200'
                          : isSelected 
                            ? 'bg-green-50/50 border-green-200' 
                            : bloqueado 
                              ? 'opacity-40 cursor-not-allowed border-transparent' 
                              : 'hover:bg-white border-transparent'
                      }`}>
                        <label className={`flex items-center gap-3 ${bloqueado ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isInactive && isSelected
                              ? 'bg-red-500 border-red-500 text-white'
                              : isSelected 
                                ? 'bg-green-main border-green-main text-white' 
                                : 'border-gray-300 bg-white group-hover:border-green-main'
                          }`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                          <input type="checkbox" className="hidden" checked={isSelected} onChange={() => !bloqueado && toggleIngrediente(i.id)} disabled={bloqueado} />
                          <span className="text-sm font-medium text-gray-700">
                            {i.nombre}
                            {esTerminado && <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">TERMINADO</span>}
                            {isInactive && (
                              <span className="ml-1 text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold font-mono">
                                DADO DE BAJA
                              </span>
                            )}
                            {' '}<span className="text-[10px] text-gray-400 font-normal">($ {i.precio_costo}/{i.unidad_medida?.simbolo || 'unid'})</span>
                          </span>
                        </label>

                        {isSelected && ingredienteData && !esTerminado && (
                          <div className="flex flex-col gap-2 pl-8 pt-1">
                            <div className="flex gap-2">
                              <input
                                type="number" step="any"
                                value={ingredienteData.cantidad}
                                onChange={(e) => updateIngrediente(i.id, 'cantidad', e.target.value)}
                                className="w-20 text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-green-main outline-none"
                              />
                              <select
                                value={ingredienteData.unidad_medida_id}
                                onChange={(e) => updateIngrediente(i.id, 'unidad_medida_id', Number(e.target.value))}
                                disabled={i.unidad_medida?.nombre?.toLowerCase().includes('gramo') || i.unidad_medida?.simbolo?.toLowerCase() === 'gr' || i.unidad_medida?.simbolo?.toLowerCase() === 'g'}
                                className={`flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-green-main outline-none ${
                                  (i.unidad_medida?.nombre?.toLowerCase().includes('gramo') || i.unidad_medida?.simbolo?.toLowerCase() === 'gr' || i.unidad_medida?.simbolo?.toLowerCase() === 'g') 
                                    ? 'bg-gray-100 cursor-not-allowed opacity-70' 
                                    : 'bg-white'
                                }`}
                              >
                                {unidadesMedida?.map(u => (
                                  <option key={u.id} value={u.id}>{u.simbolo}</option>
                                ))}
                              </select>
                            </div>
                            <label className="flex items-center gap-2 text-xs cursor-pointer w-fit">
                              <input type="checkbox" checked={ingredienteData.es_removible} onChange={(e) => updateIngrediente(i.id, 'es_removible', e.target.checked)} className="w-3 h-3 rounded text-green-main" />
                              <span className="text-gray-500">Removible</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white border-t border-gray-100 py-4 mt-auto">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-green-main text-white font-bold rounded-lg hover:bg-green-dark shadow-md disabled:opacity-50">
              {loading ? "Guardando..." : "Guardar Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
