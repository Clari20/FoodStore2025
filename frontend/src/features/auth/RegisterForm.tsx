/** Formulario de registro. */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../api/authApi";

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    celular: "",
    password: "",
    direccion: {
      calle: "",
      altura: "",
      linea2: "",
      ciudad: "",
      provincia: "",
      codigo_postal: "",
    }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.email.trim() || !formData.password.trim() || !formData.direccion.calle.trim() || !formData.direccion.ciudad.trim()) {
      return "Todos los campos obligatorios deben estar completos.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "El formato de email no es válido.";
    }
    const pass = formData.password;
    if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pass)) return "La contraseña debe tener al menos una letra mayúscula.";
    if (!/[a-z]/.test(pass)) return "La contraseña debe tener al menos una letra minúscula.";
    if (!/[0-9]/.test(pass)) return "La contraseña debe tener al menos un número.";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        direccion: {
          alias: "Casa",
          linea1: `${formData.direccion.calle} ${formData.direccion.altura}`.trim(),
          linea2: formData.direccion.linea2 || undefined,
          ciudad: formData.direccion.ciudad,
          provincia: formData.direccion.provincia || undefined,
          codigo_postal: formData.direccion.codigo_postal || undefined,
        },
      };
      await authApi.register(payload);
      navigate("/login", { state: { successMessage: "¡Registro exitoso! Por favor, iniciá sesión." } });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
        const detail = axiosErr.response?.data?.detail;
        setError(detail || `Error del servidor (${axiosErr.response?.status})`);
      } else if (err instanceof Error) {
        setError(`Error de red: ${err.message}`);
      } else {
        setError("Error desconocido al intentar registrarse");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name.startsWith("dir_")) {
      const field = e.target.name.replace("dir_", "");
      setFormData({
        ...formData,
        direccion: { ...formData.direccion, [field]: e.target.value }
      });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-dark via-green-main to-green-light p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 lg:p-8 animate-fade-in flex flex-col md:flex-row gap-8">

        {/* Columna Izquierda: Encabezado e Info */}
        <div className="md:w-1/3 flex flex-col justify-center text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-8">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-main rounded-2xl flex items-center justify-center mx-auto md:mx-0 mb-4 shadow-lg">
            <span className="text-3xl md:text-4xl">📝</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-green-dark">Crear Cuenta</h1>
          <p className="text-gray-500 text-sm mt-2">Completá tus datos para sumarte a la plataforma.</p>

          <div className="hidden md:block mt-auto pt-8">
            <p className="text-sm text-gray-500">
              ¿Ya tenés cuenta?{" "}
              <Link to="/login" className="text-green-main hover:text-green-dark font-bold transition-colors block mt-1">
                Iniciá sesión acá
              </Link>
            </p>
          </div>
        </div>

        {/* Columna Derecha: Formulario */}
        <div className="md:w-2/3 flex flex-col justify-center">
          {error && (
            <div className="bg-danger-light text-danger-dark px-4 py-3 rounded-lg text-sm mb-4 border border-danger/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Datos Personales */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-green-dark uppercase tracking-wider border-b border-gray-100 pb-1">Datos Personales</h3>

                {/*Nombre, Apellido, email y celulars*/}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Juan" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Apellido *</label>
                    <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} placeholder="Pérez" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="juan@ejemplo.com" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Celular</label>
                  <input type="tel" name="celular" value={formData.celular} onChange={handleChange} placeholder="+54 11 1234-5678" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                </div>
                {/* password */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña *</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-green-dark uppercase tracking-wider border-b border-gray-100 pb-1">Dirección de Entrega</h3>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Calle *</label>
                    <input type="text" name="dir_calle" value={formData.direccion.calle} onChange={handleChange} placeholder="Av. Siempre Viva" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Altura *</label>
                    <input type="text" name="dir_altura" value={formData.direccion.altura} onChange={handleChange} placeholder="742" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ciudad *</label>
                    <input type="text" name="dir_ciudad" value={formData.direccion.ciudad} onChange={handleChange} placeholder="Springfield" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Piso, Depto</label>
                    <input type="text" name="dir_linea2" value={formData.direccion.linea2} onChange={handleChange} placeholder="2B" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Provincia</label>
                    <input type="text" name="dir_provincia" value={formData.direccion.provincia} onChange={handleChange} placeholder="Bs As" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">C. Postal</label>
                    <input type="text" name="dir_codigo_postal" value={formData.direccion.codigo_postal} onChange={handleChange} placeholder="1000" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-main outline-none text-sm" />
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={loading} className="w-full bg-green-main hover:bg-green-dark text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg active:scale-[0.98]">
                    {loading ? "Registrando..." : "Crear Cuenta"}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="md:hidden mt-6 text-center">
            <p className="text-sm text-gray-500">
              ¿Ya tenés cuenta?{" "}
              <Link to="/login" className="text-green-main hover:text-green-dark font-medium transition-colors">
                Iniciá sesión acá
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
