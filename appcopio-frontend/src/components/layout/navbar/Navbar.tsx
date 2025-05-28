// src/components/layout/navbar/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

// Definimos el tipo de props que puede recibir
interface NavbarProps {
  isAdmin?: boolean; // Hacemos la prop opcional
}

const Navbar: React.FC<NavbarProps> = ({ isAdmin = false }) => { // Por defecto no es admin
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}> 
            AppCopio
        </Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/">Inicio</Link></li>
        <li><Link to="/map">Mapa</Link></li>

        {/* AQUÍ ESTÁ LA MAGIA: Muestra "Centros" solo si isAdmin es true */}
        {isAdmin && (
          <li><Link to="/admin/centers">Centros</Link></li>
        )}

        {/* Si está en modo admin, quizás el link de login no tiene sentido
            o podría cambiar a "Salir" o "Mi Perfil". Por ahora lo dejamos. */}
        <li><Link to="/login">Acceder</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;