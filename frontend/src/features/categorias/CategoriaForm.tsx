import { useEffect, useState } from "react";
import { X, Check, RotateCcw, UploadCloud, Trash2 } from "lucide-react";
import type { Categoria } from "../../types";
import { uploadApi } from "../../api/uploadApi";

interface Props {
  isOpen: boolean;
  categoria: Categoria | null;
  parentId: number | null;
  onClose: () => void;
  onSave: (data: any, id?: number) => Promise<void>;
}

export default function CategoriaForm({ isOpen, categoria, parentId, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<any>({
    nombre: "",
    descripcion: "",
    padre_id: null,
    imagen_url: "",
    activo: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categoria) {
      setFormData({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion || "",
        padre_id: categoria.padre_id,
        imagen_url: categoria.imagen_url || "",
        activo: categoria.active_at === null
      });
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        padre_id: parentId || null,
        imagen_url: "",
        activo: true
      });
    }
  }, [categoria, parentId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData, categoria?.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {categoria ? "Editar Categoría" : "Nueva Categoría"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-semibold text-gray-700">Nombre</label>
              <span className="text-xs text-gray-400">{formData.nombre.length}/100</span>
            </div>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-main focus:border-transparent outline-none transition-all"
              placeholder="Ej: Hamburguesas"
            />
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-semibold text-gray-700">Descripción (opcional)</label>
              <span className="text-xs text-gray-400">{(formData.descripcion || "").length}/500</span>
            </div>
            <textarea
              maxLength={500}
              value={formData.descripcion || ""}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-main focus:border-transparent outline-none transition-all resize-none h-24"
              placeholder="De qué se trata esta categoría..."
            />
          </div>

          {/* Imagen de la Categoría */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Imagen (opcional)</label>
            <div className="flex items-center gap-4">
              {formData.imagen_url ? (
                <div className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden group shadow-sm">
                  <img src={formData.imagen_url} alt="Vista previa" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imagen_url: "" })}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md animate-in fade-in duration-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className={`w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-green-50 transition-colors text-gray-400 hover:text-green-main hover:border-green-main ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <UploadCloud size={24} className="mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center px-1">Subir Foto</span>
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
                          setFormData({ ...formData, imagen_url: url });
                        } catch (err: any) {
                          alert(err.response?.data?.detail || "Error al subir la imagen");
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

          {/* Switch de Estado (Solo en edición) */}
          {categoria && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-700">Estado de la Categoría</p>
                <p className="text-xs text-gray-500">{formData.activo ? "Activa (Visible)" : "Dada de Baja (Oculta)"}</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  formData.activo ? "bg-green-main" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.activo ? "translate-x-6" : "translate-x-1"
                  } flex items-center justify-center`}
                >
                  {formData.activo ? (
                    <Check size={10} className="text-green-main" />
                  ) : (
                    <RotateCcw size={10} className="text-gray-400" />
                  )}
                </span>
              </button>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-green-main text-white font-semibold rounded-lg hover:bg-green-dark transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Guardando..." : "Guardar Categoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
