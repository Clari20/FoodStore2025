/** Página de administración de usuarios — solo ADMIN. */
import { useState, useEffect } from "react";
import { Search, Shield, RotateCcw, UserX, Eye, X, MapPin, ShoppingBag, User, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useActualizarRolesUsuario,
  useEliminarUsuario,
  useRestaurarUsuario,
  useRoles,
  useUsuarios,
} from "../hooks/useUsuarios";
import { usePedido } from "../hooks/usePedidos";
import { usuariosApi } from "../api/usuariosApi";
import type { UsuarioAdmin } from "../types";
import { formatArgentinaDate } from "../utils/dates";

type EstadoFiltro = "activo" | "inactivo" | "todos";

export default function UsuariosPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 10,
    search: "",
    rol: "",
    estado: "activo" as EstadoFiltro,
  });
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"datos" | "direcciones" | "pedidos">("datos");

  const [expandedPedidoId, setExpandedPedidoId] = useState<number | null>(null);
  const { data: expandedPedido, isLoading: expandedPedidoLoading } = usePedido(expandedPedidoId || 0);


  const [searchInput, setSearchInput] = useState("");
  const [usuarioAConfirmar, setUsuarioAConfirmar] = useState<UsuarioAdmin | null>(null);

  const { data, isLoading } = useUsuarios(filters);
  const { data: roles } = useRoles();

  const actualizarRoles = useActualizarRolesUsuario();
  const eliminarUsuario = useEliminarUsuario();
  const restaurarUsuario = useRestaurarUsuario();

  const handleSearch = () => {
    setFilters((f) => ({
      ...f,
      search: searchInput.trim(),
      page: 1,
    }));
  };

  const handleCambiarRol = async (usuario: UsuarioAdmin, rol: string) => {
    if (!rol) return;

    await actualizarRoles.mutateAsync({
      id: usuario.id,
      data: {
        roles: [rol],
      },
    });
  };

  const handleDesactivar = (usuario: UsuarioAdmin) => {
    setUsuarioAConfirmar(usuario);
  };

  const handleRestaurar = async (usuario: UsuarioAdmin) => {
    await restaurarUsuario.mutateAsync(usuario.id);
  };

  useEffect(() => {
    setExpandedPedidoId(null);
    if (!detailUserId) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    setDetailTab("datos");
    usuariosApi.getDetalle(detailUserId)
      .then(setDetailData)
      .catch(() => setDetailData(null))
      .finally(() => setDetailLoading(false));
  }, [detailUserId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-dark">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administrá usuarios, estados y roles del sistema.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar por nombre, apellido o email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none"
            />
          </div>

          <select
            value={filters.rol}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                rol: e.target.value,
                page: 1,
              }))
            }
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
          >
            <option value="">Todos los roles</option>
            {roles?.map((r) => (
              <option key={r.codigo} value={r.codigo}>
                {r.codigo}
              </option>
            ))}
          </select>

          <select
            value={filters.estado}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                estado: e.target.value as EstadoFiltro,
                page: 1,
              }))
            }
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-main outline-none bg-white"
          >
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-main border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data?.items.length ? (
          <div className="text-center py-16 text-gray-500">
            No hay usuarios con esos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    Celular
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Detalle</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {data.items.map((u) => {
                  const inactivo = !!u.deleted_at;
                  const userRoles = u.roles ?? [];
                  const rolPrincipal = userRoles[0] || "";

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        inactivo ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-gray-500">
                        #{u.id}
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-900">
                        {u.nombre} {u.apellido}
                      </td>

                      <td className="px-4 py-3 text-gray-600">{u.email}</td>

                      <td className="px-4 py-3 text-gray-500">
                        {u.celular || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {userRoles.map((rol) => (
                            <span
                              key={rol}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-50 text-green-dark"
                            >
                              <Shield size={11} />
                              {rol}
                            </span>
                          ))}
                        </div>

                        {!inactivo && (
                          <select
                            value={rolPrincipal}
                            onChange={(e) => handleCambiarRol(u, e.target.value)}
                            disabled={actualizarRoles.isPending}
                            className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-green-main outline-none"
                          >
                            <option value="">Asignar rol...</option>
                            {roles?.map((r) => (
                              <option key={r.codigo} value={r.codigo}>
                                {r.codigo}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {inactivo ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700">
                            Inactivo
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-50 text-green-dark">
                            Activo
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailUserId(u.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <Eye size={14} /> Ver
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inactivo ? (
                          <button
                            onClick={() => handleRestaurar(u)}
                            disabled={restaurarUsuario.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-dark hover:bg-green-100 disabled:opacity-50"
                          >
                            <RotateCcw size={13} />
                            Restaurar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDesactivar(u)}
                            disabled={eliminarUsuario.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            <UserX size={13} />
                            Desactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailUserId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Detalle de Usuario</h2>
              <button onClick={() => setDetailUserId(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-green-main border-t-transparent rounded-full animate-spin" />
              </div>
            ) : detailData ? (
              <>
                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                  {(["datos", "direcciones", "pedidos"] as const).map((tab) => {
                    const icons = { datos: <User size={14} />, direcciones: <MapPin size={14} />, pedidos: <ShoppingBag size={14} /> };
                    const labels = { datos: "Datos", direcciones: `Direcciones (${detailData.direcciones?.length || 0})`, pedidos: `Pedidos (${detailData.pedidos?.length || 0})` };
                    return (
                      <button key={tab} onClick={() => { setDetailTab(tab); setExpandedPedidoId(null); }}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          detailTab === tab ? "border-green-main text-green-dark" : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >{icons[tab]} {labels[tab]}</button>
                    );
                  })}
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                  {detailTab === "datos" && (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div><span className="text-gray-500 block text-xs">ID</span><span className="font-medium">#{detailData.usuario.id}</span></div>
                        <div><span className="text-gray-500 block text-xs">Estado</span><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${detailData.usuario.deleted_at ? "bg-red-100 text-red-700" : "bg-green-50 text-green-700"}`}>{detailData.usuario.deleted_at ? "Inactivo" : "Activo"}</span></div>
                        <div><span className="text-gray-500 block text-xs">Nombre</span><span className="font-medium">{detailData.usuario.nombre} {detailData.usuario.apellido}</span></div>
                        <div><span className="text-gray-500 block text-xs">Email</span><span className="font-medium">{detailData.usuario.email}</span></div>
                        <div><span className="text-gray-500 block text-xs">Celular</span><span className="font-medium">{detailData.usuario.celular || "—"}</span></div>
                        <div><span className="text-gray-500 block text-xs">Roles</span><div className="flex flex-wrap gap-1 mt-0.5">{detailData.usuario.roles?.map((r: string) => (<span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-50 text-green-dark"><Shield size={10} />{r}</span>))}</div></div>
                        <div><span className="text-gray-500 block text-xs">Fecha de registro</span><span className="font-medium">{formatArgentinaDate(detailData.usuario.created_at)}</span></div>
                      </div>
                    </div>
                  )}

                  {detailTab === "direcciones" && (
                    <div className="space-y-3">
                      {!detailData.direcciones?.length ? (
                        <p className="text-gray-500 text-sm text-center py-8">Este usuario no tiene direcciones registradas.</p>
                      ) : detailData.direcciones.map((d: any) => (
                        <div key={d.id} className="border border-gray-100 rounded-xl p-4 text-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin size={14} className="text-green-main" />
                            <span className="font-semibold">{d.alias || "Sin alias"}</span>
                            {d.es_principal && <span className="text-[10px] bg-green-50 text-green-dark px-2 py-0.5 rounded-full font-bold">PRINCIPAL</span>}
                          </div>
                          <p className="text-gray-700">{d.linea1}</p>
                          {d.linea2 && <p className="text-gray-500">{d.linea2}</p>}
                          <p className="text-gray-500">{d.ciudad}{d.provincia ? `, ${d.provincia}` : ""}{d.codigo_postal ? ` - CP ${d.codigo_postal}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailTab === "pedidos" && (
                    <div className="space-y-3">
                      {!detailData.pedidos?.length ? (
                        <p className="text-gray-500 text-sm text-center py-8">Este usuario no tiene pedidos.</p>
                      ) : detailData.pedidos.map((p: any) => {
                        const isExpanded = expandedPedidoId === p.id;
                        return (
                          <div key={p.id} className="border border-gray-100 rounded-xl p-4 text-sm flex flex-col transition-all duration-200">
                            <div 
                              onClick={() => setExpandedPedidoId(isExpanded ? null : p.id)}
                              className="flex items-center justify-between cursor-pointer hover:opacity-80 select-none"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">Pedido #{p.id}</span>
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    p.estado_codigo === "ENTREGADO" ? "bg-green-50 text-green-700" :
                                    p.estado_codigo === "CANCELADO" ? "bg-red-100 text-red-700" :
                                    "bg-yellow-50 text-yellow-700"
                                  }`}>{p.estado_codigo}</span>
                                </div>
                                <p className="text-gray-500 mt-1">{formatArgentinaDate(p.created_at)} · {p.forma_pago_codigo}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-green-dark text-base">${Number(p.total).toFixed(2)}</span>
                                <div className="text-gray-400">
                                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-gray-100 pt-4 mt-3 space-y-3 animate-in fade-in duration-200">
                                {expandedPedidoLoading ? (
                                  <div className="flex items-center justify-center py-6">
                                    <div className="w-5 h-5 border-2 border-green-main border-t-transparent rounded-full animate-spin" />
                                  </div>
                                ) : expandedPedido ? (
                                  <div className="space-y-4">
                                    {/* Lista de productos */}
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                      <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Productos</h4>
                                      <div className="divide-y divide-gray-100 text-xs">
                                        {expandedPedido.detalles?.map((item: any, idx: number) => (
                                          <div key={idx} className="py-2.5 flex justify-between items-start">
                                            <div className="flex flex-col">
                                              <span className="font-semibold text-gray-800 capitalize">{item.nombre_snapshot}</span>
                                              {item.personalizacion && item.personalizacion.length > 0 && (
                                                <span className="text-[10px] text-red-500 font-semibold mt-0.5">
                                                  Personalizado (Ingredientes removidos)
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <span className="text-gray-500">x{item.cantidad}</span>
                                              <span className="font-semibold text-gray-700 w-16 text-right">${Number(item.subtotal_snap).toFixed(2)}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Información adicional */}
                                    <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                                      <div>
                                        <span className="block text-gray-400 font-medium">Forma de Pago</span>
                                        <span className="font-semibold text-gray-700 mt-0.5 block">
                                          {expandedPedido.forma_pago?.descripcion || expandedPedido.forma_pago_codigo}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="block text-gray-400 font-medium">Método de Entrega</span>
                                        <span className="font-semibold text-gray-700 mt-0.5 block">
                                          {expandedPedido.direccion_id ? "Envío a Domicilio" : "Retiro en Local"}
                                        </span>
                                      </div>
                                      {expandedPedido.notas && (
                                        <div className="col-span-2 border-t border-gray-100 pt-2 mt-1">
                                          <span className="block text-gray-400 font-medium">Notas del pedido</span>
                                          <span className="italic text-gray-600 mt-0.5 block bg-white p-2 rounded border border-gray-100">
                                            "{expandedPedido.notas}"
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Totales y Link */}
                                    <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5 text-xs text-gray-600 px-1">
                                      <div className="flex justify-between items-end">
                                        <div className="flex-1 space-y-1.5 pr-4">
                                          <div className="flex justify-between">
                                            <span>Subtotal:</span>
                                            <span className="font-medium text-gray-700">${Number(expandedPedido.subtotal).toFixed(2)}</span>
                                          </div>
                                          {Number(expandedPedido.costo_envio) > 0 && (
                                            <div className="flex justify-between">
                                              <span>Costo de Envío:</span>
                                              <span className="font-medium text-gray-700">${Number(expandedPedido.costo_envio).toFixed(2)}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 text-sm mt-1">
                                            <span className="text-gray-800">Total:</span>
                                            <span className="text-green-main text-base">${Number(expandedPedido.total).toFixed(2)}</span>
                                          </div>
                                        </div>
                                        
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDetailUserId(null);
                                            navigate(`/gestion/pedidos/${p.id}`);
                                          }}
                                          className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-dark bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors"
                                        >
                                          Gestionar pedido <ExternalLink size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-red-500 text-center py-2">Error al cargar detalles del pedido.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">Error al cargar datos.</div>
            )}
          </div>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            disabled={filters.page === 1}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                page: f.page - 1,
              }))
            }
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Anterior
          </button>

          <span className="px-4 py-2 text-sm text-gray-600">
            {data.page} / {data.pages}
          </span>

          <button
            disabled={filters.page === data.pages}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                page: f.page + 1,
              }))
            }
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {usuarioAConfirmar && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setUsuarioAConfirmar(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Desactivar usuario</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                ¿Desactivar el usuario <span className="font-semibold text-gray-700">{usuarioAConfirmar.email}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setUsuarioAConfirmar(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await eliminarUsuario.mutateAsync(usuarioAConfirmar.id);
                    setUsuarioAConfirmar(null);
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