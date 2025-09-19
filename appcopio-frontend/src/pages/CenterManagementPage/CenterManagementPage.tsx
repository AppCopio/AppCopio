// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api'; // 1. Usamos nuestro cliente API centralizado para TODO
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
}

// Componente para el interruptor de estado.
const StatusSwitch: React.FC<{ center: Center; onToggle: (id: string) => void; disabled: boolean }> = ({ center, onToggle, disabled }) => {
  return (
    <label className="switch">
      <input 
        type="checkbox" 
        checked={center.is_active} 
        onChange={() => onToggle(center.center_id)} 
        disabled={disabled} // 2. Usamos la propiedad 'disabled' aquí.
      />
      <span className="slider round"></span>
    </label>
  );
};

const CenterManagementPage: React.FC = () => {
  // 2. Obtenemos 'isAuthLoading' para proteger la UI contra race conditions
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

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

  //Estados para la lógica de eliminación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<string | null>(null);

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

  const fetchCenters = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);
    try {
      // 3. Estandarizamos la carga de datos con nuestro apiClient
      const response = await api.get<Center[]>('/centers');
      setCenters(response.data);
    } catch (err) {
      setError('No se pudieron cargar los centros. Puede que estés viendo datos desactualizados.');
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, []);

    // Efecto para la carga inicial de datos.
    useEffect(() => {
        fetchCenters();
    }, [fetchCenters]);

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

    setFilteredCenters(filtered);
  }, [centers, statusFilter, typeFilter, locationFilter]);

  // Función para cambiar el estado de un centro, con manejo offline.
  const handleToggleActive = useCallback(async (id: string) => {
    const originalCenters = [...centers];
    const centerToToggle = centers.find(c => c.center_id === id);
    if (!centerToToggle) return;

    const newStatus = !centerToToggle.is_active;

    // Actualización optimista de la UI
    setCenters(prev => prev.map(c => c.center_id === id ? { ...c, is_active: newStatus } : c));

    try {
      // Llamamos a la API para actualizar el estado del centro
      await api.patch(`/centers/${id}/status`, { 
        isActive: newStatus, 
        userId: user?.user_id  // Asegúrate de que el userId esté presente
      });

      // Si el centro se desactiva, se actualiza la activación en la base de datos
      if (!newStatus) {
        await api.patch(`/centers/${id}/status`, { 
          isActive: false,
          userId: user?.user_id  // Aquí también pasamos el userId
        });
      }
    } catch (err) {
      console.log("Acción registrada para ejecución offline por el plugin de Workbox.");
      alert('Estás sin conexión. El cambio se aplicará automáticamente cuando recuperes la conexión.');
      // No revertimos la UI aquí, confiamos en la sincronización de Workbox.
    }
  }, [centers, user]);


  //LÓGICA DE ELIMINACIÓN 
  const handleDeleteClick = (centerId: string) => {
        setCenterToDelete(centerId);
        setIsModalOpen(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!centerToDelete) return;
    
    const originalCenters = [...centers];
    const centerIdToDelete = centerToDelete;

    // Actualización optimista
    setCenters(prev => prev.filter(center => center.center_id !== centerIdToDelete));
    setIsModalOpen(false);
    setCenterToDelete(null);

    try {
      await api.delete(`/centers/${centerIdToDelete}`);
    } catch (err) {
      console.log("Acción de eliminación registrada para ejecución offline.");
      alert('Estás sin conexión. El centro se eliminará automáticamente cuando recuperes la conexión.');
    }
  }, [centerToDelete, centers]);  

  const handleCancelDelete = () => {
      setIsModalOpen(false);
      setCenterToDelete(null);
  };

  const handleShowInfo = (id: string) => {
    navigate(`/center/${id}/details`);
  };

  const clearFilters = () => {
    setStatusFilter('todos');
    setTypeFilter('todos');
    setLocationFilter('');
  };

  // --- Renderizado del Componente ---

  if (isLoading || isAuthLoading) {
    return <div className="center-management-container">Cargando...</div>;
  }
 
  return (
    <div className="center-management-container">
        <div className="centers-header">
            <h1 className="ds-titlePage">Gestión de Centros y Albergues</h1>
            {/* El botón ahora está dentro del nuevo contenedor */}
            {(user?.es_apoyo_admin || user?.role_id === 1) === true && (
                <Link 
                    to={!isAuthLoading ? "/admin/centers/new" : "#"} 
                    className={`add-center-btn ${isAuthLoading ? 'disabled-link' : ''}`}
                >
                    + Registrar Nuevo Centro
                </Link>
            )}
        </div>
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
                    <label htmlFor="location-filter">Ubicación:</label>
                    <input id="location-filter" type="text" placeholder="Buscar por dirección o nombre..." value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
                </div>
                <div className="filter-actions">
                    <button onClick={clearFilters} className="clear-filters-btn">Limpiar Filtros</button>
                </div>
            </div>
        </div>

        <div className="results-info">
          <p>Mostrando {filteredCenters.length} de {centers.length} centros
            {!navigator.onLine && <span className="offline-indicator"> (Modo sin conexión)</span>}
          </p> 
        </div>

        <ul className="center-list">
            {filteredCenters.length === 0 ? (
                <li className="no-results"><p>No se encontraron centros que coincidan con los filtros aplicados.</p></li>
            ) : (
                filteredCenters.map(center => (
                    <li key={center.center_id} className={`center-item ${center.is_active ? 'item-active' : 'item-inactive'}`}>
                        <div className="center-info">
                            <h3>{center.name}</h3>
                            <p>{center.address} ({center.type})</p>
                            {center.fullnessPercentage !== undefined && (
                                <p className="fullness-info">Abastecimiento: {center.fullnessPercentage.toFixed(1)}%</p>
                            )}
                        </div>
                        <div className="center-actions">
                            <Link to={`/center/${center.center_id}/inventory`} className={`inventory-btn ${isAuthLoading ? 'disabled-link' : ''}`}>Gestionar</Link>
                            <button className="info-button" onClick={() => handleShowInfo(center.center_id)} disabled={isAuthLoading}>Ver Detalles</button>
                            
                            {/* Pasamos 'isAuthLoading' para deshabilitar el switch mientras carga la sesión */}
                            <StatusSwitch center={center} onToggle={handleToggleActive} disabled={isAuthLoading} />
                            
                            <Link to={`/admin/centers/${center.center_id}/edit`} className={`edit-btn ${isAuthLoading ? 'disabled-link' : ''}`}>Editar</Link>
                            
                            {user?.es_apoyo_admin === true && (
                                <button onClick={() => handleDeleteClick(center.center_id)} className="delete-btn" disabled={isAuthLoading}>
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </li>
                ))
            )}
        </ul>
        {isModalOpen && (
          <div className="modal-backdrop">
              <div className="modal-content">
                  <h2>Confirmar Eliminación</h2>
                  <p>¿Estás seguro de que deseas eliminar el centro con ID: **{centerToDelete}**? Esta acción es irreversible y eliminará todos los datos relacionados.</p>
                  <div className="modal-actions">
                      {/* El botón de confirmación también se deshabilita */}
                      <button onClick={handleConfirmDelete} className="confirm-btn" disabled={isAuthLoading}>Sí, eliminar</button>
                      <button onClick={handleCancelDelete} className="cancel-btn" disabled={isAuthLoading}>Cancelar</button>
                  </div>
              </div>
          </div>
        )}
    </div>
  );
};

export default CenterManagementPage;