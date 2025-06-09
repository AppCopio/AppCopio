// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect } from 'react';
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
      <span className="switch-label">{center.is_active ? 'Activo' : 'Inactivo'}</span>
    </label>
  );
};


const CenterManagementPage: React.FC = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // La función para obtener los datos iniciales se mantiene igual
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/centers');
        if (!response.ok) throw new Error('Error en la respuesta de la red');
        const data: Center[] = await response.json();
        setCenters(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
        console.error("Error al obtener los centros:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCenters();
  }, []);

  // --- ¡AQUÍ ESTÁ EL CAMBIO IMPORTANTE! ---
  // Hacemos que la función sea 'async' para poder usar 'await'
  const handleToggleActive = async (id: string) => {
    // 1. Encontramos el centro en nuestro estado actual para saber cuál será su nuevo estado
    const centerToToggle = centers.find(center => center.center_id === id);
    if (!centerToToggle) return; // Si no lo encuentra, no hace nada

    const newStatus = !centerToToggle.is_active;

    try {
      // 2. Hacemos la llamada a la API con el método PATCH
      const response = await fetch(`http://localhost:4000/api/centers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }), // Enviamos el nuevo estado en el cuerpo
      });

      if (!response.ok) {
        // Si la API devuelve un error, lo lanzamos para que lo capture el 'catch'
        throw new Error('El servidor no pudo actualizar el estado del centro.');
      }

      // 3. Si la API respondió OK, actualizamos nuestro estado local para que la UI refleje el cambio
      setCenters(prevCenters =>
        prevCenters.map(center =>
          center.center_id === id ? { ...center, is_active: newStatus } : center
        )
      );

    } catch (err) {
      console.error('Error al actualizar el estado del centro:', err);
      // Podríamos mostrar una alerta al usuario
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