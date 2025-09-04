// src/pages/MisCentrosPage/MisCentrosPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchWithAbort } from '../../services/api';
import { getUser } from '../../services/usersApi'; 
import './MisCentrosPage.css';

// Usamos la misma interfaz que ya tenemos definida en otras partes
interface Center {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  is_active: boolean;
  fullnessPercentage?: number;
}

const MisCentrosPage: React.FC = () => {
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [assignedCenters, setAssignedCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.user_id) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadCentersDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fullUser = await getUser(user.user_id, controller.signal);

        if (!fullUser.assignedCenters || fullUser.assignedCenters.length === 0) {
          setAssignedCenters([]);
          return;
        }

        const allCenters = await fetchWithAbort<Center[]>(
          `${apiUrl}/centers`,
          controller.signal
        );

        const userCenters = (allCenters || []).filter(center =>
          fullUser.assignedCenters.includes(center.center_id)
        );

        setAssignedCenters(userCenters);

      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Error al cargar detalles de los centros:", err);
          setError("No se pudieron cargar los datos de los centros asignados.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadCentersDetails();

    return () => {
      controller.abort();
    };
  }, [user?.user_id, apiUrl]);

  if (isLoading) {
    return <div className="mis-centros-container">Cargando tus centros asignados...</div>;
  }

  if (error) {
    return <div className="mis-centros-container error-message">{error}</div>;
  }

  return (
    <div className="mis-centros-container">
      <h1>Mis Centros Asignados</h1>
      <p>Selecciona un centro para ver sus detalles y gestionar su inventario.</p>
      
      {assignedCenters.length === 0 ? (
        <p className="no-centers-message">
          No tienes ningún centro asignado actualmente. Por favor, contacta a un administrador.
        </p>
      ) : (
        <ul className="mis-centros-list">
          {assignedCenters.map(center => (
            <li key={center.center_id} className="centro-card">
              <div className="card-header">
                <h3>{center.name}</h3>
                <span className={`status-pill ${center.is_active ? 'active' : 'inactive'}`}>
                  {center.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="card-body">
                <p><strong>Dirección:</strong> {center.address}</p>
                <p><strong>Tipo:</strong> {center.type}</p>
              </div>
              <div className="card-actions">
                <Link to={`/center/${center.center_id}/inventory`} className="action-button manage-btn">
                  Gestionar Inventario
                </Link>
                <Link to={`/center/${center.center_id}/details`} className="action-button details-btn">
                  Ver Detalles
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MisCentrosPage;
