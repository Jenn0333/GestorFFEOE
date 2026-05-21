import { useState, useEffect } from "react";

const API = "https://gestorffeoe-production.up.railway.app";

// Obtiene el token guardado al hacer login
const getToken = () => localStorage.getItem("token");

// Helper para llamadas autenticadas al backend
const apiFetch = (path, options = {}) =>
  fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });

// ── Colores del proyecto (mismo verde que el Login) ──────────────────────────
const C = {
  green: "#1D9E75",
  greenDark: "#085041",
  greenLight: "#E1F5EE",
  greenMid: "#9FE1CB",
  amber: "#BA7517",
  amberLight: "#FAEEDA",
  red: "#A32D2D",
  redLight: "#FCEBEB",
  gray: "#f4f4f2",
  border: "#e4e4e0",
  text: "#1a1a1a",
  muted: "#888780",
};

// ── Componente badge de estado ────────────────────────────────────────────────
function EstadoBadge({ estado }) {
  const config = {
    Pendiente: {
      bg: C.amberLight,
      color: C.amber,
      dot: "#EF9F27",
      label: "Pendiente",
    },
    Asignado: {
      bg: C.greenLight,
      color: C.greenDark,
      dot: C.green,
      label: "Asignado",
    },
    default: { bg: "#F1EFE8", color: "#5F5E5A", dot: "#B4B2A9", label: estado },
  };
  const s = config[estado] || config.default;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        backgroundColor: s.bg,
        color: s.color,
        borderRadius: "20px",
        padding: "4px 12px",
        fontSize: "0.82rem",
        fontWeight: "600",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          backgroundColor: s.dot,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

// ── Tarjeta de sección ────────────────────────────────────────────────────────
function Card({ title, children, style }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        border: `1px solid ${C.border}`,
        padding: "1.5rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: "0.95rem",
            fontWeight: "700",
            color: C.text,
            marginBottom: "1.2rem",
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function AlumnoDashboard() {
  const [alumno, setAlumno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Formulario de contacto
  const [contacto, setContacto] = useState({
    telefono: "",
    direccion: "",
    linkedin: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [mensajeContacto, setMensajeContacto] = useState("");

  // CV
  const [cvFile, setCvFile] = useState(null);
  const [subiendoCV, setSubiendoCV] = useState(false);
  const [mensajeCV, setMensajeCV] = useState("");

  // Carga inicial de datos del alumno
  useEffect(() => {
    apiFetch("/alumnos/me")
      .then((r) => r.json())
      .then((data) => {
        setAlumno(data);
        setContacto({
          telefono: data.telefono || "",
          direccion: data.direccion || "",
          linkedin: data.linkedin || "",
        });
      })
      .catch(() =>
        setError("No se pudieron cargar tus datos. Comprueba tu sesión."),
      )
      .finally(() => setLoading(false));
  }, []);

  // Guardar datos de contacto
  const handleGuardarContacto = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensajeContacto("");
    try {
      const r = await apiFetch("/alumnos/me/contacto", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contacto),
      });
      if (r.ok) setMensajeContacto("¡Datos actualizados correctamente!");
      else setMensajeContacto("Error al guardar. Inténtalo de nuevo.");
    } catch {
      setMensajeContacto("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  // Subir CV
  const handleSubirCV = async () => {
    if (!cvFile) return;
    if (cvFile.type !== "application/pdf") {
      setMensajeCV("Solo se aceptan archivos PDF.");
      return;
    }
    setSubiendoCV(true);
    setMensajeCV("");
    const formData = new FormData();
    formData.append("cv", cvFile);
    try {
      const r = await apiFetch("/alumnos/me/cv", {
        method: "POST",
        body: formData,
      });
      if (r.ok) {
        const data = await r.json();
        setAlumno((prev) => ({ ...prev, cv_url: data.cv_url }));
        setMensajeCV("¡CV subido correctamente!");
        setCvFile(null);
      } else {
        setMensajeCV("Error al subir el CV.");
      }
    } catch {
      setMensajeCV("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoCV(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  // ── Estados de carga y error ────────────────────────────────────────────────
  if (loading)
    return (
      <div style={styles.centered}>
        <div style={styles.spinner} />
        <p style={{ color: C.muted, marginTop: "1rem", fontSize: "0.9rem" }}>
          Cargando tu perfil...
        </p>
      </div>
    );

  if (error)
    return (
      <div style={styles.centered}>
        <div
          style={{
            backgroundColor: C.redLight,
            color: C.red,
            padding: "1rem 1.5rem",
            borderRadius: "12px",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
        <button
          onClick={handleLogout}
          style={{ ...styles.btnSecundario, marginTop: "1rem" }}
        >
          Volver al login
        </button>
      </div>
    );

  const iniciales = alumno
    ? `${alumno.nombre?.[0] || ""}${alumno.apellidos?.[0] || ""}`.toUpperCase()
    : "?";

  // ── Render principal ────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Navbar */}
      <header style={styles.navbar}>
        <div style={styles.navLogo}>
          <div style={styles.navLogoMark}>G</div>
          <span style={{ fontWeight: "700", fontSize: "1rem", color: "#fff" }}>
            GestorFFEOE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={styles.avatar}>{iniciales}</div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main style={styles.main}>
        {/* Cabecera */}
        <div style={styles.pageHeader}>
          <div>
            <p style={styles.eyebrow}>Panel del alumno</p>
            <h1 style={styles.pageTitle}>
              Hola, {alumno?.nombre || "alumno/a"} 👋
            </h1>
          </div>
        </div>

        {/* Grid de tarjetas */}
        <div style={styles.grid}>
          {/* 1. Estado de asignación */}
          <Card title="Estado de prácticas" style={{ gridColumn: "span 2" }}>
            <div style={styles.estadoRow}>
              <div>
                <p style={styles.estadoLabel}>Estado actual</p>
                <div style={{ marginTop: "6px" }}>
                  <EstadoBadge
                    estado={alumno?.estado_asignacion || "Pendiente"}
                  />
                </div>
              </div>

              {alumno?.empresa && (
                <div style={styles.empresaInfo}>
                  <p style={styles.estadoLabel}>Empresa asignada</p>
                  <p
                    style={{
                      fontWeight: "700",
                      fontSize: "1rem",
                      color: C.text,
                      marginTop: "4px",
                    }}
                  >
                    {alumno.empresa.nombre}
                  </p>
                  <p style={{ color: C.muted, fontSize: "0.82rem" }}>
                    {alumno.empresa.direccion}
                  </p>
                </div>
              )}

              {alumno?.tutor_laboral && (
                <div style={styles.empresaInfo}>
                  <p style={styles.estadoLabel}>Tutor laboral</p>
                  <p
                    style={{
                      fontWeight: "700",
                      fontSize: "1rem",
                      color: C.text,
                      marginTop: "4px",
                    }}
                  >
                    {alumno.tutor_laboral.nombre}
                  </p>
                  <p style={{ color: C.muted, fontSize: "0.82rem" }}>
                    {alumno.tutor_laboral.telefono}
                  </p>
                </div>
              )}

              {!alumno?.empresa && (
                <div
                  style={{
                    backgroundColor: C.amberLight,
                    borderRadius: "12px",
                    padding: "1rem 1.2rem",
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      color: C.amber,
                      fontSize: "0.85rem",
                      fontWeight: "500",
                    }}
                  >
                    Aún no tienes empresa asignada. Tu profesor/a te avisará
                    cuando haya novedades.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* 2. CV */}
          <Card title="Mi currículum (CV)">
            {alumno?.cv_url ? (
              <div style={{ marginBottom: "1rem" }}>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: C.muted,
                    marginBottom: "8px",
                  }}
                >
                  CV actual:
                </p>
                <a
                  href={`${API}${alumno.cv_url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.cvLink}
                >
                  📄 Ver CV subido
                </a>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: C.gray,
                  borderRadius: "10px",
                  padding: "1rem",
                  marginBottom: "1rem",
                  textAlign: "center",
                }}
              >
                <p style={{ color: C.muted, fontSize: "0.85rem" }}>
                  No has subido ningún CV todavía.
                </p>
              </div>
            )}

            {/* Zona de subida */}
            <label style={styles.dropzone}>
              <input
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  setCvFile(e.target.files[0]);
                  setMensajeCV("");
                }}
              />
              <span style={{ fontSize: "1.5rem" }}>📎</span>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: C.muted,
                  marginTop: "4px",
                }}
              >
                {cvFile ? cvFile.name : "Haz clic para seleccionar un PDF"}
              </span>
            </label>

            {cvFile && (
              <button
                onClick={handleSubirCV}
                disabled={subiendoCV}
                style={{
                  ...styles.btnPrimario,
                  marginTop: "0.8rem",
                  width: "100%",
                }}
              >
                {subiendoCV ? "Subiendo..." : "Subir CV"}
              </button>
            )}

            {mensajeCV && (
              <p
                style={{
                  fontSize: "0.82rem",
                  marginTop: "0.6rem",
                  color: mensajeCV.includes("!") ? C.green : C.red,
                }}
              >
                {mensajeCV}
              </p>
            )}
          </Card>

          {/* 3. Datos de contacto */}
          <Card title="Mis datos de contacto">
            <form
              onSubmit={handleGuardarContacto}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              {[
                {
                  key: "telefono",
                  label: "Teléfono",
                  placeholder: "600 000 000",
                  type: "tel",
                },
                {
                  key: "direccion",
                  label: "Dirección",
                  placeholder: "Calle, número, ciudad",
                  type: "text",
                },
                {
                  key: "linkedin",
                  label: "LinkedIn (URL)",
                  placeholder: "https://linkedin.com/in/...",
                  type: "url",
                },
              ].map(({ key, label, placeholder, type }) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <label style={styles.label}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={contacto[key]}
                    onChange={(e) =>
                      setContacto({ ...contacto, [key]: e.target.value })
                    }
                    style={styles.input}
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={guardando}
                style={{ ...styles.btnPrimario, marginTop: "0.4rem" }}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>

              {mensajeContacto && (
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: mensajeContacto.includes("!") ? C.green : C.red,
                  }}
                >
                  {mensajeContacto}
                </p>
              )}
            </form>
          </Card>

          {/* 4. Info del alumno */}
          <Card title="Mi perfil" style={{ gridColumn: "span 2" }}>
            <div style={styles.perfilGrid}>
              {[
                {
                  label: "Nombre completo",
                  value: `${alumno?.nombre || ""} ${alumno?.apellidos || ""}`,
                },
                { label: "Correo electrónico", value: alumno?.email || "—" },
                { label: "Ciclo formativo", value: alumno?.ciclo || "—" },
                {
                  label: "Año académico",
                  value: alumno?.anno_academico || "—",
                },
              ].map(({ label, value }) => (
                <div key={label} style={styles.perfilItem}>
                  <p style={styles.estadoLabel}>{label}</p>
                  <p
                    style={{
                      fontWeight: "600",
                      color: C.text,
                      fontSize: "0.95rem",
                      marginTop: "2px",
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: C.gray,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  navbar: {
    backgroundColor: C.greenDark,
    padding: "0 2rem",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navLogo: { display: "flex", alignItems: "center", gap: "10px" },
  navLogoMark: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: C.green,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    color: "#fff",
    fontSize: "16px",
  },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: C.green,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    color: "#fff",
    fontSize: "13px",
  },
  logoutBtn: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
    borderRadius: "8px",
    padding: "6px 14px",
    fontSize: "0.82rem",
    cursor: "pointer",
    fontWeight: "500",
  },
  main: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" },
  pageHeader: { marginBottom: "1.5rem" },
  eyebrow: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: C.green,
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    marginBottom: "4px",
  },
  pageTitle: {
    fontSize: "1.6rem",
    fontWeight: "700",
    color: C.text,
    letterSpacing: "-0.3px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
  },
  estadoRow: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  estadoLabel: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  empresaInfo: { display: "flex", flexDirection: "column" },
  dropzone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: `2px dashed ${C.border}`,
    borderRadius: "12px",
    padding: "1.2rem",
    cursor: "pointer",
    gap: "6px",
    backgroundColor: C.gray,
  },
  cvLink: {
    display: "inline-block",
    color: C.green,
    fontWeight: "600",
    fontSize: "0.88rem",
    textDecoration: "none",
    backgroundColor: C.greenLight,
    padding: "6px 14px",
    borderRadius: "8px",
  },
  label: { fontSize: "0.78rem", fontWeight: "600", color: "#555" },
  input: {
    padding: "0.6rem 0.85rem",
    border: `1.5px solid ${C.border}`,
    borderRadius: "10px",
    fontSize: "0.9rem",
    backgroundColor: "#fafaf8",
    color: C.text,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  btnPrimario: {
    backgroundColor: C.green,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "0.7rem 1.2rem",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnSecundario: {
    backgroundColor: "#fff",
    color: C.text,
    border: `1.5px solid ${C.border}`,
    borderRadius: "10px",
    padding: "0.6rem 1.2rem",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  perfilGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
  },
  perfilItem: {
    backgroundColor: C.gray,
    borderRadius: "10px",
    padding: "0.8rem 1rem",
  },
  centered: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: `3px solid ${C.greenLight}`,
    borderTopColor: C.green,
    animation: "spin 0.8s linear infinite",
  },
};
