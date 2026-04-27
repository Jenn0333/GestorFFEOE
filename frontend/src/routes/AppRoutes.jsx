import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Login from "../pages/Login";
import AdminDashboard from "../pages/admin/Dashboard";
import ProfesorDashboard from "../pages/profesor/Dashboard";
import AlumnoDashboard from "../pages/alumno/Dashboard";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/" element={<Login />} />

        {/* Rutas protegidas por rol */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute rolRequerido="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profesor"
          element={
            <ProtectedRoute rolRequerido="profesor">
              <ProfesorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alumno"
          element={
            <ProtectedRoute rolRequerido="alumno">
              <AlumnoDashboard />
            </ProtectedRoute>
          }
        />

        {/* Cualquier ruta desconocida → login */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
