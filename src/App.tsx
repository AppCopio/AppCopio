// src/App.tsx
import { Routes, Route } from 'react-router-dom';

// Importa los componentes de Layout
import Navbar from './components/layout/navbar/Navbar'; // Usando 'n' minúscula como indicaste
import AdminLayout from './components/layout/AdminLayout/AdminLayout';

// Importa las Páginas
import HomePage from './pages/HomePage/HomePage';
import MapPage from './pages/MapPage/MapPage';
import LoginPage from './pages/LoginPage/LoginPage';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';

// Importa los estilos
import './App.css';

function App() {
  return (
    <div className="App">
      {/* En esta versión, la Navbar SIEMPRE está presente.
        Si quisiéramos ocultarla en ciertas rutas (como login, quizás)
        o tener Navbars diferentes, necesitaríamos una lógica más compleja
        o layouts diferentes. Por ahora, esto es lo más simple.
      */}
      <Navbar />

      <main className="content">
        <Routes>
          {/* Rutas Públicas y Generales */}
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas de Administración (Anidadas bajo AdminLayout) */}
          {/* Aquí, /admin renderizará AdminLayout. 
            AdminLayout, a su vez, renderizará <Outlet />.
            React Router pondrá AdminDashboard (o las futuras páginas admin)
            en ese <Outlet />.
          */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} /> {/* Muestra AdminDashboard en /admin */}
            <Route path="dashboard" element={<AdminDashboard />} /> {/* Muestra AdminDashboard en /admin/dashboard */}
            {/* Aquí añadirías más rutas admin en el futuro:
              <Route path="centers" element={<CenterManagementPage />} /> 
            */}
          </Route>

          {/* Puedes añadir una ruta para 'Página no encontrada' */}
          <Route path="*" element={<div><h2>404 - Página no encontrada</h2></div>} />

        </Routes>
      </main>
    </div>
  );
}

export default App;