import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Layouts y Componentes de Protección
import PublicLayout from "./components/layout/PublicLayout/PublicLayout";
import AdminLayout from "./components/layout/AdminLayout/AdminLayout";
import CenterLayout from "./components/layout/CenterLayout/CenterLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Páginas (Se mantienen todas tus importaciones)
import HomePage from "./pages/HomePage/HomePage";
import MapPage from "./pages/MapPage/MapPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import CenterManagementPage from "./pages/CenterManagementPage/CenterManagementPage";
import CenterDetailsPage from "./pages/CenterDetailsPage/CenterDetailsPage";
import InventoryPage from "./pages/InventoryPage/InventoryPage";
import NeedsFormPage from "./pages/NeedsFormPage/NeedsFormPage";
import NeedsStatusPage from "./pages/NeedsStatusPage/NeedsStatusPage";
import IncidentListPage from "./pages/IncidentListPage/IncidentListPage";
import InventoryHistoryPage from "./pages/InventoryHistoryPage/InventoryHistoryPage";
import MisCentrosPage from './pages/MisCentrosPage/MisCentrosPage'; 
import UsersManagementPage from "./pages/UsersManagementPage/UsersManagementPage";

import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <main className="content">
          <Routes>
            {/* --- 1. Rutas Públicas (Cualquiera puede verlas) --- */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* --- 2. Rutas de Nivel Administrador --- */}
            {/* Solo accesibles para 'Administrador' o 'Apoyo Administrador' */}
            <Route element={<ProtectedRoute allowedRoles={["Administrador"]} checkSupportAdmin={true} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<CenterManagementPage />} />
                <Route path="centers" element={<CenterManagementPage />} />
                <Route path="users" element={<UsersManagementPage />} />
                <Route path="incidents" element={<IncidentListPage />} />
              </Route>
            </Route>

            {/* --- 3. Ruta para Trabajador Municipal (Vista de sus centros) --- */}
            <Route element={<ProtectedRoute allowedRoles={["Trabajador Municipal"]} />}>
              <Route path="/mis-centros" element={<MisCentrosPage />} />
            </Route>
            
            {/* --- 4. Rutas de Gestión de un Centro Específico --- */}
            {/* Accesibles para Admin, Apoyo y Trabajadores/Contactos asignados */}
            <Route element={<ProtectedRoute 
              allowedRoles={["Administrador", "Trabajador Municipal", "Contacto Ciudadano"]} 
              checkSupportAdmin={true}
              checkCenterAssignment={true} 
            />}>
              <Route path="/center/:centerId" element={<CenterLayout />}>
                <Route path="details" element={<CenterDetailsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/history" element={<InventoryHistoryPage />} />
                <Route path="needs/new" element={<NeedsFormPage />} />
                <Route path="needs/status" element={<NeedsStatusPage />} />
              </Route>
            </Route>

            {/* --- Ruta para página no encontrada --- */}
            <Route path="*" element={<h2>404 - Página no encontrada</h2>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;