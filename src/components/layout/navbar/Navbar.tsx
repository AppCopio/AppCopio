// src/components/layout/Navbar/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // <-- IMPORTA Link
import './Navbar.css';

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        {/* Cambiamos <a> por <Link> */}
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}> 
            AppCopio
        </Link>
      </div>
      <ul className="navbar-links">
        {/* Cambiamos <a> por <Link> */}
        <li><Link to="/">Inicio</Link></li>
        <li><Link to="/map">Mapa</Link></li>
        <li><Link to="/login">Acceder</Link></li> {/* Dejamos /login por ahora */}
      </ul>
    </nav>
  );
};

export default Navbar;