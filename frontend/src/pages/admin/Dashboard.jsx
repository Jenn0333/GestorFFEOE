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
      .then((data) => setCiclos(Array.isArray(data) ? data : []))
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
        body: JSON.stringify({ ...form, ciclo_id: Number(form.ciclo_id) }),
      });

      if (r.ok) {
        const nuevoDelServidor = await r.json();

        // BUSCAMOS EL CICLO MANUALMENTE PARA QUE APAREZCA AL INSTANTE
        const cicloAsignado = ciclos.find(
          (c) => c.id === Number(form.ciclo_id),
        );
        const nuevoConDatos = {
          ...nuevoDelServidor,
          ciclo: cicloAsignado, // Le "inyectamos" el nombre del ciclo para la vista
        };

        setProfesores((prev) => [...prev, nuevoConDatos]);
        setMsg("!Profesor creado y asignado.");
        setForm({ nombre: "", apellidos: "", email: "", ciclo_id: "" });
      } else {
        const data = await r.json();
        setMsg(data.detail || "Error al crear.");
      }
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este ciclo?")) return;
    setMsg("");
    try {
      const r = await apiFetch(`/ciclos/${id}`, { method: "DELETE" });
      const data = await r.json();
      if (r.ok) {
        setCiclos((prev) => prev.filter((c) => c.id !== id));
        setMsg("!Ciclo eliminado correctamente.");
      } else {
        setMsg(data.detail || "Error al eliminar el ciclo.");
      }
    } catch {
      setMsg("Error de conexión con el servidor.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Card title="Crear nuevo ciclo formativo">
        <form
          onSubmit={handleCrear}
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          <div>
            <label style={styles.label}>Nombre del ciclo</label>
            <input
              type="text"
              placeholder="Ej: DAW"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={styles.input}
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
            <input
              type="number"
              placeholder="Año inicio"
              value={form.anio_inicio}
              onChange={(e) =>
                setForm({ ...form, anio_inicio: e.target.value })
              }
              style={styles.input}
              required
            />
            <input
              type="number"
              placeholder="Año fin"
              value={form.anio_fin}
              onChange={(e) => setForm({ ...form, anio_fin: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          <button type="submit" disabled={guardando} style={styles.btnPrimario}>
            {guardando ? "Creando..." : "Crear ciclo"}
          </button>
          <MensajeFeedback msg={msg} />
        </form>
      </Card>

      <Card title={`Ciclos existentes (${ciclos.length})`}>
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {ciclos.map((c) => (
              <div key={c.id} style={styles.listaItem}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: "600", fontSize: "0.88rem" }}>
                    {c.nombre}
                  </p>
                  <p style={{ fontSize: "0.76rem", color: C.muted }}>
                    {c.anio_inicio} - {c.anio_fin}
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
        <div style={{ marginTop: "1rem" }}>
          <MensajeFeedback msg={msg} />
        </div>
      </Card>
    </div>
  );
}

// ── Pestaña Profesores ───────────────────────────────────────────────────────
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
    setLoading(true);
    Promise.all([
      apiFetch("/admin/profesores").then((r) => r.json()),
      apiFetch("/admin/ciclos").then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setProfesores(Array.isArray(p) ? p : []);
        setCiclos(Array.isArray(c) ? c : []);
      })
      .catch(() => setMsg("Error al cargar datos."))
      .finally(() => setLoading(false));
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg("");
    try {
      const payload = {
        nombre: form.nombre,
        apellidos: form.apellidos,
        email: form.email,
        ciclo_id: Number(form.ciclo_id), // <--- Vital que sea un número
      };

      const r = await apiFetch("/admin/profesores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        const nuevo = await r.json();

        // Añadimos el nuevo profesor a la lista.
        // Si el backend no devuelve el objeto 'ciclo', al menos lleva 'ciclo_id'
        setProfesores((prev) => [...prev, nuevo]);

        setMsg("!Profesor creado correctamente.");
        setForm({ nombre: "", apellidos: "", email: "", ciclo_id: "" });
      } else {
        const data = await r.json();
        setMsg(data.detail || "Error al crear.");
      }
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Card title="Añadir profesor">
        <form
          onSubmit={handleCrear}
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          <input
            type="text"
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Apellidos"
            value={form.apellidos}
            onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={styles.input}
            required
          />
          <select
            value={form.ciclo_id}
            onChange={(e) => setForm({ ...form, ciclo_id: e.target.value })}
            style={styles.input}
            required
          >
            <option value="">Selecciona un ciclo...</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <button type="submit" disabled={guardando} style={styles.btnPrimario}>
            Añadir profesor
          </button>
          <MensajeFeedback msg={msg} />
        </form>
      </Card>
      <Card title={`Profesores (${profesores.length})`}>
        {profesores.map((p) => (
          <div key={p.id} style={styles.listaItem}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: "600", fontSize: "0.88rem" }}>
                {p.nombre} {p.apellidos}
              </p>
              <p style={{ fontSize: "0.76rem", color: C.muted }}>{p.email}</p>
            </div>
            <span style={styles.tag}>
              {ciclos.find((c) => c.id === p.ciclo_id)?.nombre ||
                p.ciclo?.nombre ||
                "Sin ciclo"}
            </span>
          </div>
        ))}
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
    try {
      const r = await apiFetch("/admin/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (r.ok) setMsg("!Guardado.");
      else setMsg("Error al guardar.");
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card title="Configuración del periodo">
      <form
        onSubmit={handleGuardar}
        style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
      >
        <input
          type="date"
          value={config.fecha_inicio}
          onChange={(e) =>
            setConfig({ ...config, fecha_inicio: e.target.value })
          }
          style={styles.input}
        />
        <input
          type="date"
          value={config.fecha_fin}
          onChange={(e) => setConfig({ ...config, fecha_fin: e.target.value })}
          style={styles.input}
        />
        <textarea
          value={config.descripcion}
          onChange={(e) =>
            setConfig({ ...config, descripcion: e.target.value })
          }
          style={styles.input}
        />
        <button type="submit" disabled={guardando} style={styles.btnPrimario}>
          Guardar
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
    localStorage.clear();
    window.location.href = "/";
  };

  const TabComponente =
    TABS.find((t) => t.id === tabActiva)?.componente || TabCiclos;

  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div style={styles.navLogo}>
          <div style={styles.navLogoMark}>G</div>
          <span style={{ fontWeight: "700", color: "#fff" }}>GestorFFEOE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main style={styles.main}>
        <h1 style={styles.pageTitle}>Panel de Control</h1>
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
