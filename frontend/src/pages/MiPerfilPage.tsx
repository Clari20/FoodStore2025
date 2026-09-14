import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/authApi';
import { toast } from 'sonner';
import { User, Mail, Phone, Loader2, Save, MapPin, Package, Edit2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePedidos } from '../hooks/usePedidos';
import { useDirecciones } from '../hooks/useDirecciones';

export default function MiPerfilPage() {
  const { usuario, setUsuario } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    celular: '',
  });

  const isAdmin = usuario?.roles?.some(
    (r: any) => r === "ADMIN" || r?.rol_codigo === "ADMIN"
  );
  
  const isCliente = !usuario?.roles?.length || usuario?.roles?.some(
    (r: any) => r === "CLIENTE" || r?.rol_codigo === "CLIENTE" || r === "CLIENT" || r?.rol_codigo === "CLIENT"
  );
  
  const showCustomerLinks = isCliente || isAdmin;

  // Cargar datos actuales cuando el componente se monta o si usuario cambia
  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre || '',
        apellido: usuario.apellido || '',
        celular: usuario.celular || '',
      });
    }
  }, [usuario]);

  // Obtener pedidos y direcciones para mostrar el resumen
  const { data: pedidosData, isLoading: isLoadingPedidos } = usePedidos({ page: 1, per_page: 3 });
  const { data: direcciones, isLoading: isLoadingDirecciones } = useDirecciones();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const updatedUser = await authApi.updateMe(formData);
      setUsuario(updatedUser);
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al actualizar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mx-auto space-y-8 ${showCustomerLinks ? 'max-w-5xl' : 'max-w-2xl'}`}>
      
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-500 mt-1">
          Visualizá y actualizá tu información personal{showCustomerLinks ? ', direcciones y pedidos' : ''}.
        </p>
      </div>

      <div className={showCustomerLinks ? "grid grid-cols-1 lg:grid-cols-3 gap-8" : ""}>
        
        {/* Columna Izquierda: Datos Personales */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <User className="text-green-main" size={20} />
                Datos Personales
              </h2>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-bold text-green-main hover:text-green-dark flex items-center gap-1 transition-colors"
                >
                  <Edit2 size={16} />
                  Editar
                </button>
              )}
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-3">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200"
                    />
                  </div>

                  {/* Apellido */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Apellido *</label>
                    <input
                      type="text"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      required
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200"
                    />
                  </div>
                </div>

                {/* Email (Solo Lectura siempre) */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={usuario?.email || ''}
                      disabled
                      className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200 cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">No puede modificarse.</p>
                </div>

                {/* Celular */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Celular</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="celular"
                      value={formData.celular}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="+54 11 1234-5678"
                      className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200"
                    />
                  </div>
                </div>

                {/* Botones de Guardar / Cancelar */}
                {isEditing && (
                  <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          nombre: usuario?.nombre || '',
                          apellido: usuario?.apellido || '',
                          celular: usuario?.celular || '',
                        });
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-2 bg-green-main hover:bg-green-dark text-white text-sm font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Guardar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Direcciones y Pedidos (Solo si es Cliente o Admin) */}
        {showCustomerLinks && (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Direcciones */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin className="text-green-main" size={20} />
                  Mis Direcciones
                </h2>
                <Link to="/mis-direcciones" className="text-sm font-bold text-green-main hover:underline">
                  Gestionar
                </Link>
              </div>
              
              {isLoadingDirecciones ? (
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ) : direcciones && direcciones.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {direcciones.slice(0, 4).map((dir) => (
                    <div key={dir.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 flex items-start gap-3">
                      <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{dir.alias || "Dirección"}</p>
                        <p className="text-xs text-gray-600 mt-1">{dir.linea1}</p>
                        <p className="text-xs text-gray-500">{dir.ciudad}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  No tenés direcciones guardadas. <Link to="/mis-direcciones" className="text-green-main font-bold">Agregá una</Link>.
                </p>
              )}
            </div>

            {/* Pedidos */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Package className="text-green-main" size={20} />
                  Últimos Pedidos
                </h2>
                <Link to="/mis-pedidos" className="text-sm font-bold text-green-main hover:underline">
                  Ver todos
                </Link>
              </div>
              
              {isLoadingPedidos ? (
                <div className="space-y-3">
                  <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              ) : pedidosData && pedidosData.items.length > 0 ? (
                <div className="space-y-3">
                  {pedidosData.items.map((pedido) => (
                    <Link 
                      key={pedido.id} 
                      to={`/pedidos/${pedido.id}`}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-green-main hover:shadow-sm transition-all group"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900">Pedido #{pedido.id}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(pedido.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">${pedido.total}</p>
                        <p className="text-xs font-semibold text-green-main mt-1 group-hover:underline">
                          Ver detalle
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  Aún no hiciste ningún pedido.
                </p>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
