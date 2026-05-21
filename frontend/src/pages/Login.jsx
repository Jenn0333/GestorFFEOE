import { useState } from "react";

const API = "https://gestorffeoe-production.up.railway.app";

const roles = [
  { id: "admin", label: "Administrador" },
  { id: "profesor", label: "Profesor" },
  { id: "alumno", label: "Alumno" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("alumno");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, rellena todos los campos.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        // CORRECCIÓN 2: Validamos que el error sea un texto
        // Si es el error 422, FastAPI manda un array en 'detail',
        // por eso mejor ponemos un mensaje genérico o extraemos el texto.
        const errorMsg =
          typeof data.detail === "string"
            ? data.detail
            : "Error en los datos enviados o credenciales incorrectas.";

        setError(errorMsg);
        return;
      }

      const tokenPayload = JSON.parse(atob(data.access_token.split(".")[1]));
      const rolReal = tokenPayload.rol;

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", rolReal);

      const routes = {
        admin: "/admin",
        profesor: "/profesor",
        alumno: "/alumno",
      };
      window.location.href = routes[rolReal];
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Panel izquierdo — decorativo */}
      <div style={styles.panel}>
        <div style={styles.panelInner}>
          <div style={styles.logoMark}>G</div>
          <h1 style={styles.panelTitle}>GestorFFEOE</h1>
          <p style={styles.panelSub}>
            Plataforma de gestión de prácticas en empresa para el instituto.
          </p>
          <div style={styles.tagList}>
            {["Alumnos", "Empresas", "Asignaciones", "Seguimiento"].map((t) => (
              <span key={t} style={styles.tag}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={styles.formSide}>
        <div style={styles.card}>
          <p style={styles.welcomeEyebrow}>Bienvenido/a</p>
          <h2 style={styles.formTitle}>Inicia sesión</h2>

          {/* Selector de rol */}
          <div style={styles.roleRow}>
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                style={{
                  ...styles.roleBtn,
                  ...(role === r.id ? styles.roleBtnActive : {}),
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Email */}
            <div style={styles.field}>
              <label style={styles.label} htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@instituto.es"
                style={styles.input}
              />
            </div>

            {/* Contraseña */}
            <div style={styles.field}>
              <label style={styles.label} htmlFor="password">
                Contraseña
              </label>
              <div style={styles.inputWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...styles.input, paddingRight: "2.8rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox} role="alert">
                {error}
              </div>
            )}

            {/* Botón submit */}
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p style={styles.footer}>
            ¿Problemas para acceder? Contacta con tu coordinador/a.
          </p>
        </div>
      </div>
    </div>
  );
}

const ACCENT = "#1D9E75";
const ACCENT_DARK = "#0F6E56";
const PANEL_BG = "#085041";

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    backgroundColor: "#f4f4f2",
  },

  // Panel izquierdo
  panel: {
    width: "42%",
    backgroundColor: PANEL_BG,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    position: "relative",
    overflow: "hidden",
  },
  panelInner: {
    position: "relative",
    zIndex: 1,
  },
  logoMark: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    backgroundColor: ACCENT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "1.5rem",
    letterSpacing: "-1px",
  },
  panelTitle: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#fff",
    margin: "0 0 1rem",
    letterSpacing: "-0.5px",
  },
  panelSub: {
    fontSize: "1rem",
    color: "#9FE1CB",
    lineHeight: "1.6",
    maxWidth: "280px",
    margin: "0 0 2rem",
  },
  tagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#E1F5EE",
    borderRadius: "20px",
    padding: "4px 14px",
    fontSize: "0.8rem",
    border: "1px solid rgba(255,255,255,0.15)",
  },

  // Panel derecho
  formSide: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
  },
  welcomeEyebrow: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    margin: "0 0 0.4rem",
  },
  formTitle: {
    fontSize: "1.6rem",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: "0 0 1.5rem",
    letterSpacing: "-0.3px",
  },

  // Selector de rol
  roleRow: {
    display: "flex",
    backgroundColor: "#f0f0ed",
    borderRadius: "10px",
    padding: "4px",
    marginBottom: "1.5rem",
    gap: "4px",
  },
  // 1. En styles.roleBtn cambia 'background' por 'backgroundColor'
  roleBtn: {
    flex: 1,
    border: "none",
    backgroundColor: "transparent", // <--- Cambia esto
    borderRadius: "8px",
    padding: "8px 4px",
    fontSize: "0.82rem",
    fontWeight: "500",
    color: "#666",
    cursor: "pointer",
    transition: "all 0.18s ease",
  },

  // 2. En styles.roleBtnActive ya tienes 'backgroundColor', así que déjalo así
  roleBtnActive: {
    backgroundColor: "#fff",
    color: ACCENT_DARK,
    fontWeight: "600",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },

  // Formulario
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.82rem",
    fontWeight: "600",
    color: "#444",
  },
  input: {
    width: "100%",
    padding: "0.65rem 0.9rem",
    fontSize: "0.95rem",
    border: "1.5px solid #e0e0dc",
    borderRadius: "10px",
    outline: "none",
    backgroundColor: "#fafaf8",
    color: "#1a1a1a",
    boxSizing: "border-box",
    transition: "border-color 0.18s",
  },
  inputWrapper: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0",
    lineHeight: "1",
  },
  errorBox: {
    backgroundColor: "#FCEBEB",
    color: "#A32D2D",
    border: "1px solid #F7C1C1",
    borderRadius: "10px",
    padding: "0.7rem 1rem",
    fontSize: "0.85rem",
  },
  submitBtn: {
    backgroundColor: ACCENT,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "0.8rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "0.5rem",
    transition: "background 0.18s",
  },
  footer: {
    marginTop: "1.5rem",
    textAlign: "center",
    fontSize: "0.8rem",
    color: "#999",
  },
};
