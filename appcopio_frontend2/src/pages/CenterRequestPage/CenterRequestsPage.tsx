// src/pages/CenterRequestsPage/CenterRequestsPage.tsx
import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  createUpdateRequest, 
  listUpdates, 
  patchUpdateRequest 
} from "@/services/updates.service";
import { listActiveUsersByRole } from "@/services/users.service";
import type { UpdateRequest, UpdateStatus, UpdateCreateDTO } from "@/types/update";
import type { User as WorkerUser } from "@/types/user";
import {
  Add as AddIcon,
  List as ListIcon,
  Refresh as RefreshIcon,
  AssignmentTurnedIn as AssignIcon
} from '@mui/icons-material';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import "./CenterRequestsPage.css";

const ROLE_ID_TMO = 2;
const PAGE_SIZE = 10;

export default function CenterRequestsPage() {
  const { user } = useAuth();
  const { centerId } = useParams<{ centerId: string }>();
  
  // Estados para el formulario de creación
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("Media");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Estados para la lista de solicitudes
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [filter, setFilter] = useState<UpdateStatus>("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Filtros adicionales
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Modal de gestión
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UpdateRequest | null>(null);
  const [assignedWorkerId, setAssignedWorkerId] = useState<string>("");
  const [resolutionComment, setResolutionComment] = useState<string>("");
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  // Permisos
  const isAdmin = !!user && (user.role_id === 1 || user.es_apoyo_admin === true);
  const isMunicipalWorker = !!user && user.role_id === 2 && !user.es_apoyo_admin;

  // Cargar solicitudes
  const loadRequests = useCallback(
    async (signal: AbortSignal) => {
      if (!user) {
        setListError("Por favor, inicie sesión.");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setListError(null);
        
        const userCentersOnly = isMunicipalWorker ? user.user_id : undefined;
        
        const data = await listUpdates({ 
          status: filter, 
          page, 
          limit: PAGE_SIZE, 
          centerId, 
          userCentersOnly,
          signal 
        });
        setRequests(data.requests ?? []);
        setTotal(data.total ?? 0);
      } catch (err: any) {
        if (err?.name !== "AbortError" && err?.name !== "CanceledError") {
          setListError("Error al cargar las solicitudes.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user, filter, page, centerId, isMunicipalWorker]
  );

  // Cargar trabajadores (solo para admin)
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await listActiveUsersByRole(ROLE_ID_TMO, controller.signal);
        setWorkers(data);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Error cargando trabajadores:", err);
        }
      }
    })();
    return () => controller.abort();
  }, [isAdmin]);

  // Cargar solicitudes al cambiar filtros
  useEffect(() => {
    const controller = new AbortController();
    loadRequests(controller.signal);
    return () => controller.abort();
  }, [loadRequests]);

  // Handler para crear solicitud
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !centerId) {
      setCreateError("Error inesperado: datos de usuario o centro no disponibles.");
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const payload: UpdateCreateDTO = {
        center_id: centerId,
        title: title.trim(),
        description: description.trim(),
        urgency,
        created_by: user.user_id,
        status: "pending",
      };

      await createUpdateRequest(payload);
      
      // Limpiar formulario y recargar lista
      setTitle("");
      setDescription("");
      setUrgency("Media");
      setShowCreateForm(false);
      loadRequests(new AbortController().signal);
      
      alert("¡Solicitud registrada con éxito!");
    } catch (err: any) {
      const msg =
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.message ||
        "Error desconocido.";
      setCreateError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para abrir modal de gestión
  const handleOpenModal = (request: UpdateRequest) => {
    setSelectedRequest(request);
    setAssignedWorkerId(request.assigned_to_name?.toString() || "");
    setResolutionComment(request.resolution_comment || "");
    setIsModalOpen(true);
  };

  // Handler para gestionar solicitud
  const handleModalSubmit = async (newStatus: UpdateStatus) => {
    if (!selectedRequest) return;

    setIsModalSubmitting(true);
    try {
      await patchUpdateRequest(selectedRequest.request_id, {
        status: newStatus,
        assigned_to_user: assignedWorkerId ? Number(assignedWorkerId) : undefined,
        resolution_comment: resolutionComment || undefined,
      });

      setIsModalOpen(false);
      loadRequests(new AbortController().signal);
    } catch (err: any) {
      alert("Error al actualizar la solicitud.");
    } finally {
      setIsModalSubmitting(false);
    }
  };

  // Filtrado y ordenamiento en frontend
  const filteredAndSortedRequests = React.useMemo(() => {
    let filtered = requests;
    if (selectedCenter !== "all") {
      filtered = filtered.filter((r) => r.center_name === selectedCenter);
    }
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.registered_at).getTime();
      const dateB = new Date(b.registered_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [requests, selectedCenter, sortOrder]);

  // Paginación en frontend
  const paginatedRequests = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSortedRequests.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedRequests, page]);

  const pageCount = Math.ceil(filteredAndSortedRequests.length / PAGE_SIZE);

  return (
    <div className="center-requests-container">
      {/* Header con botón de refrescar */}
      <div className="requests-header">
        <h2>Gestión de Solicitudes de Actualización</h2>
        <Tooltip title="Actualizar datos">
          <IconButton 
            onClick={() => loadRequests(new AbortController().signal)}
            size="small"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </div>

      {/* Tarjetas de acciones principales */}
      <div className="requests-cards">
        {/* Tarjeta: Crear Solicitud */}
        <div 
          className="request-card create-card"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <div className="card-icon create-icon">
            <AddIcon fontSize="large" />
          </div>
          <div className="card-content">
            <h4>Crear Nueva Solicitud</h4>
            <p className="card-sublabel">
              {showCreateForm ? "Ocultar formulario" : "Reportar necesidad o actualización"}
            </p>
          </div>
        </div>

        {/* Tarjeta: Ver Solicitudes */}
        <div className="request-card list-card">
          <div className="card-icon list-icon">
            <ListIcon fontSize="large" />
          </div>
          <div className="card-content">
            <h4>Solicitudes Registradas</h4>
            <div className="card-sublabel">
              <span className="stat-number">{filteredAndSortedRequests.length}</span>
              <span className="stat-label">solicitudes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de creación (expandible) */}
      {showCreateForm && (
        <div className="create-form-section">
          <h3>Nueva Solicitud de Actualización</h3>
          <form onSubmit={handleCreateSubmit} className="request-form">
            <div className="form-group">
              <label htmlFor="title">Título *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Se necesitan pañales y leche"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción *</label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles, cantidades, urgencia..."
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="urgency">Nivel de Urgencia *</label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowCreateForm(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
              </button>
            </div>

            {createError && <p className="error-message">{createError}</p>}
          </form>
        </div>
      )}

      {/* Lista de solicitudes */}
      <div className="requests-list-section">
        <div className="list-header">
          <h3>Estado de Solicitudes</h3>
          
          {requests.length > 0 && (
            <div className="results-summary">
              Mostrando {filteredAndSortedRequests.length} de {requests.length} solicitudes
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="filter-controls">
          <div className="status-filters">
            <button 
              onClick={() => {setFilter("pending"); setPage(1);}} 
              className={filter === "pending" ? "active" : ""}
            >
              Pendientes
            </button>
            <button 
              onClick={() => {setFilter("approved"); setPage(1);}} 
              className={filter === "approved" ? "active" : ""}
            >
              Aprobadas
            </button>
            <button 
              onClick={() => {setFilter("rejected"); setPage(1);}} 
              className={filter === "rejected" ? "active" : ""}
            >
              Rechazadas
            </button>
            {isAdmin && (
              <button 
                onClick={() => {setFilter("canceled"); setPage(1);}} 
                className={filter === "canceled" ? "active" : ""}
              >
                Canceladas
              </button>
            )}
          </div>

          <div className="sort-controls">
            <label>Ordenar:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}>
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguas</option>
            </select>
          </div>
        </div>

        {/* Tabla de solicitudes */}
        {isLoading ? (
          <div className="loading-state">Cargando solicitudes...</div>
        ) : listError ? (
          <div className="error-state">{listError}</div>
        ) : paginatedRequests.length === 0 ? (
          <div className="empty-state">
            No hay solicitudes {filter === "pending" ? "pendientes" : filter} en este momento.
          </div>
        ) : (
          <>
            <div className="requests-table-wrapper">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Centro</th>
                    <th>Título</th>
                    <th>Urgencia</th>
                    <th>Solicitado por</th>
                    {isAdmin && <th>Asignado a</th>}
                    <th>Estado</th>
                    {isAdmin && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((req) => (
                    <tr key={req.request_id}>
                      <td>{new Date(req.registered_at).toLocaleDateString("es-CL")}</td>
                      <td>{req.center_name || "N/A"}</td>
                      <td className="title-cell">
                        <strong>{req.description}</strong>
                        <br />
                        <small>{req.description}</small>
                      </td>
                      <td>
                        <span className={`urgency-badge urgency-${req.urgency?.toLowerCase()}`}>
                          {req.urgency}
                        </span>
                      </td>
                      <td>{req.requested_by_name || "Desconocido"}</td>
                      {isAdmin && (
                        <td>{req.assigned_to_name || "Sin asignar"}</td>
                      )}
                      <td>
                        <span className={`status-badge status-${req.status}`}>
                          {req.status === "pending" ? "Pendiente" : 
                           req.status === "approved" ? "Aprobada" : 
                           req.status === "rejected" ? "Rechazada" : "Cancelada"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          {req.status === "pending" && (
                            <button 
                              className="btn-icon"
                              onClick={() => handleOpenModal(req)}
                              title="Gestionar solicitud"
                            >
                              <AssignIcon />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pageCount > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </button>
                <span>Página {page} de {pageCount}</span>
                <button 
                  onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de gestión (solo para admin) */}
      {isModalOpen && selectedRequest && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Gestionar Solicitud</h3>
            
            <div className="modal-info">
              <p><strong>Título:</strong> {selectedRequest.requested_by_name}</p>
              <p><strong>Descripción:</strong> {selectedRequest.description}</p>
              <p><strong>Urgencia:</strong> {selectedRequest.urgency}</p>
            </div>

            <div className="form-group">
              <label>Asignar a:</label>
              <select 
                value={assignedWorkerId}
                onChange={(e) => setAssignedWorkerId(e.target.value)}
                disabled={isModalSubmitting}
              >
                <option value="">Sin asignar</option>
                {workers.map((w) => (
                  <option key={w.user_id} value={w.user_id}>
                    {w.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Comentario de resolución:</label>
              <textarea
                rows={3}
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                placeholder="Opcional: agregar comentarios..."
                disabled={isModalSubmitting}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isModalSubmitting}
              >
                Cancelar
              </button>
              <button 
                className="btn-success"
                onClick={() => handleModalSubmit("approved")}
                disabled={isModalSubmitting}
              >
                Aprobar
              </button>
              <button 
                className="btn-danger"
                onClick={() => handleModalSubmit("rejected")}
                disabled={isModalSubmitting}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}