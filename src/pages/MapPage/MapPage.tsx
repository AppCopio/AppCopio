// src/pages/MapPage/MapPage.tsx
import React from 'react';
import './MapPage.css'; // Crearemos este archivo pronto

const MapPage: React.FC = () => {
  return (
    <div className="map-container">
        <h2>Mapa Interactivo de Centros y Albergues</h2>
        <p>Aquí se visualizará el mapa con la geolocalización de los centros. [cite: 75]</p>
        {/* Aquí irá el componente del mapa real */}
        <div className="map-placeholder">
            MAPA AQUÍ
        </div>
    </div>
  );
};

export default MapPage;