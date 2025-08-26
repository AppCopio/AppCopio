// src/components/layout/CenterLayout/CenterLayout.tsx
import React from 'react';
import { Outlet, useParams, Link } from 'react-router-dom';
import Navbar from '../navbar/Navbar';
import { potentialCentersData } from '../../../data/potentialCenters';
import './CenterLayout.css';

const CenterLayout: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>(); 
  const currentCenter = potentialCentersData.find(c => c.id === centerId);

  return (
    <div className="center-layout">
      <Navbar />

      <div className="center-header">
        <h2>
          Gestionando: {currentCenter ? currentCenter.name : `Centro ${centerId}`}
        </h2>
        <nav className="center-subnav">
          <Link to={`/center/${centerId}/inventory`}>Inventario</Link>
          <Link to={`/center/${centerId}/details`}>Ver Detalles</Link>
          <Link to={`/center/${centerId}/needs/new`}>Crear Solicitud</Link>
          <Link to={`/center/${centerId}/needs/status`}>Estado de Solicitudes</Link>
          <Link to={`/center/${centerId}/residents`}>Listado de Personas</Link>

        </nav>
      </div>

      <main className="center-main-area">
        <Outlet />
      </main>
    </div>
  );
};

export default CenterLayout;
