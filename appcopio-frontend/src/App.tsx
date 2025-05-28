// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout/PublicLayout'; // <-- NUEVO
import AdminLayout from './components/layout/AdminLayout/AdminLayout';
import HomePage from './pages/HomePage/HomePage';
import MapPage from './pages/MapPage/MapPage';
import LoginPage from './pages/LoginPage/LoginPage';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import CenterManagementPage from './pages/CenterManagementPage/CenterManagementPage'; // <-- NUEVO
import CenterLayout from './components/layout/CenterLayout/CenterLayout';
import InventoryPage from './pages/InventoryPage/InventoryPage';
import NeedsPage from './pages/NeedsPage/NeedsPage';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* YA NO HAY NAVBAR AQUÍ */}
      <main className="content">
        <Routes>
          {/* Rutas Públicas bajo PublicLayout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Rutas de Admin bajo AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="centers" element={<CenterManagementPage />} />
          </Route>

           {/* Rutas de Encargado bajo CenterLayout (NUEVO) */}
        
          <Route path="/center/:centerId" element={<CenterLayout />}>
          {/* <Route index element={<CenterDashboardPage />} />  Podríamos añadir un dashboard aquí */}
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="needs" element={<NeedsPage />} />
  </Route>



          <Route path="*" element={<div><h2>404 - Página no encontrada</h2></div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;