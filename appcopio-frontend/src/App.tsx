// src/App.tsx (VERSIÓN CON PERMISOS CORREGIDOS)
import { Routes, Route } from 'react-router-dom';

// Layouts
import PublicLayout from './components/layout/PublicLayout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout/AdminLayout';
import CenterLayout from './components/layout/CenterLayout/CenterLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Páginas
<<<<<<< Updated upstream
import HomePage from './pages/HomePage/HomePage';
import MapPage from './pages/MapPage/MapPage';
import LoginPage from './pages/LoginPage/LoginPage';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import CenterManagementPage from './pages/CenterManagementPage/CenterManagementPage';
import InventoryPage from './pages/InventoryPage/InventoryPage';
import NeedsPage from './pages/NeedsPage/NeedsPage';
import IncidentListPage from './pages/IncidentListPage/IncidentListPage';
import InventoryHistoryPage from './pages/InventoryHistoryPage/InventoryHistoryPage';
=======
import HomePage from "./pages/HomePage/HomePage";
import MapPage from "./pages/MapPage/MapPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import CenterManagementPage from "./pages/CenterManagementPage/CenterManagementPage";
import UsersManagementPage from "./pages/UsersManagementPage/UsersManagementPage";
import CenterDetailsPage from "./pages/CenterDetailsPage/CenterDetailsPage";
import InventoryPage from "./pages/InventoryPage/InventoryPage";
import NeedsFormPage from "./pages/NeedsFormPage/NeedsFormPage";
import NeedsStatusPage from "./pages/NeedsStatusPage/NeedsStatusPage";
import IncidentListPage from "./pages/IncidentListPage/IncidentListPage";
import InventoryHistoryPage from "./pages/InventoryHistoryPage/InventoryHistoryPage";
import MisCentrosPage from './pages/MisCentrosPage/MisCentrosPage';
import CenterRegistrationPage from './pages/CenterRegistrationPage/CenterRegistrationPage';
>>>>>>> Stashed changes

import './App.css';

function App() {
  return (
    <div className="App">
      <main className="content">
        <Routes>
          {/* --- Rutas Públicas --- */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/incidentes" element={<IncidentListPage />} />
          </Route>

<<<<<<< Updated upstream
          {/* --- Rutas Protegidas para el Rol "Emergencias" --- */}
          <Route element={<ProtectedRoute allowedRoles={['Emergencias']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="centers" element={<CenterManagementPage />} />
=======
          {/* --- 2. Bloque Único de Rutas Protegidas --- */}
          <Route element={<ProtectedRoute 
              allowedRoles={["Administrador", "Trabajador Municipal", "Contacto Ciudadano"]} 
              checkSupportAdmin={true} 
            />}>
            {/* Todas las rutas aquí dentro usarán el AdminLayout y tendrán Navbar */}
            <Route element={<AdminLayout />}>
              
              {/* Rutas de Admin y Apoyo */}
              <Route path="/admin/centers" element={<CenterManagementPage />} />
              <Route path="/admin/users" element={<UsersManagementPage />} />
              <Route path="/admin/incidents" element={<IncidentListPage />} />
              <Route path="registrar-centro" element={<CenterRegistrationPage />} />

              {/* Ruta de Trabajador Municipal */}
              <Route path="/mis-centros" element={<MisCentrosPage />} />

              {/* Rutas de gestión de un centro específico (requieren validación extra) */}
              <Route path="/center/:centerId" element={<CenterLayout />}>
                <Route path="details" element={<CenterDetailsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/history" element={<InventoryHistoryPage />} />
                <Route path="needs/new" element={<NeedsFormPage />} />
                <Route path="needs/status" element={<NeedsStatusPage />} />
              </Route>
>>>>>>> Stashed changes
            </Route>
          </Route>

          {/* --- Rutas Protegidas para AMBOS ROLES (Emergencias y Encargado) --- */}
          {/* AQUÍ ESTÁ EL CAMBIO: Ahora ambos roles pueden acceder a las vistas de un centro específico */}
          <Route element={<ProtectedRoute allowedRoles={['Emergencias', 'Encargado']} />}>
            <Route path="/center/:centerId" element={<CenterLayout />}>
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="needs" element={<NeedsPage />} />
            </Route>
          </Route>
          {/* --- Rutas Protegidas SOLO para el rol "Encargado" --- */}
          <Route element={<ProtectedRoute allowedRoles={['Encargado']} />}>
            <Route path="/historial-inventario" element={<InventoryHistoryPage />} />
          </Route>

          {/* Ruta para página no encontrada */}
          <Route path="*" element={<h2>404 - Página no encontrada</h2>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;