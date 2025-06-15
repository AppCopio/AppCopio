// src/components/layout/navbar/Navbar.tsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres salir?')) {
      logout();
      navigate('/');
    }
  };

  // --- LÓGICA DE RUTAS DINÁMICAS ---
  // 1. Definimos cuál será la ruta "home" dependiendo del rol del usuario.
  const homePath = user?.role === 'Emergencias' ? '/admin/dashboard' : '/';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        {/* 2. El logo ahora apunta a la ruta 'home' dinámica */}
        <Link to={homePath} style={{ color: 'white', textDecoration: 'none' }}>
          AppCopio
        </Link>
      </div>
      <ul className="navbar-links">
        {/* 3. El enlace de "Inicio" también usa la ruta dinámica */}
        <li><NavLink to={homePath}>Inicio</NavLink></li>
        <li><NavLink to="/map">Mapa</NavLink></li>
        
        {/* Links condicionales para el rol 'Emergencias' */}
        {user?.role === 'Emergencias' && (
          <>
            {/* 4. HEMOS ELIMINADO el enlace 'Dashboard' de aquí porque ahora está en 'Inicio' */}
            <li><NavLink to="/admin/centers">Centros</NavLink></li>
          </>
        )}

        {/* Links condicionales para el rol 'Encargado' */}
        {user?.role === 'Encargado' && user.centerId && (
          <>
            <li><NavLink to={`/center/${user.centerId}/inventory`}>Mi Centro</NavLink></li>
          </>
        )}

        {/* Botón de Login o Logout */}
        {isAuthenticated ? (
          <li><button onClick={handleLogout} className="logout-btn">Salir</button></li>
        ) : (
          <li><NavLink to="/login">Acceder</NavLink></li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;