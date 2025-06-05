// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect } from 'react';
// YA NO NECESITAMOS LOS DATOS SIMULADOS, ASÍ QUE BORRAMOS ESA IMPORTACIÓN
// import { potentialCentersData } from '../../data/potentialCenters';
import './CenterManagementPage.css';

// 1. Definimos la interfaz para que coincida con los datos de la API
export interface Center {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  capacity: number;
  is_active: boolean;
}

// El componente del Switch sigue siendo útil, no necesita cambios
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
  // 2. Creamos estados para los centros, el estado de carga y posibles errores
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Usamos useEffect para llamar a la API cuando el componente se monta
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/centers');
        if (!response.ok) {
          throw new Error('Error en la respuesta de la red');
        }
        const data: Center[] = await response.json();
        setCenters(data); // Guardamos los datos reales en nuestro estado
      } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Ocurrió un error desconocido');
        }
        console.error("Error al obtener los centros:", err);
      } finally {
        setIsLoading(false); // Dejamos de cargar, ya sea con éxito o con error
      }
    };

    fetchCenters();
  }, []); // El array vacío [] asegura que esto se ejecute solo una vez

  // El resto de las funciones (handleToggleActive, handleShowInfo) siguen siendo válidas
  // aunque handleToggleActive ahora modifica el estado local. Más adelante,
  // esta función también hará una llamada PATCH a la API.
  const handleToggleActive = (id: string) => {
    setCenters(prevCenters =>
      prevCenters.map(center =>
        center.center_id === id ? { ...center, is_active: !center.is_active } : center
      )
    );
    // TODO: En el siguiente paso, aquí se llamaría a la API PATCH /api/centers/:id/status
    console.log(`Cambiado estado (localmente) del centro ${id}`);
  };

  const handleShowInfo = (id: string) => {
    alert(`Mostrar información del centro ${id}`);
  };

  // 4. Mostramos un mensaje mientras se cargan los datos
  if (isLoading) {
    return <div className="center-management-container">Cargando centros desde la base de datos...</div>;
  }

  // 5. Mostramos un mensaje de error si la llamada a la API falló
  if (error) {
    return <div className="center-management-container error-message">Error: {error}</div>;
  }

  // 6. Si todo salió bien, mostramos la lista con los datos reales
  return (
    <div className="center-management-container">
      <h1>Gestión de Centros y Albergues</h1>
      <p>Esta lista muestra el catastro de centros directamente desde la base de datos para planificar la respuesta en caso de emergencias. [cite: 142]</p>

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