import { useState } from "react";
import { MapPin, Pencil, Trash2, Star, Plus, X, Check } from "lucide-react";
import {
  useDirecciones,
  useCrearDireccion,
  useActualizarDireccion,
  useEliminarDireccion,
  useMarcarPrincipal,
} from "../hooks/useDirecciones";
import type { DireccionCreate, DireccionResponse } from "../types";

const FORM_VACIO = {
  alias: "", calle: "", altura: "", linea2: "",
  ciudad: "", provincia: "", codigo_postal: "", es_principal: false,
};

function DireccionForm({
  inicial,
  onGuardar,
  onCancelar,
  isPending,
  titulo,
}: {
  inicial: typeof FORM_VACIO;
  onGuardar: (payload: DireccionCreate) => void;
  onCancelar: () => void;
  isPending: boolean;
  titulo: string;
}) {
  const [form, setForm] = useState(inicial);
  const set = (k: keyof typeof FORM_VACIO, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valido = form.calle.trim() && form.altura.trim() && form.ciudad.trim();

  const handleGuardar = () => {
    if (!valido) return;
    onGuardar({
      alias: form.alias || undefined,
      linea1: `${form.calle.trim()} ${form.altura.trim()}`,
      linea2: form.linea2 || undefined,
      ciudad: form.ciudad.trim(),
      provincia: form.provincia || undefined,
      codigo_postal: form.codigo_postal || undefined,
      es_principal: form.es_principal,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
        <button onClick={onCancelar} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Alias (Ej: Casa, Trabajo)</label>
          <input type="text" placeholder="Casa, Trabajo..." value={form.alias}
            onChange={(e) => set("alias", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Calle *</label>
            <input type="text" placeholder="Av. Siempre Viva" value={form.calle}
              onChange={(e) => set("calle", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Altura *</label>
            <input type="text" placeholder="742" value={form.altura}
              onChange={(e) => set("altura", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Piso / Depto (opcional)</label>
          <input type="text" placeholder="2B, Piso 3..." value={form.linea2}
            onChange={(e) => set("linea2", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad *</label>
            <input type="text" placeholder="Mendoza" value={form.ciudad}
              onChange={(e) => set("ciudad", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provincia</label>
            <input type="text" placeholder="Mendoza" value={form.provincia}
              onChange={(e) => set("provincia", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código Postal</label>
            <input type="text" placeholder="5519" value={form.codigo_postal}
              onChange={(e) => set("codigo_postal", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.es_principal}
            onChange={(e) => set("es_principal", e.target.checked)}
            className="w-4 h-4 text-green-main rounded border-gray-300 focus:ring-green-main" />
          <span className="text-sm text-gray-700">Marcar como dirección principal</span>
        </label>
        <div className="flex gap-3 pt-1">
          <button onClick={handleGuardar} disabled={isPending || !valido}
            className="flex-1 bg-green-main text-white font-semibold py-2.5 rounded-xl hover:bg-green-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isPending ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
            ) : (
              <><Check size={16} />Guardar</>
            )}
          </button>
          <button onClick={onCancelar} disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MisDireccionesPage() {
  const { data: direcciones, isLoading } = useDirecciones();
  const crear          = useCrearDireccion();
  const actualizar     = useActualizarDireccion();
  const eliminar       = useEliminarDireccion();
  const marcarPrincipal = useMarcarPrincipal();

  const [modo, setModo]   = useState<"idle" | "nueva" | "editar">("idle");
  const [editando, setEditando] = useState<DireccionResponse | null>(null);

  const abrirEditar = (dir: DireccionResponse) => {
    setEditando(dir);
    setModo("editar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [confirmarEliminarId, setConfirmarEliminarId] = useState<number | null>(null);
  const handleEliminar = (id: number) => {
    setConfirmarEliminarId(id);
  };

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Direcciones</h1>
            <p className="text-sm text-gray-500 mt-1">Gestioná tus direcciones de entrega</p>
          </div>
          {modo === "idle" && (
            <button onClick={() => setModo("nueva")}
              className="flex items-center gap-2 bg-green-main text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-green-dark transition-colors">
              <Plus size={18} />
              Nueva dirección
            </button>
          )}
        </div>

        {/* Formulario nueva */}
        {modo === "nueva" && (
          <DireccionForm
            titulo="Nueva dirección"
            inicial={FORM_VACIO}
            isPending={crear.isPending}
            onCancelar={() => setModo("idle")}
            onGuardar={(payload) =>
              crear.mutate(payload, { onSuccess: () => setModo("idle") })
            }
          />
        )}

        {/* Formulario editar */}
        {modo === "editar" && editando && (() => {
          const partes = editando.linea1.split(" ");
          const altura = partes.pop() ?? "";
          const calle  = partes.join(" ");
          return (
            <DireccionForm
              titulo={`Editar — ${editando.alias || editando.linea1}`}
              inicial={{
                alias: editando.alias ?? "",
                calle,
                altura,
                linea2: editando.linea2 ?? "",
                ciudad: editando.ciudad,
                provincia: editando.provincia ?? "",
                codigo_postal: editando.codigo_postal ?? "",
                es_principal: editando.es_principal,
              }}
              isPending={actualizar.isPending}
              onCancelar={() => { setModo("idle"); setEditando(null); }}
              onGuardar={(payload) =>
                actualizar.mutate(
                  { id: editando.id, data: payload },
                  { onSuccess: () => { setModo("idle"); setEditando(null); } },
                )
              }
            />
          );
        })()}

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : !direcciones?.length ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
            <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700">Sin direcciones guardadas</h2>
            <p className="text-gray-500 mt-2 text-sm">Agregá una para poder recibir tus pedidos a domicilio.</p>
            <button onClick={() => setModo("nueva")}
              className="mt-4 bg-green-main text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-dark transition-colors">
              + Agregar dirección
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {direcciones.map((dir) => (
              <div key={dir.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                  dir.es_principal ? "border-green-200" : "border-gray-100"
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${dir.es_principal ? "bg-green-50 text-green-main" : "bg-gray-50 text-gray-400"}`}>
                      <MapPin size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{dir.alias || "Dirección"}</h3>
                        {dir.es_principal && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-dark">
                            <Star size={9} fill="currentColor" /> Principal
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm mt-0.5">{dir.linea1}</p>
                      {dir.linea2 && <p className="text-gray-500 text-sm">{dir.linea2}</p>}
                      <p className="text-gray-400 text-xs mt-0.5">
                        {dir.ciudad}{dir.provincia ? `, ${dir.provincia}` : ""}
                        {dir.codigo_postal ? ` — CP ${dir.codigo_postal}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!dir.es_principal && (
                      <button
                        onClick={() => marcarPrincipal.mutate(dir.id)}
                        disabled={marcarPrincipal.isPending}
                        title="Marcar como principal"
                        className="p-2 text-gray-400 hover:text-green-main hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Star size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => abrirEditar(dir)}
                      title="Editar"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleEliminar(dir.id)}
                      disabled={eliminar.isPending}
                      title="Eliminar"
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div> 

      {/* Modal confirmación eliminar */}
      {confirmarEliminarId && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setConfirmarEliminarId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Eliminar dirección</h3>
                  <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setConfirmarEliminarId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    eliminar.mutate(confirmarEliminarId);
                    setConfirmarEliminarId(null);
                  }}
                  disabled={eliminar.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {eliminar.isPending ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
