// src/components/layout/CenterLayout/CenterLayout.tsx
import React from 'react';
import { Outlet, useParams, Link } from 'react-router-dom';
import Navbar from '../navbar/Navbar';
import { potentialCentersData } from '../../../data/potentialCenters'; // Asegúrate que la ruta es correcta
import './CenterLayout.css';

const CenterLayout: React.FC = () => {
  // Obtenemos el ID del centro desde la URL
  const { centerId } = useParams<{ centerId: string }>(); 

  // Buscamos el centro para mostrar su nombre (opcional pero útil)
  const currentCenter = potentialCentersData.find(c => c.id === centerId);

  return (
    <div className="center-layout">
      {/* Por ahora, renderizamos la Navbar normal. 
        En el futuro, le pasaríamos props o usaríamos contexto.
        <Navbar userRole="encargado" centerId={centerId} /> 
      */}
      <Navbar />

      <div className="center-header">
        <h2>
          Gestionando: {currentCenter ? currentCenter.name : `Centro ${centerId}`}
        </h2>
        {/* Esta es nuestra Sub-Navegación temporal */}
        <nav className="center-subnav">
          <Link to={`/center/${centerId}/inventory`}>Inventario</Link>
          <Link to={`/center/${centerId}/needs`}>Solicitudes / Incidencias</Link>
        </nav>
      </div>

      <main className="center-main-area">
        {/* Aquí se renderizarán las páginas de Inventario y Solicitudes */}
        <Outlet />
      </main>
    </div>
  );
};

export default CenterLayout;