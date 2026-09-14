/** Navbar superior. */
import { Menu, LogOut } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useNavigate, Link } from "react-router-dom";
import { useUiStore } from "../store/uiStore";
import NavbarUserMenu from "./NavbarUserMenu";

export default function Navbar() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const hasRole = useAuthStore((s) => s.hasRole);
  const isAdmin = hasRole("ADMIN");
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu size={24} className="text-green-dark" />
        </button>
        <h1 className="text-lg font-semibold text-green-dark hidden sm:block">
          Food Store
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <NavbarUserMenu 
          usuario={usuario}
          isAdmin={isAdmin}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
}
