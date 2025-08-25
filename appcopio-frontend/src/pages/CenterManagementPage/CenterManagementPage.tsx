// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OfflineCentersView from '../../components/offline/OfflineCentersView';
import './CenterManagementPage.css';

// La interfaz Center y el componente StatusSwitch se mantienen igual
export interface Center {
  center_id: string;
  name: string;
  address: string;
  type: 'Centro de Acopio' | 'Hospital de Campaña' | 'Refugio';
  capacity: number;
  is_active: boolean;
  operational_status?: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima';
  public_note?: string;
  latitude?: number;
  longitude?: number;
  fullnessPercentage?: number;
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
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  
  // Estados para filtros
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [locationFilter, setLocationFilter] = useState<string>('');

  // Detectar cambios en el estado de conexión
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

  // La función para obtener los datos iniciales se mantiene igual
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/centers');
        if (!response.ok) throw new Error('Error en la respuesta de la red');
        const data: Center[] = await response.json();
        setCenters(data);
        setFilteredCenters(data);
        
        // Guardar en almacenamiento offline
        localStorage.setItem('centers_list', JSON.stringify({
          data,
          lastUpdated: new Date().toISOString()
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
        console.error("Error al obtener los centros:", err);
        
        // Intentar cargar desde almacenamiento offline
        if ('serviceWorker' in navigator && !navigator.onLine) {
          try {
            const offlineData = localStorage.getItem('centers_list');
            if (offlineData) {
              const parsedData = JSON.parse(offlineData);
              setCenters(parsedData.data || []);
              setFilteredCenters(parsedData.data || []);
              setError(null);
            }
          } catch (offlineError) {
            console.error('Error al cargar datos offline:', offlineError);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchCenters();
  }, []);

  // Efecto para aplicar filtros
  useEffect(() => {
    let filtered = [...centers];

    // Filtro por estado
    if (statusFilter !== 'todos') {
      const isActive = statusFilter === 'activo';
      filtered = filtered.filter(center => center.is_active === isActive);
    }

    // Filtro por tipo
    if (typeFilter !== 'todos') {
      filtered = filtered.filter(center => center.type === typeFilter);
    }

    // Filtro por ubicación (búsqueda en dirección)
    if (locationFilter.trim() !== '') {
      filtered = filtered.filter(center => 
        center.address.toLowerCase().includes(locationFilter.toLowerCase()) ||
        center.name.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredCenters(filtered);
  }, [centers, statusFilter, typeFilter, locationFilter]);

  // La función para activar/desactivar se mantiene igual
  const handleToggleActive = async (id: string) => {
    const centerToToggle = centers.find(center => center.center_id === id);
    if (!centerToToggle) return;

    const newStatus = !centerToToggle.is_active;

    try {
      const response = await fetch(`http://localhost:4000/api/centers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        throw new Error('El servidor no pudo actualizar el estado del centro.');
      }
      
      const updatedCenters = centers.map(center =>
        center.center_id === id ? { ...center, is_active: newStatus } : center
      );
      setCenters(updatedCenters);
      
      // Actualizar almacenamiento offline
      localStorage.setItem('centers_list', JSON.stringify({
        data: updatedCenters,
        lastUpdated: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error al actualizar el estado del centro:', err);
      
      // Si estamos offline, guardamos la acción para sincronizar después
      if ('serviceWorker' in navigator && !navigator.onLine) {
        // Actualizar localmente para UX inmediata
        const updatedCenters = centers.map(center =>
          center.center_id === id ? { ...center, is_active: newStatus } : center
        );
        setCenters(updatedCenters);
        
        // Guardar acción pendiente para sincronización
        const pendingActions = JSON.parse(localStorage.getItem('pending_actions') || '[]');
        pendingActions.push({
          type: 'update_center_status',
          centerId: id,
          isActive: newStatus,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('pending_actions', JSON.stringify(pendingActions));
        
        alert('Estás sin conexión. El cambio se sincronizará cuando vuelvas a tener internet.');
      } else {
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
  };

  // Si estamos offline y tenemos datos, mostrar la vista offline
  if (isOffline && centers.length > 0) {
    return (
      <OfflineCentersView 
        title="Gestión de Centros (Sin Conexión)"
        showFilters={true}
      />
    );
  }

  if (isLoading) {
    return <div className="center-management-container">Cargando centros desde la base de datos...</div>;
  }

  if (error && centers.length === 0) {
    return (
      <div className="center-management-container error-message">
        Error: {error}
        {!navigator.onLine && (
          <p>Parece que estás sin conexión. Algunos datos pueden no estar actualizados.</p>
        )}
      </div>
    );
  }

  return (
    <div className="center-management-container">
      <h1>Gestión de Centros y Albergues</h1>
      <p>Aquí puedes ver y administrar el estado de los centros del catastro municipal.</p>

      {/* Sección de filtros */}
      <div className="filters-section">
        <h3>Filtros</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="status-filter">Estado:</label>
            <select 
              id="status-filter"
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="type-filter">Tipo:</label>
            <select 
              id="type-filter"
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="todos">Todos los tipos</option>
              <option value="Centro de Acopio">Centro de Acopio</option>
              <option value="Hospital de Campaña">Hospital de Campaña</option>
              <option value="Refugio">Refugio</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="location-filter">Ubicación (Comuna/Cerro):</label>
            <input
              id="location-filter"
              type="text"
              placeholder="Buscar por dirección o nombre..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <button onClick={clearFilters} className="clear-filters-btn">
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Información de resultados */}
      <div className="results-info">
        <p>
          Mostrando {filteredCenters.length} de {centers.length} centros
          {!navigator.onLine && (
            <span className="offline-indicator"> (Modo sin conexión)</span>
          )}
        </p>
      </div>

      <ul className="center-list">
        {filteredCenters.length === 0 ? (
          <li className="no-results">
            <p>No se encontraron centros que coincidan con los filtros aplicados.</p>
          </li>
        ) : (
          filteredCenters.map(center => (
            <li key={center.center_id} className={`center-item ${center.is_active ? 'item-active' : 'item-inactive'}`}>
              <div className="center-info">
                <h3>{center.name}</h3>
                <p>{center.address} ({center.type})</p>
                {center.fullnessPercentage !== undefined && (
                  <p className="fullness-info">
                    Abastecimiento: {center.fullnessPercentage.toFixed(1)}%
                  </p>
                )}
              </div>
              {/* --- SECCIÓN DE ACCIONES MODIFICADA --- */}
              <div className="center-actions">
                {/* 1. BOTÓN/ENLACE AÑADIDO */}
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
                  Ver Detalles
                </button>
                <StatusSwitch center={center} onToggle={handleToggleActive} />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default CenterManagementPage;