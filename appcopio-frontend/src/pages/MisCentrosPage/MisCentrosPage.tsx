// src/pages/MisCentrosPage/MisCentrosPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchWithAbort } from '../../services/api';
import './MisCentrosPage.css';

// Usamos la misma interfaz que ya tenemos definida en otras partes
interface Center {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  is_active: boolean;
  operational_status?: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima';
  public_note?: string;
  fullnessPercentage?: number;
}

const MisCentrosPage: React.FC = () => {
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [assignedCenters, setAssignedCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay usuario, no hacemos nada.
    if (!user) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadCentersDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Obtenemos todos los centros
        const allCenters = await fetchWithAbort<Center[]>(`${apiUrl}/centers`, controller.signal);
        
        // Para simplificar por ahora, mostramos todos los centros
        // TODO: Implementar filtrado por centros asignados al usuario cuando esté disponible en la API
        setAssignedCenters(allCenters || []);

      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Error al cargar detalles de los centros:", err);
          setError("No se pudieron cargar los datos de los centros.");
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
  }, [user, apiUrl]);

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
          No hay centros disponibles actualmente.
        </p>
      ) : (
        <ul className="mis-centros-list">
          {assignedCenters.map(center => (
            <li key={center.center_id} className="centro-card">
              <div className="card-header">
                <h3>{center.name}</h3>
                <span className={`status-pill ${
                  (center.operational_status === 'Cerrado Temporalmente' || !center.is_active)
                    ? 'closed'  // Cerrado (rojo) si está cerrado temporalmente O inactivo
                    : 'active'  // Activo (verde) en cualquier otro caso
                }`}>
                  {(center.operational_status === 'Cerrado Temporalmente' || !center.is_active)
                    ? 'Cerrado'  
                    : 'Activo'}
                </span>
              </div>
              <div className="card-body">
                <p><strong>Dirección:</strong> {center.address}</p>
                <p><strong>Tipo:</strong> {center.type}</p>
                <p><strong>Estado Operativo:</strong> 
                  <span className={`operational-status-badge ${
                    (!center.is_active || center.operational_status === 'Cerrado Temporalmente')
                      ? 'cerrado-temporalmente'
                      : center.operational_status 
                        ? center.operational_status.toLowerCase().replace(' ', '-')
                        : 'abierto'
                  }`}>
                    {(!center.is_active || center.operational_status === 'Cerrado Temporalmente')
                      ? 'CERRADO TEMPORALMENTE'
                      : center.operational_status || 'ABIERTO'}
                  </span>
                </p>
                {(center.operational_status === 'Cerrado Temporalmente' || !center.is_active) && center.public_note && (
                  <p><strong>Nota:</strong> <em>{center.public_note}</em></p>
                )}
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