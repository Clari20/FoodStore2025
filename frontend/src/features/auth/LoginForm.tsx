/** Formulario de login. */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      
      const state = useAuthStore.getState();
      const roles = state.usuario?.roles || [];

      const hasRole = (role: string) =>
        roles.some((r: any) => r === role || r?.rol_codigo === role);

      if (hasRole("ADMIN")) {
        navigate("/dashboard");
      } else if (hasRole("COCINA_STOCK")) {
        navigate("/cocina");
      } else if (hasRole("CAJERO")) {
        navigate("/pedidos");
      } else {
        navigate("/");
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
        const detail = axiosErr.response?.data?.detail;
        setError(detail || `Error del servidor (${axiosErr.response?.status})`);
      } else if (err instanceof Error) {
        setError(`Error de red: ${err.message}`);
      } else {
        setError("Error desconocido al intentar iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-dark via-green-main to-green-light p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-main rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">🍔</span>
          </div>
          <h1 className="text-2xl font-bold text-green-dark">Food Store</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa a tu cuenta</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger-light text-danger-dark px-4 py-3 rounded-lg text-sm mb-4 border border-danger/20">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@foodstore.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-main hover:bg-green-dark text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            ¿No tenés cuenta?{" "}
            <Link to="/register" className="text-green-main hover:text-green-dark font-medium transition-colors">
              Registrate acá
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
