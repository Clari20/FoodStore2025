/** Modal para crear/editar ingrediente. */
import { useState, useEffect } from "react";
import { X, Info, Package, UploadCloud, Trash2, AlertTriangle } from "lucide-react";
import type { Categoria, Ingrediente, IngredienteCreate, UnidadMedidaSimple, ProductoAfectadoResponse } from "../../types";
import { productosApi } from "../../api/productosApi";
import { categoriasApi } from "../../api/categoriasApi";
import { ingredientesApi } from "../../api/ingredientesApi";
import { uploadApi } from "../../api/uploadApi";

interface Props {
  isOpen: boolean;
  ingrediente: Ingrediente | null; // null = crear, object = editar
  onClose: () => void;
  onSave: (data: IngredienteCreate & { actualizar_precios_productos?: boolean }, id?: number) => Promise<any>;
}

export default function IngredienteForm({ isOpen, ingrediente, onClose, onSave }: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [esAlergeno, setEsAlergeno] = useState(false);
  const [esProductoTerminado, setEsProductoTerminado] = useState(false);
  const [precioCosto, setPrecioCosto] = useState<number | string>("");
  const [stockActual, setStockActual] = useState<number | string>("");
  const [ajusteStock, setAjusteStock] = useState<number | string>("");
  const [stockMinimo, setStockMinimo] = useState<number | string>("");
  const [unidadMedidaId, setUnidadMedidaId] = useState<number | "">("");
  const [activo, setActivo] = useState(true);

  // Campos para auto-creación de producto cuando es insumo terminado
  const [categoriaId, setCategoriaId] = useState<number | "">("")
  const [margenGanancia, setMargenGanancia] = useState<number | string>("");
  const [precioBase, setPrecioBase] = useState<number | string>("");
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  const [unidades, setUnidades] = useState<UnidadMedidaSimple[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productosAfectados, setProductosAfectados] = useState<ProductoAfectadoResponse[]>([]);
  const [mostrarConfirmacionPrecios, setMostrarConfirmacionPrecios] = useState(false);
  const [productosAActualizarIds, setProductosAActualizarIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchUnidades();
      fetchCategorias();
    }
  }, [isOpen]);

  const fetchUnidades = async () => {
    try {
      const data = await productosApi.getUnidadesMedida();
      setUnidades(data);
    } catch (err) {
      console.error("Error fetching units", err);
    }
  };

  const fetchCategorias = async () => {
    try {
      const data = await categoriasApi.listFlat();
      setCategorias(data);
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  };

  useEffect(() => {
    if (ingrediente) {
      setNombre(ingrediente.nombre);
      setDescripcion(ingrediente.descripcion || "");
      setEsAlergeno(ingrediente.es_alergeno);
      setEsProductoTerminado(ingrediente.es_producto_terminado || false);
      setPrecioCosto(ingrediente.precio_costo ?? "");
      setStockActual(ingrediente.stock_actual ?? "");
      setStockMinimo(ingrediente.stock_minimo ?? "");
      setUnidadMedidaId(ingrediente.unidad_medida_id || "");
      setActivo(ingrediente.active_at === null);

      // Si es terminado, buscar el producto vinculado para pre-popular categoría y monto extra
      if (ingrediente.es_producto_terminado) {
        fetchLinkedProduct(ingrediente.id);
      } else {
        setCategoriaId("");
        setMargenGanancia("");
        setPrecioBase("");
        setImagenes([]);
      }
    } else {
      setNombre("");
      setDescripcion("");
      setEsAlergeno(false);
      setEsProductoTerminado(false);
      setPrecioCosto("");
      setStockActual("");
      setAjusteStock("");
      setStockMinimo("");
      setUnidadMedidaId("");
      setActivo(true);
      setCategoriaId("");
      setMargenGanancia("");
      setPrecioBase("");
      setImagenes([]);
    }
    setError("");
  }, [ingrediente, isOpen]);

  // Buscar producto vinculado a este ingrediente (para edición)
  const fetchLinkedProduct = async (ingredienteId: number) => {
    try {
      const afectados = await ingredientesApi.getProductosAfectados(ingredienteId);
      const linkedAfectado = afectados[0];
      if (linkedAfectado) {
        const linked = await productosApi.getById(linkedAfectado.id);
        const catPrincipal = linked.categorias?.find(c => c.es_principal) || linked.categorias?.[0];
        if (catPrincipal) setCategoriaId(catPrincipal.categoria.id);
        setMargenGanancia(linked.margen_ganancia ?? "");
        setPrecioBase(linked.precio_base ?? "");
        setImagenes(linked.imagenes ?? []);
      } else {
        setCategoriaId("");
        setMargenGanancia("");
        setPrecioBase("");
        setImagenes([]);
      }
    } catch (err) {
      console.error("Error buscando producto vinculado", err);
    }
  };

  if (!isOpen) return null;

  // Resolver categorías ancestras para el producto terminado
  const getCategoriasPayload = (): { categoria_id: number; es_principal: boolean }[] => {
    if (categoriaId === "") return [];
    const payload: { categoria_id: number; es_principal: boolean }[] = [];
    let currentId: number | null = Number(categoriaId);
    let esPrincipal = true;

    while (currentId) {
      if (!payload.some(c => c.categoria_id === currentId)) {
        payload.push({ categoria_id: currentId, es_principal: esPrincipal });
      }
      esPrincipal = false;
      const catInfo = categorias.find(c => c.id === currentId);
      currentId = catInfo?.padre_id || null;
    }
    return payload;
  };

  const executeSave = async (actualizarPrecios: boolean, limitProductos?: number[]) => {
    setLoading(true);
    setError("");
    try {
      const savedIngrediente = await onSave({ 
        nombre: nombre.trim(), 
        descripcion: descripcion.trim() || null, 
        es_alergeno: esAlergeno,
        es_producto_terminado: esProductoTerminado,
        precio_costo: Number(precioCosto),
        stock_actual: Number(stockActual),
        stock_minimo: Number(stockMinimo),
        unidad_medida_id: Number(unidadMedidaId),
        activo,
        actualizar_precios_productos: actualizarPrecios,
        productos_a_actualizar: limitProductos
      }, ingrediente?.id);

      // Si es producto terminado, crear o actualizar el producto vinculado
      if (esProductoTerminado) {
        try {
          const ingId = ingrediente?.id || savedIngrediente?.id;

          if (ingId) {
            // Buscamos si ya tiene un producto vinculado usando el ID del ingrediente
            const afectados = await ingredientesApi.getProductosAfectados(ingId);
            const linkedAfectado = afectados[0];

            if (linkedAfectado) {
              // Actualizar producto existente
              await productosApi.update(linkedAfectado.id, {
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || null,
                precio_base: Number(precioBase || 0),
                stock_cantidad: 0,
                margen_ganancia: Number(margenGanancia || 0),
                disponible: true,
                activo: true,
                unidad_venta_id: null,
                categorias: getCategoriasPayload(),
                ingredientes: [{
                  ingrediente_id: ingId,
                  cantidad: 1,
                  unidad_medida_id: Number(unidadMedidaId),
                  es_removible: false
                }],
                imagenes
              });
            } else {
              // No había producto vinculado — crear uno nuevo
              await productosApi.create({
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || null,
                precio_base: Number(precioBase || 0),
                stock_cantidad: 0,
                margen_ganancia: Number(margenGanancia || 0),
                disponible: true,
                activo: true,
                unidad_venta_id: null,
                categorias: getCategoriasPayload(),
                ingredientes: [{
                  ingrediente_id: ingId,
                  cantidad: 1,
                  unidad_medida_id: Number(unidadMedidaId),
                  es_removible: false
                }],
                imagenes
              });
            }
          }
        } catch (prodErr) {
          console.error("Error gestionando producto vinculado:", prodErr);
          // No bloqueamos — el insumo ya se guardó exitosamente
        }
      }

      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (unidadMedidaId === "") {
      setError("La unidad de medida es obligatoria");
      return;
    }

    // Validar campos de producto terminado
    if (esProductoTerminado) {
      if (categoriaId === "") {
        setError("Seleccioná una categoría para el producto");
        return;
      }
    }

    const nuevoCosto = Number(precioCosto);
    const costoCambio = ingrediente ? nuevoCosto !== ingrediente.precio_costo : false;

    if (ingrediente && costoCambio) {
      try {
        setLoading(true);
        const afectados = await ingredientesApi.getProductosAfectados(ingrediente.id);
        if (afectados.length > 0) {
          setProductosAfectados(afectados);
          setProductosAActualizarIds(afectados.map((p) => p.id));
          setMostrarConfirmacionPrecios(true);
          return;
        }
      } catch (err) {
        console.error("Error buscando productos afectados:", err);
      } finally {
        setLoading(false);
      }
    }

    await executeSave(false);
  };

  const calculatedCosto = Number(precioCosto || 0);
  const precioSugerido = calculatedCosto * (1 + Number(margenGanancia || 0));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl animate-scale-in max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {(() => {
          const selectedUnidad = unidades.find(u => u.id === Number(unidadMedidaId));
          const stepValue = selectedUnidad?.tipo === "unidad" ? "1" : "0.001";

          return (
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh] overflow-hidden flex-1">
              {/* HEADER FIJO */}
              <div className="flex items-center justify-between p-6 border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-green-dark">
                    {ingrediente ? "Editar Insumo" : "Nuevo Insumo / Ingrediente"}
                  </h2>
                  <p className="text-xs text-gray-500">Define los parámetros del insumo para el cálculo de stock y costos.</p>
                </div>
                <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* ALERTA FIJA DEBAJO DEL TÍTULO */}
              {error && (
                <div className="mx-6 mt-4 bg-danger-light text-danger-dark px-4 py-2 rounded-lg text-sm border border-danger/20">
                  {error}
                </div>
              )}

              {/* CONTENIDO SCROLLABLE */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECCIÓN 1: DATOS BÁSICOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-gray-700">Nombre del Insumo</label>
                <span className="text-xs text-gray-400">{nombre.length}/100</span>
              </div>
              <input
                type="text"
                value={nombre}
                maxLength={100}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Harina de trigo, Queso Muzarella..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main focus:border-transparent outline-none text-sm"
                autoFocus
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={descripcion}
                maxLength={500}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalles adicionales del insumo..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main focus:border-transparent outline-none text-sm resize-none h-16"
              />
            </div>
          </div>

          {/* SECCIÓN 2: COSTOS Y STOCK */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Info size={16} className="text-green-main" />
              Gestión de Inventario y Costos
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidad de Medida</label>
                <select
                  value={unidadMedidaId}
                  onChange={(e) => setUnidadMedidaId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Costo (por unidad)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={precioCosto}
                    onChange={(e) => setPrecioCosto(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm"
                  />
                </div>
              </div>

              <div className={ingrediente ? "col-span-2 md:col-span-2 flex flex-col sm:flex-row gap-4 items-end" : ""}>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Actual</label>
                  <input
                    type="number"
                    step={stepValue}
                    value={stockActual}
                    onChange={(e) => setStockActual(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm"
                  />
                </div>

                {ingrediente && (
                  <div className="flex-1 w-full bg-green-50/50 p-2 rounded-lg border border-green-100">
                    <label className="block text-xs font-bold text-green-700 uppercase mb-1">Agregar Stock (+/-)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step={stepValue}
                        placeholder="Ej: 24 o -5"
                        value={ajusteStock}
                        onChange={(e) => setAjusteStock(e.target.value)}
                        className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm"
                      />
                      <button
                        type="button"
                        disabled={!ajusteStock}
                        onClick={() => {
                          if (ajusteStock) {
                            const numAjuste = Number(ajusteStock);
                            if (stepValue === "1" && !Number.isInteger(numAjuste)) {
                              setError("Este insumo se mide en unidades, el ajuste debe ser un número entero.");
                              return;
                            }
                            setError("");
                            setStockActual(Number(stockActual || 0) + numAjuste);
                            setAjusteStock("");
                          }
                        }}
                        className="px-4 py-2 bg-green-main text-white rounded-lg text-sm font-bold hover:bg-green-dark transition-colors disabled:opacity-50"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Mínimo (Alerta)</label>
                <input
                  type="number"
                  step={stepValue}
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CONFIGURACIÓN ADICIONAL */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-700">Contiene Alérgenos</span>
                <span className="text-xs text-gray-500">Marca si este insumo puede causar alergias.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={esAlergeno}
                  onChange={(e) => setEsAlergeno(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-main rounded-full peer peer-checked:bg-orange transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-700">Es Producto Terminado</span>
                <span className="text-xs text-gray-500">¿Se puede vender directamente al cliente?</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={esProductoTerminado}
                  onChange={(e) => setEsProductoTerminado(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-main rounded-full peer peer-checked:bg-green-main transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            {/* Sección de producto vinculado — visible siempre que sea terminado */}
            {esProductoTerminado && (
              <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-green-700">
                  <Package size={16} />
                  <span className="text-sm font-bold">Producto Automático</span>
                </div>
                <p className="text-xs text-green-600">
                  {ingrediente
                    ? "Editá la categoría y el monto extra. Al guardar, se actualizará el producto vinculado automáticamente."
                    : "Al guardar, se creará un producto de venta directa con este insumo. Solo necesitás elegir la categoría y cuánto querés sumarle al costo."
                  }
                </p>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Categoría de Tienda</label>
                    <select
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {categorias
                        .filter(c => !categorias.some(sub => sub.padre_id === c.id))
                        .map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-green-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3 border-b border-green-50 pb-2 mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-green-800 uppercase tracking-wider">Rentabilidad y Precio</h3>
                      <div className="text-[10px] text-green-600 font-medium">Cálculo basado en insumo</div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo Insumo</label>
                      <div className="text-lg font-bold text-gray-900">${calculatedCosto.toFixed(2)}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Margen Ganancia (%)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" step="0.1"
                          value={margenGanancia === "" ? "" : Number(margenGanancia) * 100}
                          onChange={(e) => setMargenGanancia(e.target.value === "" ? "" : Number(e.target.value) / 100)}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm"
                        />
                        <span className="text-sm font-bold text-gray-400">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Sugerido</label>
                      <div className="text-lg font-bold text-green-600">${precioSugerido.toFixed(2)}</div>
                    </div>

                    <div className="md:col-span-3 pt-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Precio Final de Venta ($)</label>
                      <div className="flex gap-4 items-center">
                        <input
                          type="number" step="0.01" required
                          value={precioBase}
                          onChange={(e) => setPrecioBase(e.target.value)}
                          className="flex-1 px-4 py-2.5 border-2 border-green-main rounded-xl focus:ring-4 focus:ring-green-100 outline-none text-lg font-bold text-green-800"
                        />
                        <button
                          type="button"
                          onClick={() => setPrecioBase(Number(precioSugerido.toFixed(2)))}
                          className="text-[10px] bg-green-main text-white px-3 py-2 rounded-lg font-bold hover:bg-green-dark transition-colors"
                        >
                          USAR SUGERIDO
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Imágenes del Producto (hasta 3 fotos)</label>
                    <div className="flex gap-4">
                      {imagenes.map((img, idx) => (
                        <div key={idx} className="relative w-24 h-24 rounded-lg border border-green-200 overflow-hidden bg-white">
                          <img src={img.startsWith('http') ? img : `http://localhost:8000${img}`} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImagenes(imagenes.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {imagenes.length < 3 && (
                        <label className="w-24 h-24 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-green-300 cursor-pointer text-green-600 hover:bg-green-100 transition-colors text-center">
                          <UploadCloud size={24} />
                          <span className="text-[10px] font-bold">Subir Foto</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  setLoading(true);
                                  const url = await uploadApi.uploadImagen(file);
                                  setImagenes([...imagenes, url]);
                                } catch (err) {
                                  console.error("Error subiendo imagen", err);
                                  setError("Error al subir la imagen");
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
                </div>
              </div>
            )}

            {ingrediente && (
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700">Estado Activo</span>
                  <span className="text-xs text-gray-500">{activo ? "Disponible para recetas" : "Inactivo"}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-main rounded-full peer peer-checked:bg-green-main transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER FIJO */}
              <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-green-main text-white rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50 text-sm font-bold shadow-md"
                >
                  {loading ? "Guardando..." : "Guardar Insumo"}
                </button>
              </div>
            </form>
          );
        })()}
      </div>

      {mostrarConfirmacionPrecios && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 text-warning mb-4">
              <div className="p-2 bg-yellow-50 rounded-xl text-yellow-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Actualización de Precios</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              El costo de este insumo cambió. Seleccioná los productos que querés actualizar automáticamente:
            </p>

            <div className="max-h-48 overflow-y-auto mb-6 border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-2">
              {productosAfectados.map(p => {
                const isSelected = productosAActualizarIds.includes(p.id);
                return (
                  <label key={p.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-100/50 px-1 rounded transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProductosAActualizarIds(prev => [...prev, p.id]);
                          } else {
                            setProductosAActualizarIds(prev => prev.filter(id => id !== p.id));
                          }
                        }}
                        className="w-3.5 h-3.5 text-green-main focus:ring-green-main border-gray-300 rounded"
                      />
                      <span className="font-semibold text-gray-700">{p.nombre}</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        (usa {p.cantidad_ingrediente} {p.unidad_ingrediente})
                      </span>
                    </div>
                    <span className="text-gray-500 font-mono">
                      ${p.precio_base_actual.toFixed(2)}
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 mb-6 leading-relaxed bg-blue-50 text-blue-700 p-2.5 rounded-lg">
              ℹ️ Se recalcularán automáticamente los precios de venta de los productos seleccionados usando su margen de ganancia.
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  setMostrarConfirmacionPrecios(false);
                  await executeSave(true, productosAActualizarIds);
                }}
                disabled={productosAActualizarIds.length === 0}
                className="w-full py-2.5 bg-green-main text-white font-bold rounded-xl text-sm hover:bg-green-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Actualizar precios seleccionados ({productosAActualizarIds.length})
              </button>
              <button
                type="button"
                onClick={async () => {
                  setMostrarConfirmacionPrecios(false);
                  await executeSave(false);
                }}
                className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                No, conservar precios actuales
              </button>
              <button
                type="button"
                onClick={() => setMostrarConfirmacionPrecios(false)}
                className="w-full py-2 text-gray-400 font-medium text-xs hover:text-gray-600 transition-colors text-center mt-1"
              >
                Volver a editar insumo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

