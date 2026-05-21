import { useState, useEffect } from "react";

import { apiFetch } from "../../utils/apiFetch";

const C = {
  green: "#1D9E75",
  greenDark: "#085041",
  greenLight: "#E1F5EE",
  greenMid: "#9FE1CB",
  gray: "#f4f4f2",
  border: "#e4e4e0",
  text: "#1a1a1a",
  muted: "#888780",
  red: "#A32D2D",
  redLight: "#FCEBEB",
};

// ── Componentes pequeños ──────────────────────────────────────────────────────

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
  const ok = msg.startsWith("!");
  return (
    <p
      style={{
        fontSize: "0.82rem",
        marginTop: "0.6rem",
        color: ok ? C.green : C.red,
      }}
    >
      {ok ? msg.slice(1) : msg}
    </p>
  );
}

function StatCard({ label, valor, color }) {
  return (
    <div
      style={{
        backgroundColor: color || C.greenLight,
        borderRadius: "12px",
        padding: "1rem 1.2rem",
      }}
    >
      <p
        style={{
          fontSize: "0.72rem",
          fontWeight: "600",
          color: C.greenDark,
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          marginBottom: "6px",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "1.8rem", fontWeight: "700", color: C.greenDark }}>
        {valor ?? "—"}
      </p>
    </div>
  );
}

// ── Pestaña Ciclos ────────────────────────────────────────────────────────────
function TabCiclos() {
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nombre: "",
    anio_inicio: "",
    anio_fin: "",
  });
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiFetch("/admin/ciclos")
      .then((r) => r.json())
      .then(setCiclos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg("");
    try {
      const r = await apiFetch("/admin/ciclos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          anio_inicio: Number(form.anio_inicio),
          anio_fin: Number(form.anio_fin),
        }),
      });
      if (r.ok) {
        const nuevo = await r.json();
        setCiclos((prev) => [...prev, nuevo]);
        setMsg("!Ciclo creado correctamente.");
        setForm({ nombre: "", anio_inicio: "", anio_fin: "" });
      } else {
        const data = await r.json();
        setMsg(data.detail || "Error al crear el ciclo.");
      }
    } catch {
      setMsg("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar este ciclo?")) return;
    setMsg("");

    try {
      const r = await apiFetch(`/ciclos/${id}`, { method: "DELETE" });

      if (r.ok) {
        setCiclos((prev) => prev.filter((c) => c.id !== id));
        setMsg("!Ciclo eliminado correctamente.");
      } else {
        // Aquí es donde el backend nos dice que hay alumnos
        const data = await r.json();
        setMsg(data.detail || "No se puede eliminar el ciclo.");
      }
    } catch (error) {
      setMsg("Error de conexión al intentar eliminar.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Formulario nuevo ciclo */}
      <Card title="Crear nuevo ciclo formativo">
        <form
          onSubmit={handleCrear}
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          {/* ... tus inputs ... */}
          <button type="submit" disabled={guardando} style={styles.btnPrimario}>
            {guardando ? "Creando..." : "Crear ciclo"}
          </button>
          <MensajeFeedback msg={msg} />
        </form>
      </Card>

      {/* Lista de ciclos */}
      <Card title={`Ciclos existentes (${ciclos.length})`}>
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {ciclos.map((c) => (
              <div key={c.id} style={styles.listaItem}>
                {/* ... info del ciclo ... */}
                <button
                  onClick={() => handleEliminar(c.id)}
                  style={styles.btnDanger}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 2. CAMBIO AQUÍ: Ponemos el mensaje también al final de la lista */}
        <div style={{ marginTop: "1rem" }}>
          <MensajeFeedback msg={msg} />
        </div>
      </Card>
    </div>
  );
}

const handleEliminar = async (id) => {
  if (!window.confirm("¿Eliminar este ciclo?")) return;
  setMsg(""); // Limpiamos mensajes previos

  try {
    const r = await apiFetch(`/ciclos/${id}`, { method: "DELETE" });

    if (r.ok) {
      // Si sale bien, filtramos la lista y mostramos éxito
      setCiclos((prev) => prev.filter((c) => c.id !== id));
      setMsg("!Ciclo eliminado correctamente.");
    } else {
      // AQUÍ capturamos el error 400 que enviamos desde el backend
      const data = await r.json();
      setMsg(data.detail || "Error al eliminar el ciclo.");
    }
  } catch (error) {
    setMsg("No se pudo conectar con el servidor.");
  }
};

return (
  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
    {/* Formulario nuevo ciclo */}
    <Card title="Crear nuevo ciclo formativo">
      <form
        onSubmit={handleCrear}
        style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
      >
        <div>
          <label style={styles.label}>Nombre del ciclo</label>
          <input
            type="text"
            placeholder="Ej: Desarrollo de Aplicaciones Web"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            style={{ ...styles.input, marginTop: "4px" }}
            required
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.8rem",
          }}
        >
          <div>
            <label style={styles.label}>Año inicio</label>
            <input
              type="number"
              placeholder="2025"
              value={form.anio_inicio}
              onChange={(e) =>
                setForm({ ...form, anio_inicio: e.target.value })
              }
              style={{ ...styles.input, marginTop: "4px" }}
              required
            />
          </div>
          <div>
            <label style={styles.label}>Año fin</label>
            <input
              type="number"
              placeholder="2026"
              value={form.anio_fin}
              onChange={(e) => setForm({ ...form, anio_fin: e.target.value })}
              style={{ ...styles.input, marginTop: "4px" }}
              required
            />
          </div>
        </div>
        <button type="submit" disabled={guardando} style={styles.btnPrimario}>
          {guardando ? "Creando..." : "Crear ciclo"}
        </button>
        <MensajeFeedback msg={msg} />
      </form>
    </Card>

    {/* Lista de ciclos */}
    <Card title={`Ciclos existentes (${ciclos.length})`}>
      {loading ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>Cargando...</p>
      ) : ciclos.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "0.85rem" }}>
          No hay ciclos creados todavía.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {Array.isArray(ciclos) &&
            ciclos.map((c) => (
              <div key={c.id} style={styles.listaItem}>
                <div
                  style={{
                    ...styles.inicialesCirculo,
                    background: "#E6F1FB",
                    color: "#0C447C",
                    borderRadius: "8px",
                  }}
                >
                  {c.nombre?.slice(0, 3).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontWeight: "600",
                      fontSize: "0.88rem",
                      color: C.text,
                    }}
                  >
                    {c.nombre}
                  </p>
                  <p style={{ fontSize: "0.76rem", color: C.muted }}>
                    {c.anno_inicio} – {c.anno_fin}
                  </p>
                </div>
                <button
                  onClick={() => handleEliminar(c.id)}
                  style={styles.btnDanger}
                >
                  Eliminar
                </button>
              </div>
            ))}
        </div>
      )}
    </Card>
  </div>
);

// ── Pestaña Profesores ────────────────────────────────────────────────────────
function TabProfesores() {
  const [profesores, setProfesores] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    ciclo_id: "",
  });
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/admin/profesores").then((r) => r.json()),
      apiFetch("/ciclos").then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setProfesores(p);
        setCiclos(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg("");
    try {
      const r = await apiFetch("/admin/profesores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ciclo_id: Number(form.ciclo_id),
        }),
      });
      if (r.ok) {
        const nuevo = await r.json();
        setProfesores((prev) => [...prev, nuevo]);
        setMsg("!Profesor creado y asignado correctamente.");
        setForm({ nombre: "", apellidos: "", email: "", ciclo_id: "" });
      } else {
        const data = await r.json();
        setMsg(data.detail || "Error al crear el profesor.");
      }
    } catch {
      setMsg("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Formulario */}
      <Card title="Añadir profesor y asignar a ciclo">
        <form
          onSubmit={handleCrear}
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.8rem",
            }}
          >
            <div>
              <label style={styles.label}>Nombre</label>
              <input
                type="text"
                placeholder="María"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                style={{ ...styles.input, marginTop: "4px" }}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Apellidos</label>
              <input
                type="text"
                placeholder="López García"
                value={form.apellidos}
                onChange={(e) =>
                  setForm({ ...form, apellidos: e.target.value })
                }
                style={{ ...styles.input, marginTop: "4px" }}
                required
              />
            </div>
          </div>
          <div>
            <label style={styles.label}>Correo electrónico</label>
            <input
              type="email"
              placeholder="profesor@instituto.es"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ ...styles.input, marginTop: "4px" }}
              required
            />
          </div>
          <div>
            <label style={styles.label}>Asignar a ciclo</label>
            <select
              value={form.ciclo_id}
              onChange={(e) => setForm({ ...form, ciclo_id: e.target.value })}
              style={{ ...styles.input, marginTop: "4px" }}
              required
            >
              <option value="">Selecciona un ciclo...</option>
              {Array.isArray(ciclos) &&
                ciclos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>
          <button type="submit" disabled={guardando} style={styles.btnPrimario}>
            {guardando ? "Guardando..." : "Añadir profesor"}
          </button>
          <MensajeFeedback msg={msg} />
        </form>
      </Card>

      {/* Lista profesores */}
      <Card title={`Profesores (${profesores.length})`}>
        {loading ? (
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>Cargando...</p>
        ) : profesores.length === 0 ? (
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>
            No hay profesores registrados.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {profesores.map((p) => (
              <div key={p.id} style={styles.listaItem}>
                <div style={styles.inicialesCirculo}>
                  {`${p.nombre?.[0] || ""}${p.apellidos?.[0] || ""}`.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontWeight: "600",
                      fontSize: "0.88rem",
                      color: C.text,
                    }}
                  >
                    {p.nombre} {p.apellidos}
                  </p>
                  <p style={{ fontSize: "0.76rem", color: C.muted }}>
                    {p.email}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "0.76rem",
                    color: "#0C447C",
                    background: "#E6F1FB",
                    padding: "3px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {p.ciclo?.nombre || "Sin ciclo"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Pestaña Configuración ─────────────────────────────────────────────────────
function TabConfiguracion() {
  const [config, setConfig] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    descripcion: "",
  });
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiFetch("/admin/configuracion")
      .then((r) => r.json())
      .then((data) =>
        setConfig({
          fecha_inicio: data.fecha_inicio?.slice(0, 10) || "",
          fecha_fin: data.fecha_fin?.slice(0, 10) || "",
          descripcion: data.descripcion || "",
        }),
      )
      .catch(() => {});
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg("");
    try {
      const r = await apiFetch("/admin/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (r.ok) setMsg("!Configuración guardada correctamente.");
      else setMsg("Error al guardar la configuración.");
    } catch {
      setMsg("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card title="Periodo de asignación de prácticas">
      <p style={{ fontSize: "0.82rem", color: C.muted, marginBottom: "1rem" }}>
        Define las fechas en las que los profesores pueden realizar
        asignaciones.
      </p>
      <form
        onSubmit={handleGuardar}
        style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.8rem",
          }}
        >
          <div>
            <label style={styles.label}>Fecha inicio</label>
            <input
              type="date"
              value={config.fecha_inicio}
              onChange={(e) =>
                setConfig({ ...config, fecha_inicio: e.target.value })
              }
              style={{ ...styles.input, marginTop: "4px" }}
              required
            />
          </div>
          <div>
            <label style={styles.label}>Fecha fin</label>
            <input
              type="date"
              value={config.fecha_fin}
              onChange={(e) =>
                setConfig({ ...config, fecha_fin: e.target.value })
              }
              style={{ ...styles.input, marginTop: "4px" }}
              required
            />
          </div>
        </div>
        <div>
          <label style={styles.label}>Descripción del periodo (opcional)</label>
          <textarea
            placeholder="Ej: Periodo de prácticas FCT curso 2025-2026"
            value={config.descripcion}
            onChange={(e) =>
              setConfig({ ...config, descripcion: e.target.value })
            }
            rows={3}
            style={{ ...styles.input, marginTop: "4px", resize: "vertical" }}
          />
        </div>
        <button type="submit" disabled={guardando} style={styles.btnPrimario}>
          {guardando ? "Guardando..." : "Guardar configuración"}
        </button>
        <MensajeFeedback msg={msg} />
      </form>
    </Card>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────
const TABS = [
  { id: "ciclos", label: "Ciclos", componente: TabCiclos },
  { id: "profesores", label: "Profesores", componente: TabProfesores },
  { id: "configuracion", label: "Configuración", componente: TabConfiguracion },
];

export default function AdminDashboard() {
  const [tabActiva, setTabActiva] = useState("ciclos");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch("/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  const TabComponente =
    TABS.find((t) => t.id === tabActiva)?.componente || TabCiclos;

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
          <span
            style={{
              color: C.greenMid,
              fontSize: "0.82rem",
              fontWeight: "500",
            }}
          >
            Administrador
          </span>
          <div style={{ ...styles.avatar, background: "#378ADD" }}>AD</div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Cabecera */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={styles.eyebrow}>Panel de administración</p>
          <h1 style={styles.pageTitle}>Panel de control</h1>
        </div>

        {/* Stats */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "10px",
              marginBottom: "1.5rem",
            }}
          >
            <StatCard label="Ciclos" valor={stats.total_ciclos} />
            <StatCard label="Profesores" valor={stats.total_profesores} />
            <StatCard label="Alumnos" valor={stats.total_alumnos} />
            <StatCard
              label="Asignados"
              valor={stats.total_asignados}
              color="#E6F1FB"
            />
          </div>
        )}

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

        {/* Contenido */}
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
  btnDanger: {
    backgroundColor: "#FCEBEB",
    color: C.red,
    border: `1px solid #F7C1C1`,
    borderRadius: "8px",
    padding: "4px 12px",
    fontSize: "0.78rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};
