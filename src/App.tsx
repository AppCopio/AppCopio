
// src/App.tsx
import { Routes, Route } from 'react-router-dom'; // <-- IMPORTA
import Navbar from './components/layout/navbar/Navbar';
import HomePage from './pages/HomePage/HomePage';     // <-- IMPORTA
import MapPage from './pages/MapPage/MapPage';       // <-- IMPORTA
import LoginPage from './pages/LoginPage/LoginPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <Navbar />
      <main className="content">
        <Routes> {/* <-- DEFINE EL ÁREA DE RUTAS */}
          <Route path="/" element={<HomePage />} /> {/* <-- RUTA PARA INICIO */}
          <Route path="/map" element={<MapPage />} /> {/* <-- RUTA PARA MAPA */}
          <Route path="/login" element={<LoginPage />} /> {/* <-- AÑADE ESTA LÍNEA */}
          {/* <Route path="/login" element={<LoginPage />} />  Añadiremos esto después */}
        </Routes>
      </main>
    </div>
  );
}

export default App;