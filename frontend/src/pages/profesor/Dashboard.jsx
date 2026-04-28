import { useState, useEffect } from "react";

import { apiFetch } from "../../utils/apiFetch";

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

// ── Componentes pequeños ──────────────────────────────────────────────────────

function EstadoBadge({ estado }) {
  const map = {
    Pendiente: { bg: C.amberLight, color: C.amber, dot: "#EF9F27" },
    Asignado: { bg: C.greenLight, color: C.greenDark, dot: C.green },
  };
  const s = map[estado] || { bg: "#F1EFE8", color: "#5F5E5A", dot: "#B4B2A9" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        backgroundColor: s.bg,
        color: s.color,
        borderRadius: "20px",
        padding: "3px 10px",
        fontSize: "0.75rem",
        fontWeight: "600",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: s.dot,
        }}
      />
      {estado}
    </span>
  );
}

function Card({ title, children, style }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        border: `1px solid ${C.border}`,
        padding: "1.4rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: "0.92rem",
            fontWeight: "700",
            color: C.text,
            marginBottom: "1rem",
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function MensajeFeedback({ msg }) {
  if (!msg) return null;
  const ok = msg.startsWith("!"); // convenio: empieza con ! = éxito
  return (
    <p
      style={{
        fontSize: "0.82rem",
        marginTop: "0.5rem",
        color: ok ? C.green : C.red,
      }}
    >
      {ok ? msg.slice(1) : msg}
    </p>
  );
}

// ── Pestaña Alumnos ───────────────────────────────────────────────────────────
function TabAlumnos() {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvMsg, setCsvMsg] = useState("");
  const [subiendoCsv, setSubiendoCsv] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    apiFetch("/profesores/me/alumnos")
      .then((r) => r.json())
      .then(setAlumnos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoCsv(true);
    setCsvMsg("");
    const formData = new FormData();
    formData.append("csv", file);
    try {
      const r = await apiFetch("/profesores/me/alumnos/importar", {
        method: "POST",
        body: formData,
      });
      const data = await r.json();
      if (r.ok) {
        setCsvMsg(`!Se importaron ${data.importados} alumnos correctamente.`);
        // Recargar lista
        apiFetch("/profesores/me/alumnos")
          .then((r) => r.json())
          .then(setAlumnos);
      } else {
        setCsvMsg("Error al importar el CSV. Comprueba el formato.");
      }
    } catch {
      setCsvMsg("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoCsv(false);
    }
  };

  const filtrados = alumnos.filter((a) =>
    `${a.nombre} ${a.apellidos} ${a.email}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Importar CSV */}
      <Card title="Importar alumnos desde CSV">
        <p
          style={{
            fontSize: "0.82rem",
            color: C.muted,
            marginBottom: "0.8rem",
          }}
        >
          El CSV debe tener las columnas:{" "}
          <code>nombre, apellidos, email, ciclo</code>
        </p>
        <label style={styles.dropzone}>
          <input
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleCsv}
            disabled={subiendoCsv}
          />
          <span style={{ fontSize: "1.4rem" }}>📋</span>
          <span style={{ fontSize: "0.82rem", color: C.muted }}>
            {subiendoCsv ? "Importando..." : "Haz clic para seleccionar un CSV"}
          </span>
        </label>
        <MensajeFeedback msg={csvMsg} />
      </Card>

      {/* Lista de alumnos */}
      <Card title={`Alumnos (${alumnos.length})`}>
        <input
          placeholder="Buscar por nombre o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ ...styles.input, marginBottom: "1rem" }}
        />
        {loading ? (
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>Cargando...</p>
        ) : filtrados.length === 0 ? (
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>
            No hay alumnos todavía.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {filtrados.map((a) => (
              <div key={a.id} style={styles.listaItem}>
                <div style={styles.inicialesCirculo}>
                  {`${a.nombre?.[0] || ""}${a.apellidos?.[0] || ""}`.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontWeight: "600",
                      fontSize: "0.88rem",
                      color: C.text,
                    }}
                  >
                    {a.nombre} {a.apellidos}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: C.muted }}>
                    {a.email} · {a.ciclo}
                  </p>
                </div>
                <EstadoBadge estado={a.estado_asignacion || "Pendiente"} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Pestaña Empresas ──────────────────────────────────────────────────────────
function TabEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvMsg, setCsvMsg] = useState("");
  const [subiendoCsv, setSubiendoCsv] = useState(false);
  const [contactoMsg, setContactoMsg] = useState("");

  // Formulario nuevo contacto
  const [contactoForm, setContactoForm] = useState({
    empresa_id: "",
    nota: "",
  });

  useEffect(() => {
    apiFetch("/profesores/me/empresas")
      .then((r) => r.json())
      .then(setEmpresas)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCsvEmpresas = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoCsv(true);
    setCsvMsg("");
    const formData = new FormData();
    formData.append("csv", file);
    try {
      const r = await apiFetch("/profesores/me/empresas/importar", {
        method: "POST",
        body: formData,
      });
      const data = await r.json();
      if (r.ok) {
        setCsvMsg(`!Se importaron ${data.importadas} empresas correctamente.`);
        apiFetch("/profesores/me/empresas")
          .then((r) => r.json())
          .then(setEmpresas);
      } else {
        setCsvMsg("Error al importar. Comprueba el formato del CSV.");
      }
    } catch {
      setCsvMsg("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoCsv(false);
    }
  };

  const handleRegistrarContacto = async (e) => {
    e.preventDefault();
    setContactoMsg("");
    try {
      const r = await apiFetch("/profesores/me/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa_id: Number(contactoForm.empresa_id),
          nota: contactoForm.nota,
          fecha: new Date().toISOString(),
        }),
      });
      if (r.ok) {
        setContactoMsg("!Contacto registrado correctamente.");
        setContactoForm({ empresa_id: "", nota: "" });
      } else {
        setContactoMsg("Error al registrar el contacto.");
      }
    } catch {
      setContactoMsg("No se pudo conectar con el servidor.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Importar CSV */}
      <Card title="Importar empresas desde CSV">
        <p
          style={{
            fontSize: "0.82rem",
            color: C.muted,
            marginBottom: "0.8rem",
          }}
        >
          El CSV debe tener:{" "}
          <code>nombre, direccion, web, email, telefono, contacto_nombre</code>
        </p>
        <label style={styles.dropzone}>
          <input
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleCsvEmpresas}
            disabled={subiendoCsv}
          />
          <span style={{ fontSize: "1.4rem" }}>🏢</span>
          <span style={{ fontSize: "0.82rem", color: C.muted }}>
            {subiendoCsv ? "Importando..." : "Haz clic para seleccionar un CSV"}
          </span>
        </label>
        <MensajeFeedback msg={csvMsg} />
      </Card>

      {/* Registrar contacto con empresa */}
      <Card title="Registrar contacto con empresa">
        <form
          onSubmit={handleRegistrarContacto}
          style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
        >
          <div>
            <label style={styles.label}>Empresa</label>
            <select
              value={contactoForm.empresa_id}
              onChange={(e) =>
                setContactoForm({ ...contactoForm, empresa_id: e.target.value })
              }
              style={{ ...styles.input, marginTop: "4px" }}
              required
            >
              <option value="">Selecciona una empresa...</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.label}>Nota del contacto</label>
            <textarea
              placeholder="Ej: Llamada el lunes, confirmaron 2 plazas para DAW..."
              value={contactoForm.nota}
              onChange={(e) =>
                setContactoForm({ ...contactoForm, nota: e.target.value })
              }
              rows={3}
              style={{ ...styles.input, marginTop: "4px", resize: "vertical" }}
              required
            />
          </div>
          <button type="submit" style={styles.btnPrimario}>
            Registrar contacto
          </button>
          <MensajeFeedback msg={contactoMsg} />
        </form>
      </Card>

      {/* Lista empresas */}
      <Card title={`Empresas (${empresas.length})`}>
        {loading ? (
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>Cargando...</p>
        ) : empresas.length === 0 ? (
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>
            No hay empresas todavía.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {empresas.map((emp) => (
              <div key={emp.id} style={styles.listaItem}>
                <div
                  style={{
                    ...styles.inicialesCirculo,
                    background: "#E6F1FB",
                    color: "#0C447C",
                  }}
                >
                  {emp.nombre?.[0]?.toUpperCase() || "E"}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontWeight: "600",
                      fontSize: "0.88rem",
                      color: C.text,
                    }}
                  >
                    {emp.nombre}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: C.muted }}>
                    {emp.email} · {emp.telefono}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: C.muted,
                    background: C.gray,
                    padding: "3px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {emp.plazas_disponibles ?? "—"} plazas
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Pestaña Asignaciones (drag & drop simplificado) ───────────────────────────
function TabAsignaciones() {
  const [alumnos, setAlumnos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState("");
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/profesores/me/alumnos").then((r) => r.json()),
      apiFetch("/profesores/me/empresas").then((r) => r.json()),
    ])
      .then(([a, e]) => {
        setAlumnos(a);
        setEmpresas(e);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAsignar = async (e) => {
    e.preventDefault();
    if (!alumnoSeleccionado || !empresaSeleccionada) return;
    setAsignando(true);
    setMsg("");
    try {
      const r = await apiFetch("/profesores/me/asignaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumno_id: Number(alumnoSeleccionado),
          empresa_id: Number(empresaSeleccionada),
        }),
      });
      if (r.ok) {
        setMsg("!Alumno asignado correctamente.");
        setAlumnoSeleccionado("");
        setEmpresaSeleccionada("");
        // Refrescar alumnos para actualizar estados
        apiFetch("/profesores/me/alumnos")
          .then((r) => r.json())
          .then(setAlumnos);
      } else {
        const data = await r.json();
        setMsg(
          data.detail || "Error al asignar. Comprueba las plazas disponibles.",
        );
      }
    } catch {
      setMsg("No se pudo conectar con el servidor.");
    } finally {
      setAsignando(false);
    }
  };

  const pendientes = alumnos.filter((a) => a.estado_asignacion !== "Asignado");
  const asignados = alumnos.filter((a) => a.estado_asignacion === "Asignado");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Formulario de asignación */}
      <Card title="Asignar alumno a empresa">
        {loading ? (
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>
            Cargando datos...
          </p>
        ) : (
          <form
            onSubmit={handleAsignar}
            style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
          >
            <div>
              <label style={styles.label}>Alumno sin asignar</label>
              <select
                value={alumnoSeleccionado}
                onChange={(e) => setAlumnoSeleccionado(e.target.value)}
                style={{ ...styles.input, marginTop: "4px" }}
                required
              >
                <option value="">Selecciona un alumno...</option>
                {pendientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.apellidos} — {a.ciclo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>
                Empresa (con plazas disponibles)
              </label>
              <select
                value={empresaSeleccionada}
                onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                style={{ ...styles.input, marginTop: "4px" }}
                required
              >
                <option value="">Selecciona una empresa...</option>
                {empresas
                  .filter((emp) => (emp.plazas_disponibles ?? 0) > 0)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.plazas_disponibles} plaza(s)
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={asignando}
              style={styles.btnPrimario}
            >
              {asignando ? "Asignando..." : "Confirmar asignación"}
            </button>
            <MensajeFeedback msg={msg} />
          </form>
        )}
      </Card>

      {/* Resumen de asignaciones */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
      >
        <Card title={`Pendientes (${pendientes.length})`}>
          {pendientes.length === 0 ? (
            <p style={{ color: C.muted, fontSize: "0.82rem" }}>
              ¡Todos asignados!
            </p>
          ) : (
            pendientes.map((a) => (
              <div
                key={a.id}
                style={{ ...styles.listaItem, marginBottom: "6px" }}
              >
                <div style={styles.inicialesCirculo}>
                  {`${a.nombre?.[0] || ""}${a.apellidos?.[0] || ""}`.toUpperCase()}
                </div>
                <div>
                  <p
                    style={{
                      fontWeight: "600",
                      fontSize: "0.82rem",
                      color: C.text,
                    }}
                  >
                    {a.nombre} {a.apellidos}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: C.muted }}>
                    {a.ciclo}
                  </p>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card title={`Asignados (${asignados.length})`}>
          {asignados.length === 0 ? (
            <p style={{ color: C.muted, fontSize: "0.82rem" }}>
              Aún no hay asignaciones.
            </p>
          ) : (
            asignados.map((a) => (
              <div
                key={a.id}
                style={{ ...styles.listaItem, marginBottom: "6px" }}
              >
                <div
                  style={{
                    ...styles.inicialesCirculo,
                    background: C.greenLight,
                    color: C.greenDark,
                  }}
                >
                  {`${a.nombre?.[0] || ""}${a.apellidos?.[0] || ""}`.toUpperCase()}
                </div>
                <div>
                  <p
                    style={{
                      fontWeight: "600",
                      fontSize: "0.82rem",
                      color: C.text,
                    }}
                  >
                    {a.nombre} {a.apellidos}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: C.green }}>
                    {a.empresa?.nombre || "Empresa asignada"}
                  </p>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────
const TABS = [
  { id: "alumnos", label: "Alumnos", componente: TabAlumnos },
  { id: "empresas", label: "Empresas", componente: TabEmpresas },
  { id: "asignaciones", label: "Asignaciones", componente: TabAsignaciones },
];

export default function ProfesorDashboard() {
  const [tabActiva, setTabActiva] = useState("alumnos");
  const [profesor, setProfesor] = useState(null);

  useEffect(() => {
    apiFetch("/profesores/me")
      .then((r) => r.json())
      .then(setProfesor)
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  const TabComponente =
    TABS.find((t) => t.id === tabActiva)?.componente || TabAlumnos;
  const iniciales = profesor
    ? `${profesor.nombre?.[0] || ""}${profesor.apellidos?.[0] || ""}`.toUpperCase()
    : "P";

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
          <span style={{ color: C.greenMid, fontSize: "0.82rem" }}>
            {profesor
              ? `${profesor.nombre} ${profesor.apellidos}`
              : "Profesor/a"}
          </span>
          <div style={styles.avatar}>{iniciales}</div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Cabecera */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={styles.eyebrow}>Panel del profesor</p>
          <h1 style={styles.pageTitle}>Gestión de prácticas</h1>
        </div>

        {/* Tabs */}
        <div style={styles.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(tabActiva === tab.id ? styles.tabBtnActivo : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de la tab activa */}
        <TabComponente />
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
  },
  main: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" },
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
  tabBar: {
    display: "flex",
    gap: "4px",
    backgroundColor: "#e8e8e4",
    borderRadius: "12px",
    padding: "4px",
    marginBottom: "1.2rem",
  },
  tabBtn: {
    flex: 1,
    border: "none",
    background: "transparent",
    borderRadius: "9px",
    padding: "9px 8px",
    fontSize: "0.85rem",
    fontWeight: "500",
    color: C.muted,
    cursor: "pointer",
  },
  tabBtnActivo: {
    backgroundColor: "#fff",
    color: C.greenDark,
    fontWeight: "700",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  listaItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${C.border}`,
    backgroundColor: "#fafaf8",
  },
  inicialesCirculo: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: C.greenLight,
    color: C.greenDark,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "12px",
    flexShrink: 0,
  },
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
  input: {
    padding: "0.6rem 0.85rem",
    border: `1.5px solid ${C.border}`,
    borderRadius: "10px",
    fontSize: "0.88rem",
    backgroundColor: "#fafaf8",
    color: C.text,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  label: { fontSize: "0.78rem", fontWeight: "600", color: "#555" },
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
};
