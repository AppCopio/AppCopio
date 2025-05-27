// src/components/layout/Navbar/Navbar.tsx
import React from 'react';
import './Navbar.css';

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        AppCopio 🔥
      </div>
      <ul className="navbar-links">
        <li><a href="/">Inicio</a></li>
        <li><a href="/map">Mapa</a></li>
        <li><a href="/login">Acceder</a></li>
      </ul>
    </nav>
  );
};

export default Navbar;