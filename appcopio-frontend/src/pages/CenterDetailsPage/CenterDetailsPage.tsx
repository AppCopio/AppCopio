import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import OperationalStatusControl from '../../components/center/OperationalStatusControl';
import './CenterDetailsPage.css';

interface CenterDetails {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  capacity: number;
  is_active: boolean;
  operational_status?: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima';
  public_note?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  fullnessPercentage?: number;
}

interface Resource {
  item_id: string;
  name: string;
  category: string;
  quantity: number;
}

const CenterDetailsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [center, setCenter] = useState<CenterDetails | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingOperationalStatus, setIsUpdatingOperationalStatus] = useState<boolean>(false);

useEffect(() => {
  const fetchCenterDetails = async () => {
    if (!centerId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Obtener detalles del centro
      const centerResponse = await fetch(`http://localhost:4000/api/centers/${centerId}`);
      if (!centerResponse.ok) {
        throw new Error('Error al obtener los detalles del centro');
      }
      const centerData = await centerResponse.json();
      setCenter(centerData);

      // 2. Obtener inventario del centro
      const resourcesResponse = await fetch(`http://localhost:4000/api/centers/${centerId}/inventory`);
      if (resourcesResponse.ok) {
        const resourcesData = await resourcesResponse.json();
        setResources(resourcesData);
      } else {
        console.warn('No se pudo cargar el inventario del centro.');
        setResources([]);
      }
    } catch (err) {
      console.error('Error al cargar los detalles del centro:', err);

      // Fallback offline
      if ('serviceWorker' in navigator && !navigator.onLine) {
        try {
          const offlineData = localStorage.getItem(`center_${centerId}`);
          if (offlineData) {
            const parsedData = JSON.parse(offlineData);
            setCenter(parsedData.center);
            setResources(parsedData.resources || []);
          }
        } catch (parseErr) {
          console.error('Error al leer datos offline:', parseErr);
        }
      } else {
        setError('No se pudieron cargar los detalles actualizados. Revisa tu conexión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  fetchCenterDetails();
}, [centerId]);

  useEffect(() => {
    if (center && centerId) {
      const dataToStore = {
        center,
        resources,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`center_${centerId}`, JSON.stringify(dataToStore));
    }
  }, [center, resources, centerId]);

  const handleToggleStatus = async () => {
    if (!center || !centerId) return;

    const newStatus = !center.is_active;

    try {
      const response = await fetch(`http://localhost:4000/api/centers/${centerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar el estado del centro');
      }

      setCenter(prev => prev ? { ...prev, is_active: newStatus } : null);
    } catch (err) {
      console.error('Error al actualizar el estado:', err);
      alert('No se pudo actualizar el estado del centro');
    }
  };

  const handleOperationalStatusChange = async (newStatus: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima', publicNote?: string) => {
    if (!center || !centerId) return;

    setIsUpdatingOperationalStatus(true);

    try {
      const response = await fetch(`http://localhost:4000/api/centers/${centerId}/operational-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          operationalStatus: newStatus,
          publicNote: publicNote || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo actualizar el estado operativo');
      }

      const result = await response.json();
      setCenter(prev => prev ? { 
        ...prev, 
        operational_status: newStatus,
        public_note: newStatus === 'Cerrado Temporalmente' ? publicNote : undefined
      } : null);
      
      if (center && centerId) {
        const dataToStore = {
          center: { ...center, operational_status: newStatus },
          resources,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(`center_${centerId}`, JSON.stringify(dataToStore));
      }

      alert(`Estado operativo actualizado a "${newStatus}" exitosamente`);
    } catch (err) {
      console.error('Error al actualizar el estado operativo:', err);
      
      if ('serviceWorker' in navigator && !navigator.onLine) {
        setCenter(prev => prev ? { ...prev, operational_status: newStatus } : null);
        
        const pendingActions = JSON.parse(localStorage.getItem('pending_actions') || '[]');
        pendingActions.push({
          type: 'update_operational_status',
          centerId,
          operationalStatus: newStatus,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('pending_actions', JSON.stringify(pendingActions));
        
        alert('Estás sin conexión. El cambio se sincronizará cuando vuelvas a tener internet.');
      } else {
        alert(err instanceof Error ? err.message : 'No se pudo actualizar el estado operativo');
      }
    } finally {
      setIsUpdatingOperationalStatus(false);
    }
  };

  const groupedResources = resources.reduce((acc, resource) => {
    if (!acc[resource.category]) {
      acc[resource.category] = [];
    }
    acc[resource.category].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Activo' : 'Inactivo';
  };

  const getStatusClass = (isActive: boolean) => {
    return isActive ? 'status-active' : 'status-inactive';
  };

  const getOperationalStatusClass = (status: string) => {
    switch (status) {
      case 'Abierto':
        return 'operational-open';
      case 'Cerrado Temporalmente':
        return 'operational-closed';
      case 'Capacidad Máxima':
        return 'operational-full';
      default:
        return 'operational-unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="center-details-container">
        <div className="loading">Cargando detalles del centro...</div>
      </div>
    );
  }

  if (error || !center) {
    return (
      <div className="center-details-container">
        <div className="error-message">
          {error || 'Centro no encontrado'}
        </div>
        <button onClick={() => navigate(-1)} className="back-button">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="center-details-container">
      <div className="center-details-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Volver
        </button>
        <h1>Detalles del Centro</h1>
        <Link to={`/admin/centers/${centerId}/edit`} className="edit-button">
            Editar Detalles
        </Link>
      </div>

      <div className="center-details-content">
        <div className="center-info-section">
          <div className="center-basic-info">
            <h2>{center.name}</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Dirección:</label>
                <span>{center.address}</span>
              </div>
              <div className="info-item">
                <label>Tipo:</label>
                <span className={`type-badge ${center.type.toLowerCase()}`}>
                  {center.type}
                </span>
              </div>
              <div className="info-item">
                <label>Capacidad:</label>
                <span>{center.capacity} personas</span>
              </div>
              <div className="info-item">
                <label>Estado Actual:</label>
                <span className={`status-badge ${getStatusClass(center.is_active)}`}>
                  {getStatusText(center.is_active)}
                </span>
              </div>
              {center.fullnessPercentage !== undefined && (
                <div className="info-item">
                  <label>Nivel de Abastecimiento:</label>
                  <span className="fullness-percentage">
                    {center.fullnessPercentage.toFixed(1)}%
                  </span>
                </div>
              )}
              {center.operational_status && (
                <div className="info-item">
                  <label>Estado Operativo:</label>
                  <span className={`operational-status-badge ${getOperationalStatusClass(center.operational_status)}`}>
                    {center.operational_status}
                  </span>
                </div>
              )}
              {center.operational_status === 'Cerrado Temporalmente' && center.public_note && (
                <div className="info-item">
                  <label>Información adicional:</label>
                  <div className="public-note-display">
                    {center.public_note}
                  </div>
                </div>
              )}
            </div>

            {user?.role === 'Encargado' && center.operational_status && (
              <OperationalStatusControl
                centerId={centerId!}
                currentStatus={center.operational_status}
                currentNote={center.public_note}
                onStatusChange={handleOperationalStatusChange}
                isUpdating={isUpdatingOperationalStatus}
              />
            )}

            {user?.role === 'Emergencias' && (
              <div className="admin-controls">
                <button 
                  onClick={handleToggleStatus}
                  className={`status-toggle-btn ${center.is_active ? 'deactivate' : 'activate'}`}
                >
                  {center.is_active ? 'Desactivar Centro' : 'Activar Centro'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="resources-section">
          <h3>Recursos Disponibles</h3>
          {Object.keys(groupedResources).length === 0 ? (
            <div className="no-resources">
              <p>No hay recursos registrados en este centro.</p>
            </div>
          ) : (
            <div className="resources-grid">
              {Object.entries(groupedResources).map(([category, items]) => (
                <div key={category} className="resource-category">
                  <h4>{category}</h4>
                  <div className="resource-items">
                    {items.map(item => (
                      <div key={item.item_id} className="resource-item">
                        <span className="resource-name">{item.name}</span>
                        <span className="resource-quantity">{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="responsible-section">
          <h3>Responsable</h3>
          <div className="responsible-info">
            <p>Por definir en futuras versiones</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CenterDetailsPage;