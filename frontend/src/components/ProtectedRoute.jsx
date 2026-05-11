import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute
 * - Si no hay token → redirige al login
 * - Si el rol no coincide → redirige al dashboard correcto
 * - Si todo ok → muestra el componente hijo
 */
export default function ProtectedRoute({ children, rolRequerido }) {
  const token = localStorage.getItem("token");
  const rolActual = localStorage.getItem("role");

  // Sin token → al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Rol incorrecto → redirige a su dashboard
  if (rolRequerido && rolActual !== rolRequerido) {
    const destinos = {
      admin: "/admin",
      profesor: "/profesor",
      alumno: "/alumno",
    };
    return <Navigate to={destinos[rolActual] || "/"} replace />;
  }

  return children;
}
