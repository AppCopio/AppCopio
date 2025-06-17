// src/App.tsx (VERSIÓN CON PERMISOS CORREGIDOS)
import { Routes, Route } from 'react-router-dom';

// Layouts
import PublicLayout from './components/layout/PublicLayout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout/AdminLayout';
import CenterLayout from './components/layout/CenterLayout/CenterLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Páginas
import HomePage from './pages/HomePage/HomePage';
import MapPage from './pages/MapPage/MapPage';
import LoginPage from './pages/LoginPage/LoginPage';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import CenterManagementPage from './pages/CenterManagementPage/CenterManagementPage';
import InventoryPage from './pages/InventoryPage/InventoryPage';
import NeedsPage from './pages/NeedsPage/NeedsPage';
import IncidentListPage from './pages/IncidentListPage/IncidentListPage';

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

          {/* --- Rutas Protegidas para el Rol "Emergencias" --- */}
          <Route element={<ProtectedRoute allowedRoles={['Emergencias']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="centers" element={<CenterManagementPage />} />
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

          {/* Ruta para página no encontrada */}
          <Route path="*" element={<h2>404 - Página no encontrada</h2>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;