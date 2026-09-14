import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, ShoppingBag, User, Menu, X, Package, MapPin, LayoutDashboard, LogOut, Home } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { useCartStore } from "../store/cartStore";
import NavbarCategoriesMenu from "./NavbarCategoriesMenu";
import NavbarUserMenu from "./NavbarUserMenu";
import CartSlideOver from "./CartSlideOver";

export default function NavbarUsuario() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);

  const openCart = useUiStore((s) => s.openCart);
  const itemCount = useCartStore((s) => s.itemCount());

  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isAdmin = usuario?.roles?.some(
    (r: any) => r === "ADMIN" || r?.rol_codigo === "ADMIN"
  );
  
  const isCliente = !usuario?.roles?.length || usuario.roles.some(
    (r: any) => r === "CLIENTE" || r?.rol_codigo === "CLIENTE" || r === "CLIENT" || r?.rol_codigo === "CLIENT"
  );
  
  const showCustomerLinks = isCliente || isAdmin;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Navbar Pública */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo y enlaces */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl">🍔</span>
                <span className="text-xl font-bold text-green-dark">Food Store</span>
              </Link>

              <div className="hidden md:flex space-x-6">
                <Link
                  to="/catalogo"
                  className="text-gray-600 hover:text-green-main flex items-center gap-2 font-medium transition-colors"
                >
                  <ShoppingBag size={18} />
                  Productos
                </Link>
                <NavbarCategoriesMenu />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3">
              {/* Acciones de Usuario (Desktop) */}
              <div className="hidden md:flex items-center gap-4">
                {isAuthenticated ? (
                  <NavbarUserMenu 
                    usuario={usuario}
                    isAdmin={isAdmin}
                    onLogout={handleLogout}
                  />
                ) : (
                  <div className="flex items-center gap-3 mr-2">
                    <Link
                      to="/login"
                      className="text-sm font-medium text-gray-600 hover:text-green-main"
                    >
                      Ingresar
                    </Link>
                    <Link
                      to="/register"
                      className="text-sm font-medium bg-green-main text-white px-4 py-2 rounded-lg hover:bg-green-dark transition-colors"
                    >
                      Crear cuenta
                    </Link>
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-gray-200 hidden md:block mx-1" />

              {/* Carrito (Siempre visible) */}
              <button
                onClick={openCart}
                className="relative p-2 text-gray-600 hover:text-green-main transition-colors"
              >
                <ShoppingCart size={24} />
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 bg-yellow-banner text-green-dark text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1 shadow-sm">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </button>

              {/* Botón de Hamburguesa para Mobile */}
              <button
                className="md:hidden p-2 text-gray-600 hover:text-green-main"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Menú Móvil Desplegable (Caja Flotante) */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute right-4 top-16 w-64 bg-white shadow-xl rounded-2xl border border-gray-100 p-5 space-y-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200 origin-top-right">


            {/* Opciones de usuario */}
            <div className="flex flex-col space-y-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 mb-2 p-2 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-main shadow-sm">
                      <User size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      Hola, <span className="font-bold text-green-dark">{usuario?.nombre?.split(" ")[0]}</span>
                    </span>
                  </div>
                  {/* Links de navegación */}
                  <div className="flex flex-col space-y-3 pb-3 border-b border-gray-100">
                    <Link
                      to="/catalogo"
                      className="text-gray-700 font-medium flex items-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <ShoppingBag size={18} className="text-green-main" />
                      Catálogo de Productos
                    </Link>
                    <div className="pl-1">
                      <NavbarCategoriesMenu />
                    </div>
                  </div>
                  {showCustomerLinks && (
                    <>
                      <Link
                        to="/mi-perfil"
                        className="text-gray-600 font-medium py-1 flex items-center gap-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User size={18} className="text-gray-400" />
                        Mi Perfil
                      </Link>
                      <Link
                        to="/mis-pedidos"
                        className="text-gray-600 font-medium py-1 flex items-center gap-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Package size={18} className="text-gray-400" />
                        Mis Pedidos
                      </Link>
                      <Link
                        to="/mis-direcciones"
                        className="text-gray-600 font-medium py-1 flex items-center gap-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <MapPin size={18} className="text-gray-400" />
                        Mis Direcciones
                      </Link>
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <Link
                        to="/"
                        className="text-green-main font-bold py-1 flex items-center gap-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Home size={18} className="text-green-main" />
                        Vista Usuario
                      </Link>
                      <Link
                        to="/dashboard"
                        className="text-green-main font-bold py-1 flex items-center gap-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <LayoutDashboard size={18} className="text-green-main" />
                        Panel de Administración
                      </Link>
                    </>
                  )}

                  <button
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                    className="text-red-500 font-medium text-left pt-2 mt-2 border-t border-gray-100 flex items-center gap-2"
                  >
                    <LogOut size={18} className="text-red-400" />
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 pt-2">
                  <Link
                    to="/login"
                    className="text-center text-green-main font-bold py-2 border border-green-main rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Ingresar
                  </Link>
                  <Link
                    to="/register"
                    className="text-center bg-green-main text-white font-bold py-2 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Crear cuenta
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Panel lateral del carrito */}
      <CartSlideOver />

      {/* Contenido principal */}
      <main className="flex-1 w-full bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Food Store. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
