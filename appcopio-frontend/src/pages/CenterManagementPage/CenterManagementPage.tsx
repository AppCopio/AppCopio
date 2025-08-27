// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchWithAbort } from '../../services/api';
import OfflineCentersView from '../../components/offline/OfflineCentersView';
import './CenterManagementPage.css';

// La interfaz del Centro ha sido extendida para incluir nuevas propiedades.
export interface Center {
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
  fullnessPercentage?: number;
  municipal_manager_name?: string;
  community_charge_name?: string;
}

// Componente para el interruptor de estado.
const StatusSwitch: React.FC<{ center: Center; onToggle: (id: string) => void; canEdit: boolean }> = ({ center, onToggle, canEdit }) => {
  if (!canEdit) {
    return (
      <span className={`status-readonly ${center.is_active ? 'active' : 'inactive'}`}>
        {center.is_active ? '🟢 Activo' : '🔴 Inactivo'}
      </span>
    );
  }

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  // Estados del componente
  const [centers, setCenters] = useState<Center[]>([]); // Lista maestra de centros
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]); // Lista para mostrar
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  
  // Estados para los filtros
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [communeFilter, setCommuneFilter] = useState<string>('todos');

  // Efecto para detectar el estado de la conexión (online/offline).
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Efecto para la carga inicial de datos. Ya incluye el AbortController.
  useEffect(() => {
    const controller = new AbortController();

    const loadCenters = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchWithAbort<Center[]>(`${apiUrl}/centers`, controller.signal);
        setCenters(data);
        // Guardar en localStorage para uso offline.
        localStorage.setItem('centers_list', JSON.stringify({ data, lastUpdated: new Date().toISOString() }));
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error("Error al obtener los centros:", err);
          // Si falla la red, intenta cargar desde el caché local.
          try {
            const offlineData = localStorage.getItem('centers_list');
            if (offlineData) {
              const parsedData = JSON.parse(offlineData);
              setCenters(parsedData.data || []);
              setError(null); // Borra el error de red si se cargan datos de caché
            }
          } catch (offlineError) {
            console.error('Error al cargar datos offline:', offlineError);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
            setIsLoading(false);
        }
      }
    };

    loadCenters();

    return () => {
      controller.abort();
    };
  }, [apiUrl]);

  // Efecto que aplica los filtros cada vez que cambian los datos maestros o los filtros.
  useEffect(() => {
    let filtered = centers;

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(center => center.is_active === (statusFilter === 'activo'));
    }
    if (typeFilter !== 'todos') {
      filtered = filtered.filter(center => center.type === typeFilter);
    }
    if (locationFilter.trim() !== '') {
      filtered = filtered.filter(center => 
        center.address.toLowerCase().includes(locationFilter.toLowerCase()) ||
        center.name.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    if (communeFilter !== 'todos') {
      filtered = filtered.filter(center => {
        const address = center.address.toLowerCase();
        const name = center.name.toLowerCase();
        switch (communeFilter) {
          case 'valparaiso':
            return address.includes('valparaíso') || address.includes('valparaiso') || name.includes('valparaíso') || name.includes('valparaiso');
          case 'vina':
            return address.includes('viña del mar') || address.includes('vina del mar');
          case 'concon':
            return address.includes('concón') || address.includes('concon');
          case 'cerro_playa':
            return address.includes('playa ancha') || address.includes('playa');
          case 'cerro_cordillera':
            return address.includes('cordillera');
          case 'cerro_alegre':
            return address.includes('alegre') || name.includes('alegre');
          case 'cerro_concepcion':
            return address.includes('concepción') || address.includes('concepcion');
          case 'cerro_baron':
            return address.includes('barón') || address.includes('baron');
          default:
            return true;
        }
      });
    }

    setFilteredCenters(filtered);
  }, [centers, statusFilter, typeFilter, locationFilter, communeFilter]);

  // Función para cambiar el estado de un centro, con manejo offline.
  const handleToggleActive = async (id: string) => {
    const centerToToggle = centers.find(center => center.center_id === id);
    if (!centerToToggle) return;
    const newStatus = !centerToToggle.is_active;

    // Actualización optimista de la UI
    const updatedCenters = centers.map(center =>
        center.center_id === id ? { ...center, is_active: newStatus } : center
    );
    setCenters(updatedCenters);

    try {
      const response = await fetch(`${apiUrl}/centers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (!response.ok) throw new Error('Falló la actualización en el servidor.');
      // Si la petición es exitosa, se actualiza el caché.
      localStorage.setItem('centers_list', JSON.stringify({ data: updatedCenters, lastUpdated: new Date().toISOString() }));
    } catch (err) {
      console.error('Error al actualizar el estado del centro:', err);
      // Si el error es por estar offline, se encola la acción.
      if (!navigator.onLine) {
        const pendingActions = JSON.parse(localStorage.getItem('pending_actions') || '[]');
        pendingActions.push({
          type: 'update_center_status',
          url: `${apiUrl}/centers/${id}/status`,
          method: 'PATCH',
          body: { isActive: newStatus },
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('pending_actions', JSON.stringify(pendingActions));
        alert('Sin conexión. El cambio se aplicará cuando la recuperes.');
      } else {
        // Si hay otro error, se revierte el cambio y se notifica.
        setCenters(centers); // Revertir la actualización optimista
        alert('No se pudo actualizar el centro. Por favor, inténtelo de nuevo.');
      }
    }
  };

  const handleShowInfo = (id: string) => {
    navigate(`/center/${id}/details`);
  };

  const clearFilters = () => {
    setStatusFilter('todos');
    setTypeFilter('todos');
    setLocationFilter('');
    setCommuneFilter('todos');
  };

  // Verificar permisos de usuario
  const canEditCenterStatus = user?.role_name === 'Trabajador Municipal' || user?.role_name === 'Administrador' || user?.es_apoyo_admin;

  // --- Renderizado del Componente ---

  if (isLoading) {
    return <div className="center-management-container">Cargando centros...</div>;
  }
  
  if (isOffline && centers.length === 0 && !error) {
    return <OfflineCentersView title="Gestión de Centros (Sin Conexión)" showFilters={false} />;
  }

  if (error && centers.length === 0) {
    return <div className="center-management-container error-message">Error: {error}</div>;
  }

  return (
    // ... Tu JSX sin cambios ...
    <div className="center-management-container">
        <h1>Gestión de Centros y Albergues</h1>
        <p>Aquí puedes ver y administrar el estado de los centros del catastro municipal.</p>

        <div className="filters-section">
            <h3>Filtros</h3>
            <div className="filters-grid">
                <div className="filter-group">
                    <label htmlFor="status-filter">Estado:</label>
                    <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="todos">Todos los estados</option>
                        <option value="activo">Activos</option>
                        <option value="inactivo">Inactivos</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="type-filter">Tipo:</label>
                    <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="todos">Todos los tipos</option>
                        <option value="Acopio">Acopio</option>
                        <option value="Albergue">Albergue</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="commune-filter">Comuna/Cerro:</label>
                    <select id="commune-filter" value={communeFilter} onChange={(e) => setCommuneFilter(e.target.value)}>
                        <option value="todos">Todas las ubicaciones</option>
                        <optgroup label="Comunas">
                            <option value="valparaiso">Valparaíso</option>
                            <option value="vina">Viña del Mar</option>
                            <option value="concon">Concón</option>
                        </optgroup>
                        <optgroup label="Cerros de Valparaíso">
                            <option value="cerro_playa">Playa Ancha</option>
                            <option value="cerro_cordillera">Cordillera</option>
                            <option value="cerro_alegre">Alegre</option>
                            <option value="cerro_concepcion">Concepción</option>
                            <option value="cerro_baron">Barón</option>
                        </optgroup>
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="location-filter">Buscar:</label>
                    <input id="location-filter" type="text" placeholder="Buscar por dirección o nombre..." value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
                </div>
                <div className="filter-actions">
                    <button onClick={clearFilters} className="clear-filters-btn">Limpiar Filtros</button>
                </div>
            </div>
        </div>

        <div className="results-info">
            <p>Mostrando {filteredCenters.length} de {centers.length} centros{isOffline && <span className="offline-indicator"> (Modo sin conexión)</span>}</p>
        </div>

        <ul className="center-list">
            {filteredCenters.length === 0 ? (
                <li className="no-results"><p>No se encontraron centros que coincidan con los filtros aplicados.</p></li>
            ) : (
                filteredCenters.map(center => (
                    <li key={center.center_id} className={`center-item ${center.is_active ? 'item-active' : 'item-inactive'}`}>
                        <div className="center-info">
                            <h3>{center.name}</h3>
                            <p className="center-address">{center.address} ({center.type})</p>
                            <div className="center-status-info">
                                <span className={`activity-status ${center.is_active ? 'active' : 'inactive'}`}>
                                    {center.is_active ? '🟢 Activo' : '🔴 Inactivo'}
                                </span>
                                {center.operational_status && center.is_active && (
                                    <span className={`operational-status ${center.operational_status.toLowerCase().replace(' ', '-')}`}>
                                        {center.operational_status === 'Abierto' && '✅'}
                                        {center.operational_status === 'Cerrado Temporalmente' && '⏸️'}
                                        {center.operational_status === 'Capacidad Máxima' && '🚫'}
                                        {' '}{center.operational_status}
                                    </span>
                                )}
                            </div>
                            {center.operational_status === 'Cerrado Temporalmente' && center.public_note && (
                                <p className="public-note">
                                    <strong>Nota:</strong> {center.public_note}
                                </p>
                            )}
                            {center.fullnessPercentage !== undefined && (
                                <p className="fullness-info">
                                    📦 Abastecimiento: {center.fullnessPercentage.toFixed(1)}%
                                </p>
                            )}
                        </div>
                        <div className="center-actions">
                            <Link to={`/center/${center.center_id}/inventory`} className="inventory-btn">Gestionar</Link>
                            <button className="info-button" onClick={() => handleShowInfo(center.center_id)}>Ver Detalles</button>
                            <StatusSwitch center={center} onToggle={handleToggleActive} canEdit={canEditCenterStatus || false} />
                        </div>
                    </li>
                ))
            )}
        </ul>
    </div>
  );
};

export default CenterManagementPage;