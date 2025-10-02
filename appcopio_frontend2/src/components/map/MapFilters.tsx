import * as React from 'react';
import type { Center } from '@/types/center';
import './MapFilters.css';

export interface OperationalStatusFilters {
  showOpen: boolean;
  showTemporarilyClosed: boolean;
  showMaxCapacity: boolean;
}

export interface MapFiltersProps {
  onStatusFiltersChange: (filters: OperationalStatusFilters) => void;
  onLocationRequest: () => void;
  statusFilters: OperationalStatusFilters;
  isLocationLoading: boolean;
  hasUserLocation: boolean;
  locationError: string | null;
  totalCenters: number;
  filteredCenters: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

/**
 * Componente de filtros para el mapa
 * Permite filtrar centros por estado operativo individual y solicitar ubicación del usuario
 * Incluye funcionalidad de colapso para maximizar la vista del mapa
 */
export default function MapFilters({
  onStatusFiltersChange,
  onLocationRequest,
  statusFilters,
  isLocationLoading,
  hasUserLocation,
  locationError,
  totalCenters,
  filteredCenters,
  isCollapsed = false,
  onToggleCollapse,
}: MapFiltersProps) {
  const [internalCollapsed, setInternalCollapsed] = React.useState(isCollapsed);
  
  // Usar estado interno si no se proporciona control externo
  const collapsed = onToggleCollapse ? isCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || ((newState: boolean) => setInternalCollapsed(newState));

  const handleStatusFilterChange = (filterType: keyof OperationalStatusFilters) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newFilters = {
      ...statusFilters,
      [filterType]: event.target.checked,
    };
    onStatusFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const allFilters: OperationalStatusFilters = {
      showOpen: true,
      showTemporarilyClosed: true,
      showMaxCapacity: true,
    };
    onStatusFiltersChange(allFilters);
  };

  const hasActiveFilters = !statusFilters.showOpen || 
                          !statusFilters.showTemporarilyClosed || 
                          !statusFilters.showMaxCapacity;

  const handleToggleClick = () => {
    const newCollapsedState = !collapsed;
    toggleCollapse(newCollapsedState);
    
    // Guardar estado en localStorage
    try {
      localStorage.setItem('mapFilters_collapsed', String(newCollapsedState));
    } catch (error) {
      console.warn('No se pudo guardar el estado de colapso:', error);
    }
  };

  return (
    <div className={`map-filters ${collapsed ? 'collapsed' : 'expanded'}`}>
      {/* Botón de toggle siempre visible */}
      <div className="filters-toggle">
        <button
          className="toggle-btn"
          onClick={handleToggleClick}
          title={collapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
        >
          <span className="toggle-icon">
            {collapsed ? '📍' : '✕'}
          </span>
          <span className="toggle-text">
            {collapsed ? 'Filtros' : 'Ocultar'}
          </span>
          {collapsed && hasActiveFilters && (
            <span className="active-filters-dot">●</span>
          )}
        </button>
        
        {collapsed && (
          <div className="collapsed-summary">
            <span className="collapsed-count">
              {filteredCenters}/{totalCenters}
            </span>
          </div>
        )}
      </div>

      {/* Contenido desplegable */}
      <div className={`filters-content ${collapsed ? 'hidden' : 'visible'}`}>
        <div className="filters-header">
          <h3>Filtros del Mapa</h3>
          <button
            className="clear-filters-btn"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            title="Mostrar todos los estados operativos"
          >
            Mostrar Todos
          </button>
        </div>

        <div className="filter-section">
          <h4 className="filter-section-title">Estado Operativo</h4>
          
          <div className="filter-item">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={statusFilters.showOpen}
                onChange={handleStatusFilterChange('showOpen')}
              />
              <span className="checkmark checkmark-green"></span>
              <span className="filter-label">
                <span className="status-indicator status-open">🟢</span>
                Abiertos
              </span>
            </label>
          </div>

          <div className="filter-item">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={statusFilters.showTemporarilyClosed}
                onChange={handleStatusFilterChange('showTemporarilyClosed')}
              />
              <span className="checkmark checkmark-gray"></span>
              <span className="filter-label">
                <span className="status-indicator status-closed">🔘</span>
                Cerrados Temporalmente
              </span>
            </label>
          </div>

          <div className="filter-item">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={statusFilters.showMaxCapacity}
                onChange={handleStatusFilterChange('showMaxCapacity')}
              />
              <span className="checkmark checkmark-red"></span>
              <span className="filter-label">
                <span className="status-indicator status-full">🔴</span>
                Capacidad Máxima
              </span>
            </label>
          </div>

          <div className="filter-description">
            <small>Selecciona qué tipos de centros mostrar en el mapa</small>
          </div>
        </div>

        <div className="filter-section location-section">
          <h4>Tu Ubicación</h4>
          <button
            className={`location-btn ${hasUserLocation ? 'has-location' : ''}`}
            onClick={onLocationRequest}
            disabled={isLocationLoading}
          >
            {isLocationLoading ? (
              <span className="loading-spinner">⟳</span>
            ) : hasUserLocation ? (
              '📍 Ubicación Obtenida'
            ) : (
              '📍 Obtener Mi Ubicación'
            )}
          </button>
          
          {locationError && (
            <div className="location-error">
              <small>{locationError}</small>
            </div>
          )}
          
          {hasUserLocation && (
            <div className="location-info">
              <small>✅ Los centros más cercanos están destacados</small>
            </div>
          )}
        </div>

        <div className="filter-results">
          <div className="results-info">
            {hasActiveFilters ? (
              <span>
                Mostrando {filteredCenters} de {totalCenters} centros
              </span>
            ) : (
              <span>Mostrando todos los {totalCenters} centros</span>
            )}
          </div>
          
          {hasActiveFilters && (
            <div className="active-filters-summary">
              <small>
                Filtros activos: {' '}
                {statusFilters.showOpen && <span className="filter-tag">Abiertos</span>}
                {statusFilters.showTemporarilyClosed && <span className="filter-tag">Cerrados</span>}
                {statusFilters.showMaxCapacity && <span className="filter-tag">Cap. Máxima</span>}
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
