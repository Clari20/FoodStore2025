/** Página carrito — wrapper fino sobre CarritoItems + resumen de pago. */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import CarritoGrid from "../features/pedidos/CarritoGrid";
import { useCartStore } from "../store/cartStore";
import { useCrearPedido, useFormasPago } from "../hooks/usePedidos";
import { useDirecciones, useCrearDireccion } from "../hooks/useDirecciones";
import { useAuthStore } from "../store/authStore";
import type { DireccionCreate } from "../types";

const COSTO_ENVIO = 50;

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clearCart);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const { data: formasPago } = useFormasPago();
  const crearPedido = useCrearPedido();

  const [formaPago, setFormaPago] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"ENVIO" | "RETIRO">("ENVIO");
  const [direccionId, setDireccionId] = useState<number | null>(null);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");
  const [mostrarNuevaDireccion, setMostrarNuevaDireccion] = useState(false);
  const [nuevaDireccionForm, setNuevaDireccionForm] = useState({
    alias: "",
    calle: "",
    altura: "",
    linea2: "",
    ciudad: "",
    provincia: "",
    codigo_postal: "",
    es_principal: false,
  });

  const { data: direcciones, isLoading: loadingDirecciones } = useDirecciones();
  const crearDireccion = useCrearDireccion();

  // Seleccionar la principal por defecto
  useEffect(() => {
    if (direcciones && direcciones.length > 0 && direccionId === null) {
      const principal = direcciones.find((d) => d.es_principal);
      setDireccionId(principal ? principal.id : direcciones[0].id);
    }
  }, [direcciones, direccionId]);

  const costoEnvio = tipoEntrega === "RETIRO" ? 0 : COSTO_ENVIO;

  const handleConfirmar = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!formaPago) {
      setError("Seleccioná una forma de pago.");
      return;
    }
    if (tipoEntrega === "ENVIO" && !direccionId) {
      setError("Tenés que elegir una dirección de entrega.");
      return;
    }
    setError("");

    crearPedido.mutate(
      {
        items: items.map((i) => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
          personalizacion: i.personalizacion || [],
        })),
        forma_pago_codigo: formaPago,
        direccion_id: tipoEntrega === "RETIRO" ? null : direccionId,
        notas: notas || undefined,
      },
      {
        onSuccess: (pedidoCreado) => {
          clearCart();
          if (formaPago === "MERCADOPAGO") {
            navigate(`/pedidos/${pedidoCreado.id}`);
          } else {
            navigate("/mis-pedidos");
          }
        },
        onError: (err: any) => {
          const detail = err.response?.data?.detail;
          if (typeof detail === "string") {
            setError(detail);
          } else if (Array.isArray(detail)) {
            setError(detail.map((d: any) => d.msg).join(", "));
          } else if (detail && typeof detail === "object") {
            setError(JSON.stringify(detail));
          } else {
            setError("Error al crear el pedido.");
          }
        },
      },
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShoppingBag size={64} className="text-gray-300" />
        <h2 className="text-2xl font-bold text-gray-700">
          Tu carrito está vacío
        </h2>
        <p className="text-gray-500">Agregá productos desde la tienda.</p>
        <Link
          to="/"
          className="bg-green-main text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-dark transition-colors"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Tu Carrito</h1>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          {/* Feature component — lista de ítems con controles */}
          <div className="lg:col-span-4">
            <CarritoGrid />
          </div>

          {/* Resumen y pago */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen</h2>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${total.toLocaleString("es-AR")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Costo de envío</span>
                  <span>${costoEnvio}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>${(total + costoEnvio).toLocaleString("es-AR")}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de pago
                </label>
                <select
                  value={formaPago}
                  onChange={(e) => {
                    const newFormaPago = e.target.value;
                    setFormaPago(newFormaPago);
                    if (newFormaPago === "EFECTIVO") {
                      setTipoEntrega("RETIRO");
                    }
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main"
                >
                  <option value="">Seleccioná...</option>
                  {formasPago
                    ?.filter((f) => f.habilitado)
                    .map((f) => (
                      <option key={f.codigo} value={f.codigo}>
                        {f.descripcion}
                      </option>
                    ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de entrega
                </label>
                <select
                  value={tipoEntrega}
                  onChange={(e) => setTipoEntrega(e.target.value as "ENVIO" | "RETIRO")}
                  disabled={formaPago === "EFECTIVO"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="ENVIO">Envío a domicilio</option>
                  <option value="RETIRO">Retiro en el local</option>
                </select>
              </div>

              {tipoEntrega === "ENVIO" && isAuthenticated && (
                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Dirección de Entrega
                    </label>
                    <button
                      onClick={() =>
                        setMostrarNuevaDireccion(!mostrarNuevaDireccion)
                      }
                      className="text-xs text-green-main hover:text-green-dark font-medium"
                    >
                      {mostrarNuevaDireccion ? "Cancelar" : "+ Nueva"}
                    </button>
                  </div>

                  {mostrarNuevaDireccion ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alias (Ej: Casa, Trabajo)
                        </label>
                        <input
                          type="text"
                          placeholder="Casa, Trabajo, etc."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main"
                          value={nuevaDireccionForm.alias}
                          onChange={(e) =>
                            setNuevaDireccionForm({
                              ...nuevaDireccionForm,
                              alias: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Calle *
                          </label>
                          <input
                            type="text"
                            placeholder="Av. Siempre Viva"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main"
                            value={nuevaDireccionForm.calle}
                            onChange={(e) =>
                              setNuevaDireccionForm({
                                ...nuevaDireccionForm,
                                calle: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Altura *
                          </label>
                          <input
                            type="text"
                            placeholder="742"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main"
                            value={nuevaDireccionForm.altura}
                            onChange={(e) =>
                              setNuevaDireccionForm({
                                ...nuevaDireccionForm,
                                altura: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Línea 2 (Piso, Depto, etc.)
                        </label>
                        <input
                          type="text"
                          placeholder="2B, Piso 3, etc. (Opcional)"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main"
                          value={nuevaDireccionForm.linea2}
                          onChange={(e) =>
                            setNuevaDireccionForm({
                              ...nuevaDireccionForm,
                              linea2: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Ciudad *"
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-main"
                          value={nuevaDireccionForm.ciudad}
                          onChange={(e) =>
                            setNuevaDireccionForm({
                              ...nuevaDireccionForm,
                              ciudad: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Provincia"
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-main"
                          value={nuevaDireccionForm.provincia}
                          onChange={(e) =>
                            setNuevaDireccionForm({
                              ...nuevaDireccionForm,
                              provincia: e.target.value,
                            })
                          }
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Código Postal"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-main"
                        value={nuevaDireccionForm.codigo_postal}
                        onChange={(e) =>
                          setNuevaDireccionForm({
                            ...nuevaDireccionForm,
                            codigo_postal: e.target.value,
                          })
                        }
                      />
                      <button
                        disabled={
                          crearDireccion.isPending ||
                          !nuevaDireccionForm.calle ||
                          !nuevaDireccionForm.altura ||
                          !nuevaDireccionForm.ciudad
                        }
                        onClick={() => {
                          const ciudad = nuevaDireccionForm.ciudad.trim();
                          if (!ciudad) return;

                          const payload: DireccionCreate = {
                            alias: nuevaDireccionForm.alias,
                            linea1:
                              `${nuevaDireccionForm.calle} ${nuevaDireccionForm.altura}`.trim(),
                            linea2: nuevaDireccionForm.linea2 || undefined,
                            ciudad,
                            provincia:
                              nuevaDireccionForm.provincia || undefined,
                            codigo_postal:
                              nuevaDireccionForm.codigo_postal || undefined,
                            es_principal: nuevaDireccionForm.es_principal,
                          };
                          crearDireccion.mutate(payload, {
                            onSuccess: () => {
                              setMostrarNuevaDireccion(false);
                              setNuevaDireccionForm({
                                alias: "",
                                calle: "",
                                altura: "",
                                linea2: "",
                                ciudad: "",
                                provincia: "",
                                codigo_postal: "",
                                es_principal: false,
                              });
                            },
                          });
                        }}
                        className="w-full bg-gray-900 text-white text-xs py-2 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        {crearDireccion.isPending
                          ? "Guardando..."
                          : "Guardar Dirección"}
                      </button>
                    </div>
                  ) : (
                    <>
                      {loadingDirecciones ? (
                        <p className="text-xs text-gray-500">
                          Cargando direcciones...
                        </p>
                      ) : direcciones && direcciones.length > 0 ? (
                        <select
                          value={direccionId || ""}
                          onChange={(e) =>
                            setDireccionId(Number(e.target.value))
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-main bg-white"
                        >
                          {direcciones.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.alias ? `${d.alias} - ` : ""}
                              {d.linea1}, {d.ciudad}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-amber-600">
                          No tenés direcciones guardadas. Creá una nueva.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {tipoEntrega === "RETIRO" && (
                <div className="mb-4 bg-green-50 p-3 rounded-lg border border-green-200/50 text-green-800 text-xs font-medium">
                  📍 Te esperamos en nuestro local (Av. Siempreviva 742) para retirar tu pedido.
                </div>
              )}


              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Instrucciones especiales..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-main"
                />
              </div>

              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

              <button
                onClick={handleConfirmar}
                disabled={crearPedido.isPending}
                className="w-full bg-green-main hover:bg-green-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                {crearPedido.isPending
                  ? "Procesando..."
                  : isAuthenticated
                    ? "Confirmar pedido"
                    : "Ingresá para pedir"}
              </button>

              <Link
                to="/"
                className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3 transition-colors"
              >
                ← Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
