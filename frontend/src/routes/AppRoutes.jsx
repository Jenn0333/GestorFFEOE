import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import AdminDashboard from "../pages/admin/Dashboard";
import ProfesorDashboard from "../pages/profesor/Dashboard";
import AlumnoDashboard from "../pages/alumno/Dashboard";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profesor" element={<ProfesorDashboard />} />
        <Route path="/alumno" element={<AlumnoDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
