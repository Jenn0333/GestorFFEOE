const API = import.meta.env.VITE_API_URL;

/**
 * apiFetch — helper centralizado para llamadas al backend.
 *
 * - Añade automáticamente el header Authorization con el JWT
 * - Si el backend devuelve 401 (token expirado o inválido),
 *   limpia el localStorage y redirige al login automáticamente
 * - El resto de errores los lanza para que cada componente los gestione
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  // Token expirado o inválido → limpiar sesión y volver al login
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
    return; // Corta la ejecución, ya redirigimos
  }

  return response;
}
