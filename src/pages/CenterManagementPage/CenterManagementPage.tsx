// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState } from 'react';
import { potentialCentersData, type Center } from '../../data/potentialCenters';
import './CenterManagementPage.css';

// Un componente simple para el 'Switch'
const StatusSwitch: React.FC<{ center: Center; onToggle: (id: string) => void }> = ({ center, onToggle }) => {
  return (
    <label className="switch">
      <input 
        type="checkbox" 
        checked={center.isActive} 
        onChange={() => onToggle(center.id)} 
      />
      <span className="slider round"></span>
      <span className="switch-label">{center.isActive ? 'Activo' : 'Inactivo'}</span>
    </label>
  );
};


const CenterManagementPage: React.FC = () => {
  // Usamos useState para poder modificar la lista (activar/desactivar)
  const [centers, setCenters] = useState<Center[]>(potentialCentersData);

  // Función para cambiar el estado de un centro
  const handleToggleActive = (id: string) => {
    setCenters(prevCenters =>
      prevCenters.map(center =>
        center.id === id ? { ...center, isActive: !center.isActive } : center
      )
    );
    // TODO: En el futuro, aquí se llamaría a la API para actualizar el estado en la BD.
    console.log(`Cambiado estado del centro ${id}`);
  };

  const handleShowInfo = (id: string) => {
    // TODO: Implementar lógica para mostrar más información (modal, otra página, etc.)
    alert(`Mostrar información del centro ${id}`);
  };

  return (
    <div className="center-management-container">
      <h1>Gestión de Centros y Albergues</h1>
      <p>Aquí puedes ver y administrar el estado de los centros del catastro municipal.</p>

      <ul className="center-list">
        {centers.map(center => (
          <li key={center.id} className={`center-item ${center.isActive ? 'item-active' : 'item-inactive'}`}>
            <div className="center-info">
              <h3>{center.name}</h3>
              <p>{center.address} ({center.type})</p>
            </div>
            <div className="center-actions">
              <button 
                className="info-button" 
                onClick={() => handleShowInfo(center.id)}
              >
                Información
              </button>
              <StatusSwitch center={center} onToggle={handleToggleActive} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CenterManagementPage;