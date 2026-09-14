import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Package, MapPin, LayoutDashboard, ChevronDown, Home } from 'lucide-react';

interface NavbarUserMenuProps {
  usuario: any;
  isAdmin: boolean;
  onLogout: () => void;
}

export default function NavbarUserMenu({ usuario, isAdmin, onLogout }: NavbarUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isCliente = !usuario?.roles?.length || usuario.roles.some(
    (r: any) => r === "CLIENTE" || r?.rol_codigo === "CLIENTE" || r === "CLIENT" || r?.rol_codigo === "CLIENT"
  );
  const showCustomerLinks = isCliente || isAdmin;

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Botón Principal (Avatar) */}
      <button 
        className="flex items-center gap-2 py-2 text-gray-700 hover:text-green-main transition-colors focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-main group-hover:bg-green-100 transition-colors shadow-sm">
          <User size={16} />
        </div>
        <span className="text-sm font-medium hidden lg:inline">
          Hola, <span className="font-bold text-green-dark">{usuario?.nombre?.split(" ")[0]}</span>
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 top-full pt-2 z-50">
          <div className="bg-white shadow-xl rounded-xl border border-gray-100 min-w-[220px] overflow-hidden transform origin-top-right transition-all duration-200">
            
            {/* Cabecera del Menú */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">{usuario?.nombre}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{usuario?.email}</p>
            </div>

            {/* Links */}
            <div className="flex flex-col py-2">
              <Link
                to={isCliente ? "/mi-perfil" : "/perfil"}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-main transition-colors group/link"
                onClick={() => setIsOpen(false)}
              >
                <User size={16} className="text-gray-400 group-hover/link:text-green-main transition-colors" />
                Mi Perfil
              </Link>
              {isAdmin && (
                <>
                  <Link
                    to="/"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-main transition-colors group/link"
                    onClick={() => setIsOpen(false)}
                  >
                    <Home size={16} className="text-gray-400 group-hover/link:text-green-main transition-colors" />
                    Vista Usuario
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-main transition-colors group/link"
                    onClick={() => setIsOpen(false)}
                  >
                    <LayoutDashboard size={16} className="text-gray-400 group-hover/link:text-green-main transition-colors" />
                    Panel de Administración
                  </Link>
                </>
              )}
              
              {showCustomerLinks && (
                <>
                  <Link
                    to="/mis-pedidos"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-main transition-colors group/link"
                    onClick={() => setIsOpen(false)}
                  >
                    <Package size={16} className="text-gray-400 group-hover/link:text-green-main transition-colors" />
                    Mis Pedidos
                  </Link>
                  <Link
                    to="/mis-direcciones"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-main transition-colors group/link"
                    onClick={() => setIsOpen(false)}
                  >
                    <MapPin size={16} className="text-gray-400 group-hover/link:text-green-main transition-colors" />
                    Mis Direcciones
                  </Link>
                </>
              )}

              <div className="h-px bg-gray-100 my-1 mx-4" />
              
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left group/link"
              >
                <LogOut size={16} className="text-red-400 group-hover/link:text-red-500 transition-colors" />
                Cerrar sesión
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
