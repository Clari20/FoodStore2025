/** App principal — Router + layouts + protección por rol. */
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useUiStore } from "./store/uiStore";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import NavbarUsuario from "./components/NavbarUsuario";
import ScrollToTop from "./components/ScrollToTop";

import { Toaster } from "sonner";

// Admin pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import IngredientesPage from "./pages/IngredientesPage";
import CategoriasPage from "./pages/CategoriasPage";
import ProductosPage from "./pages/ProductosPage";
import PedidosCajeroPage from "./pages/PedidosCajeroPage";
import KdsPage from "./pages/KdsPage";
import UsuariosPage from "./pages/UsuariosPage";
import PedidoOperativoDetallePage from "./pages/PedidoOperativoDetallePage";

// Store pages
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import MisPedidosPage from "./pages/MisPedidosPage";
import MisDireccionesPage from "./pages/MisDireccionesPage";
import PedidoDetallePage from "./pages/PedidoDetallePage";
import StorefrontCatalogoPage from "./pages/StorefrontCatalogoPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import MiPerfilPage from "./pages/MiPerfilPage";


function AppLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);

  const hasRole = useAuthStore((s) => s.hasRole);
  const fallbackPath = hasRole("ADMIN")
    ? "/dashboard"
    : hasRole("COCINA_STOCK")
    ? "/cocina"
    : hasRole("CAJERO")
    ? "/pedidos"
    : "/";

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main id="dashboard-scroll" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingredientes"
              element={
                <ProtectedRoute roles={["ADMIN", "COCINA_STOCK"]}>
                  <IngredientesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categorias"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <CategoriasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/productos"
              element={
                <ProtectedRoute roles={["ADMIN", "COCINA_STOCK"]}>
                  <ProductosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos"
              element={
                <ProtectedRoute roles={["ADMIN", "CAJERO"]}>
                  <PedidosCajeroPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestion/pedidos/:id"
              element={
                <ProtectedRoute roles={["ADMIN", "CAJERO", "COCINA_STOCK"]}>
                  <PedidoOperativoDetallePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cocina"
              element={
                <ProtectedRoute roles={["ADMIN", "COCINA_STOCK"]}>
                  <KdsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute roles={["ADMIN", "CAJERO", "COCINA_STOCK"]}>
                  <MiPerfilPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to={fallbackPath} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const usuario = useAuthStore((s) => s.usuario);

  const hasRole = (role: string) =>
    usuario?.roles?.some((r: any) => r === role || r?.rol_codigo === role);

  const defaultPath = hasRole("ADMIN")
    ? "/dashboard"
    : hasRole("COCINA_STOCK")
    ? "/cocina"
    : hasRole("CAJERO")
    ? "/pedidos"
    : "/";

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  if (isAuthLoading) {
    return <div className="min-h-screen bg-cream" />;
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Auth */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={defaultPath} replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
        />

        {/* Store — layout con Navbar pública */}
        <Route element={<NavbarUsuario />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogo" element={<StorefrontCatalogoPage />} />
          <Route path="/producto/:id" element={<ProductDetailPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route
            path="/mis-pedidos"
            element={
              <ProtectedRoute>
                <MisPedidosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-direcciones"
            element={
              <ProtectedRoute>
                <MisDireccionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pedidos/:id"
            element={
              <ProtectedRoute>
                <PedidoDetallePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id/:status"
            element={
              <ProtectedRoute>
                <PaymentResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mi-perfil"
            element={
              <ProtectedRoute>
                <MiPerfilPage />
              </ProtectedRoute>
            }
          />
        </Route>


        {/* Admin — layout con Sidebar + Navbar admin */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
      </BrowserRouter>
    </>
  );
}
