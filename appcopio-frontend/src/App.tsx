import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Layouts y Componentes de Protección
import PublicLayout from "./components/layout/PublicLayout/PublicLayout";
import AdminLayout from "./components/layout/AdminLayout/AdminLayout";
import CenterLayout from "./components/layout/CenterLayout/CenterLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Páginas
import HomePage from "./pages/HomePage/HomePage";
import MapPage from "./pages/MapPage/MapPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import CenterManagementPage from "./pages/CenterManagementPage/CenterManagementPage";
import UsersManagementPage from "./pages/UsersManagementPage/UsersManagementPage";
import CenterDetailsPage from "./pages/CenterDetailsPage/CenterDetailsPage";
import InventoryPage from "./pages/InventoryPage/InventoryPage";
import NeedsFormPage from "./pages/NeedsFormPage/NeedsFormPage";
import NeedsStatusPage from "./pages/NeedsStatusPage/NeedsStatusPage";

import UpdatesPage from './pages/UpdatesPage/UpdatesPage'; 
import InventoryHistoryPage from "./pages/InventoryHistoryPage/InventoryHistoryPage";
import MisCentrosPage from './pages/MisCentrosPage/MisCentrosPage';
import FibePage from "./pages/FibePage/FibePage";

import CreateCenterPage from './pages/CreateCenterPage/CreateCenterPage';
import CenterResidentsPage from "./pages/CenterResidentsPage/CenterResidentsPage";
import CenterEditPage from './pages/CenterEditPage/CenterEditPage';

import "./App.css";
import MultiStepCenterForm from "./pages/CreateCenterPage/MultiStepCenterForm";

import ExampleFrontend from "./pages/ExampleFrontPage/ExampleFrontPage";


function App() {
  return (
    <div className="App">
      <main className="content">
        <Routes>
          {/* --- 1. Rutas Públicas --- */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/typo" element={<ExampleFrontend />} />
          </Route>

          {/* --- 2. Bloque Único de Rutas Protegidas --- */}
          <Route element={<ProtectedRoute 
              allowedRoles={["Administrador", "Trabajador Municipal", "Contacto Ciudadano"]} 
              checkSupportAdmin={true} 
            />}>
            <Route element={<AdminLayout />}>
              
              <Route path="/admin/centers" element={<CenterManagementPage />} />
              <Route path="/admin/centers/new" element={<MultiStepCenterForm />} />
              <Route path="/admin/users" element={<UsersManagementPage />} />

              <Route path="/admin/fibe" element={<FibePage />} />
              <Route path="/admin/updates" element={<UpdatesPage />} />

              <Route path="/mis-centros" element={<MisCentrosPage />} />

              <Route path="/center/:centerId" element={<CenterLayout />}>
                <Route path="details" element={<CenterDetailsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/history" element={<InventoryHistoryPage />} />
                <Route path="needs/new" element={<NeedsFormPage />} />
                <Route path="needs/status" element={<NeedsStatusPage />} />
                <Route path="residents" element={<CenterResidentsPage />} />
              </Route>
              
              {/* Ruta de Edición de centros */}
              <Route path="admin/centers/:centerId/edit" element={<CenterEditPage />} />

            </Route>
          </Route>

          <Route path="*" element={<h2>404 - Página no encontrada</h2>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;