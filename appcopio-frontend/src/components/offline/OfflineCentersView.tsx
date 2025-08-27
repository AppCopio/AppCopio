// src/components/offline/OfflineCentersView.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './OfflineCentersView.css';

interface Center {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  capacity: number;
  is_active: boolean;
  operational_status?: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima';
  public_note?: string;
  fullnessPercentage?: number;
  municipal_manager_name?: string;
  community_charge_name?: string;
}

interface OfflineCentersViewProps {
  title?: string;
  showFilters?: boolean;
}

const OfflineCentersView: React.FC<OfflineCentersViewProps> = ({ 
  title = "Centros (Modo Sin Conexión)", 
  showFilters = true 
}) => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [communeFilter, setCommuneFilter] = useState<string>('todos');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    // Cargar datos desde localStorage
    const loadOfflineData = () => {
      try {
        const offlineData = localStorage.getItem('centers_list');
        if (offlineData) {
          const parsedData = JSON.parse(offlineData);
          setCenters(parsedData.data || []);
          setFilteredCenters(parsedData.data || []);
          setLastUpdated(parsedData.lastUpdated || '');
        }
      } catch (error) {
        console.error('Error al cargar datos offline:', error);
      }
    };

    loadOfflineData();
  }, []);

  // Efecto para aplicar filtros
  useEffect(() => {
    if (!showFilters) {
      setFilteredCenters(centers);
      return;
    }

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

    // Filtro por ubicación
    if (locationFilter.trim() !== '') {
      filtered = filtered.filter(center => 
        center.address.toLowerCase().includes(locationFilter.toLowerCase()) ||
        center.name.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Filtro por comuna/cerro
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
  }, [centers, statusFilter, typeFilter, locationFilter, communeFilter, showFilters]);

  const clearFilters = () => {
    setStatusFilter('todos');
    setTypeFilter('todos');
    setLocationFilter('');
    setCommuneFilter('todos');
  };

  const formatLastUpdated = (dateString: string) => {
    if (!dateString) return 'Desconocida';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Desconocida';
    }
  };

  return (
    <div className="offline-centers-container">
      <div className="offline-header">
        <h2>{title}</h2>
        <div className="offline-status">
          <span className="offline-badge">Sin conexión</span>
          <p>Última actualización: {formatLastUpdated(lastUpdated)}</p>
        </div>
      </div>

      {showFilters && (
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
                <option value="Acopio">Acopio</option>
                <option value="Albergue">Albergue</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="commune-filter">Comuna/Cerro:</label>
              <select 
                id="commune-filter"
                value={communeFilter} 
                onChange={(e) => setCommuneFilter(e.target.value)}
              >
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
      )}

      <div className="results-info">
        <p>Mostrando {filteredCenters.length} de {centers.length} centros</p>
      </div>

      {filteredCenters.length === 0 ? (
        <div className="no-centers">
          <p>No hay centros disponibles offline.</p>
          <p>Conecta a internet para sincronizar los datos más recientes.</p>
        </div>
      ) : (
        <ul className="centers-list">
          {filteredCenters.map(center => (
            <li key={center.center_id} className={`center-item ${center.is_active ? 'item-active' : 'item-inactive'}`}>
              <div className="center-info">
                <h4>{center.name}</h4>
                <p className="center-address">{center.address}</p>
                <div className="center-meta">
                  <span className={`type-badge ${center.type.toLowerCase()}`}>
                    {center.type}
                  </span>
                  <span className={`status-badge ${center.is_active ? 'active' : 'inactive'}`}>
                    {center.is_active ? '🟢 Activo' : '🔴 Inactivo'}
                  </span>
                  {center.operational_status && center.is_active && (
                    <span className={`operational-status-badge ${center.operational_status.toLowerCase().replace(' ', '-')}`}>
                      {center.operational_status === 'Abierto' && '✅'}
                      {center.operational_status === 'Cerrado Temporalmente' && '⏸️'}
                      {center.operational_status === 'Capacidad Máxima' && '🚫'}
                      {' '}{center.operational_status}
                    </span>
                  )}
                  {center.fullnessPercentage !== undefined && (
                    <span className="fullness-badge">
                      📦 {center.fullnessPercentage.toFixed(1)}% abastecido
                    </span>
                  )}
                </div>
                {center.operational_status === 'Cerrado Temporalmente' && center.public_note && (
                  <div className="public-note-offline">
                    <strong>Nota:</strong> {center.public_note}
                  </div>
                )}
              </div>
              <div className="center-actions">
                <Link 
                  to={`/center/${center.center_id}/details`} 
                  className="details-btn"
                >
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

export default OfflineCentersView;
