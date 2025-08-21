// src/components/layout/navbar/Navbar.tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdminOrSupport = user?.role_name === 'Administrador' || user?.es_apoyo_admin;

  return (
    <nav className="main-navbar">
      <div className="navbar-logo">
        <NavLink to={isAuthenticated ? (isAdminOrSupport ? "/admin/centers" : "/mis-centros") : "/"}>
          AppCopio
        </NavLink>
      </div>
      <ul className="navbar-links">
        {/* === Enlaces para Todos (públicos y logueados) === */}
        <li>
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active-link' : '')}>
            Inicio
          </NavLink>
        </li>
        <li>
          <NavLink to="/map" className={({ isActive }) => (isActive ? 'active-link' : '')}>
            Mapa
          </NavLink>
        </li>

        {/* --- Lógica Condicional de Enlaces --- */}
        {!isAuthenticated ? (
          // --- Enlaces solo para usuarios NO logueados ---
          <li>
            <NavLink to="/login" className="login-button-nav">
              Iniciar Sesión
            </NavLink>
          </li>
        ) : (
          // --- Enlaces solo para usuarios SÍ logueados ---
          <>
            {isAdminOrSupport && (
              <>
                <li>
                  <NavLink to="/admin/centers" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                    Gestión Centros
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                    Gestión Usuarios
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/incidents" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                    Incidencias
                  </NavLink>
                </li>
              </>
            )}
            {user?.role_name === 'Trabajador Municipal' && !user?.es_apoyo_admin && (
                <li>
                    <NavLink to="/mis-centros" className={({ isActive }) => (isActive ? 'active-link' : '')}>
                        Mis Centros
                    </NavLink>
                </li>
            )}
            <li>
              <button onClick={handleLogout} className="logout-button">
                Cerrar Sesión ({user.username})
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;