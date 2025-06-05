// src/pages/MapPage/MapPage.tsx
import React from 'react';
import MapComponent from '../../components/map/MapComponent'; // <-- 1. IMPORTA el componente del mapa

const MapPage: React.FC = () => {
  return (  
    <div>
      {/* 2. RENDERIZA el componente del mapa. 
         No se necesita nada más (ni títulos, ni placeholders). */}
      <MapComponent />
    </div>
  );
};

export default MapPage;