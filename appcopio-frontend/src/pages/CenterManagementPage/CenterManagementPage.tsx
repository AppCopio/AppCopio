// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchWithAbort } from '../../services/api'; //  1. IMPORTAMOS EL SERVICIO
import './CenterManagementPage.css';

// La interfaz Center y el componente StatusSwitch se mantienen igual
export interface Center {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  capacity: number;
  is_active: boolean;
}

const StatusSwitch: React.FC<{ center: Center; onToggle: (id: string) => void }> = ({ center, onToggle }) => {
  return (
    <label className="switch">
      <input 
        type="checkbox" 
        checked={center.is_active} 
        onChange={() => onToggle(center.center_id)} 
      />
      <span className="slider round"></span>
    </label>
  );
};


const CenterManagementPage: React.FC = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL; // Usamos la variable de entorno

  //  2. USEEFFECT ACTUALIZADO CON EL PATRÓN ABORTCONTROLLER
  useEffect(() => {
    const controller = new AbortController();

    const loadCenters = async () => {
      // Reiniciamos el estado por si acaso (útil para futuras recargas)
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWithAbort<Center[]>(
          `${apiUrl}/centers`, 
          controller.signal
        );
        setCenters(data);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error("Error al obtener los centros:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCenters();

    // La función de limpieza que previene la race condition y memory leaks
    return () => {
      controller.abort();
    };
  }, [apiUrl]); // Añadimos apiUrl a las dependencias por buena práctica

  // La función para activar/desactivar se mantiene igual
  const handleToggleActive = async (id: string) => {
    const centerToToggle = centers.find(center => center.center_id === id);
    if (!centerToToggle) return;

    const newStatus = !centerToToggle.is_active;

    try {
      const response = await fetch(`${apiUrl}/centers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        throw new Error('El servidor no pudo actualizar el estado del centro.');
      }
      
      setCenters(prevCenters =>
        prevCenters.map(center =>
          center.center_id === id ? { ...center, is_active: newStatus } : center
        )
      );
    } catch (err) {
      console.error('Error al actualizar el estado del centro:', err);
      alert('No se pudo actualizar el centro. Por favor, inténtelo de nuevo.');
    }
  };

  const handleShowInfo = (id: string) => {
    alert(`Mostrar información del centro ${id}`);
  };

  if (isLoading) {
    return <div className="center-management-container">Cargando centros desde la base de datos...</div>;
  }

  if (error) {
    return <div className="center-management-container error-message">Error: {error}</div>;
  }

  return (
    <div className="center-management-container">
      <h1>Gestión de Centros y Albergues</h1>
      <p>Aquí puedes ver y administrar el estado de los centros del catastro municipal.</p>

      <ul className="center-list">
        {centers.map(center => (
          <li key={center.center_id} className={`center-item ${center.is_active ? 'item-active' : 'item-inactive'}`}>
            <div className="center-info">
              <h3>{center.name}</h3>
              <p>{center.address} ({center.type})</p>
            </div>
            <div className="center-actions">
              <Link 
                to={`/center/${center.center_id}/inventory`} 
                className="inventory-btn"
              >
                Gestionar
              </Link>
              <button 
                className="info-button" 
                onClick={() => handleShowInfo(center.center_id)}
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