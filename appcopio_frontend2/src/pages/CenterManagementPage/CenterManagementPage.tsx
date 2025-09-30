// src/pages/CenterManagementPage/CenterManagementPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import "./CenterManagementPage.css";

import { Center } from "@/types/center";
import { listCenters, updateCenterStatus, deleteCenter } from "@/services/centers.service";

const StatusSwitch: React.FC<{
  center: Center;
  onToggle: (id: string) => void;
  disabled: boolean;
}> = ({ center, onToggle, disabled }) => {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={center.is_active}
        onChange={() => onToggle(center.center_id)}
        disabled={disabled}
      />
      <span className="slider round"></span>
    </label>
  );
};

const CenterManagementPage: React.FC = () => {
  const { user, loadingAuth: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // Estados del componente
  const [centers, setCenters] = useState<Center[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [locationFilter, setLocationFilter] = useState<string>("");

  // Eliminación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<string | null>(null);

  const fetchCenters = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);
    try {
      const data = await listCenters();
      setCenters(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "No se pudieron cargar los centros.");
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  useEffect(() => {
    let filtered = centers;

    if (statusFilter !== "todos") {
      filtered = filtered.filter((center) => center.is_active === (statusFilter === "activo"));
    }
    if (typeFilter !== "todos") {
      filtered = filtered.filter((center) => center.type === (typeFilter as Center["type"]));
    }
    if (locationFilter.trim() !== "") {
      const q = locationFilter.toLowerCase();
      filtered = filtered.filter((center) => {
        const addr = (center.address ?? "").toString().toLowerCase();
        const name = (center.name ?? "").toLowerCase();
        return addr.includes(q) || name.includes(q);
      });
    }

    setFilteredCenters(filtered);
  }, [centers, statusFilter, typeFilter, locationFilter]);

  const handleToggleActive = useCallback(
    async (id: string) => {
      const snapshot = [...centers];
      const target = centers.find((c) => c.center_id === id);
      if (!target) return;

      const newStatus = !target.is_active;
      // Optimista
      setCenters((prev) => prev.map((c) => (c.center_id === id ? { ...c, is_active: newStatus } : c)));

      try {
        if (typeof user?.user_id === "number") {
          await updateCenterStatus(id, newStatus, user.user_id);
        } else {
          throw new Error("No se pudo obtener el ID de usuario para actualizar el estado del centro.");
        }
      } catch (err: any) {
        // Revertir si falla
        setCenters(snapshot);
        window.alert(err?.response?.data?.message || err?.message || "No se pudo actualizar el estado del centro.");
      }
    },
    [centers, user]
  );

  // Eliminación
  const handleDeleteClick = (centerId: string) => {
    setCenterToDelete(centerId);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!centerToDelete) return;
    const snapshot = [...centers];

    // Optimista
    setCenters((prev) => prev.filter((c) => c.center_id !== centerToDelete));
    setIsModalOpen(false);
    setCenterToDelete(null);

    try {
      await deleteCenter(centerToDelete);
    } catch (err: any) {
      // Revertir si falla
      setCenters(snapshot);
      window.alert(err?.response?.data?.message || err?.message || "No se pudo eliminar el centro.");
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
    setStatusFilter("todos");
    setTypeFilter("todos");
    setLocationFilter("");
  };

  if (isLoading || isAuthLoading) {
    return <div className="center-management-container">Cargando...</div>;
  }

  return (
    <div className="center-management-container">
      <div className="centers-header">
        <h1 className="ds-titlePage">Gestión de Centros y Albergues</h1>
        {(user?.es_apoyo_admin || (user as any)?.role_id === 1) === true && (
          <Link
            to={!isAuthLoading ? "/admin/centers/new" : "#"}
            className={`add-center-btn ${isAuthLoading ? "disabled-link" : ""}`}
          >
            + Registrar Nuevo Centro
          </Link>
        )}
      </div>

      <p>Aquí puedes ver y administrar el estado de los centros del catastro municipal.</p>

      {error && <div className="error-box" style={{ margin: "8px 0 16px" }}>{error}</div>}

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

      <div className="results-info">
        <p>
          Mostrando {filteredCenters.length} de {centers.length} centros
        </p>
      </div>

      <ul className="center-list">
        {filteredCenters.length === 0 ? (
          <li className="no-results">
            <p>No se encontraron centros que coincidan con los filtros aplicados.</p>
          </li>
        ) : (
          filteredCenters.map((center) => (
            <li key={center.center_id} className={`center-item ${center.is_active ? "item-active" : "item-inactive"}`}>
              <div className="center-info">
                <h3>{center.name}</h3>
                <p>
                  {center.address} ({center.type})
                </p>
                {typeof center.fullnessPercentage === "number" && (
                  <p className="fullness-info">Abastecimiento: {center.fullnessPercentage.toFixed(1)}%</p>
                )}
              </div>
              <div className="center-actions">
                <Link
                  to={`/center/${center.center_id}/inventory`}
                  className={`inventory-btn ${isAuthLoading ? "disabled-link" : ""}`}
                >
                  Gestionar
                </Link>
                <button className="info-button" onClick={() => handleShowInfo(center.center_id)} disabled={isAuthLoading}>
                  Ver Detalles
                </button>

                <StatusSwitch center={center} onToggle={handleToggleActive} disabled={isAuthLoading} />

                <Link
                  to={`/admin/centers/${center.center_id}/edit`}
                  className={`edit-btn ${isAuthLoading ? "disabled-link" : ""}`}
                >
                  Editar
                </Link>

                {user?.es_apoyo_admin === true && (
                  <button
                    onClick={() => handleDeleteClick(center.center_id)}
                    className="delete-btn"
                    disabled={isAuthLoading}
                  >
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
            <p>
              ¿Estás seguro de que deseas eliminar el centro con ID: <strong>{centerToDelete}</strong>? Esta acción es
              irreversible y eliminará todos los datos relacionados.
            </p>
            <div className="modal-actions">
              <button onClick={handleConfirmDelete} className="confirm-btn" disabled={isAuthLoading}>
                Sí, eliminar
              </button>
              <button onClick={handleCancelDelete} className="cancel-btn" disabled={isAuthLoading}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterManagementPage;
