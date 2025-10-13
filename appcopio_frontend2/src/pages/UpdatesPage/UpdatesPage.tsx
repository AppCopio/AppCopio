import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { listUpdates, patchUpdateRequest} from "@/services/updates.service";
import { listActiveUsersByRole} from "@/services/users.service";
import type { UpdateRequest, UpdateStatus } from "@/types/update";
import type {User as WorkerUser } from "@/types/user";
import { paths } from "@/routes/paths";
import "./UpdatesPage.css";

// IDs de roles (ajusta si cambian)
const ROLE_ID_TMO = 2;

// Para mantener la misma paginación
const PAGE_SIZE = 10;

export default function UpdatesPage() {
  const { user } = useAuth();
  const { centerId } = useParams<{ centerId?: string }>();
  const navigate = useNavigate();

  // --- Estado ---
  const [requests, setRequests] = React.useState<UpdateRequest[]>([]);
  const [workers, setWorkers] = React.useState<WorkerUser[]>([]);
  const [filter, setFilter] = React.useState<UpdateStatus>("pending");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filtros adicionales (frontend)
  const [selectedCenter, setSelectedCenter] = React.useState<string>("all");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  // Modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<UpdateRequest | null>(null);
  const [assignedWorkerId, setAssignedWorkerId] = React.useState<string>("");
  const [resolutionComment, setResolutionComment] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Permisos: Solo admin (role_id=1) o apoyo admin pueden gestionar todo
  const isAdmin = !!user && (user.role_id === 1 || user.es_apoyo_admin === true);
  // Trabajador municipal sin privilegios de apoyo
  const isMunicipalWorker = !!user && user.role_id === 2 && !user.es_apoyo_admin;

  // ---- Carga de solicitudes (con AbortController) ----
  const loadRequests = React.useCallback(
    async (signal: AbortSignal) => {
      if (!user) {
        setError("Por favor, inicie sesión.");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        
        // Si es trabajador municipal (sin apoyo admin), mostrar actualizaciones de sus centros asignados
        // Si es admin, mostrar todas las actualizaciones sin filtros adicionales
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
      } catch (e: any) {
        if (signal.aborted) return;
        setError("No se pudieron cargar las solicitudes. Intente más tarde.");
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [user, filter, page, centerId, isMunicipalWorker]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    loadRequests(controller.signal);
    return () => controller.abort();
  }, [loadRequests]);

  // ---- Carga de trabajadores (solo admin) ----
  
  React.useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    const fetchWorkers = async () => {
        try {
            
            const workerData = await listActiveUsersByRole(ROLE_ID_TMO, controller.signal);
            setWorkers(workerData);
        } catch (err) {
           
            console.error("Error fetching active workers:", err);
            setError("No se pudo cargar la lista de trabajadores.");
        }
    };
    fetchWorkers();
    return () => controller.abort();
}, [isAdmin]);



  // ---- Modal helpers ----
  const openManageModal = (req: UpdateRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const closeManageModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setAssignedWorkerId("");
    setResolutionComment("");
  };

  // Navegar a los detalles del centro
  const handleCenterClick = (centerId: string) => {
    if (centerId && centerId.trim()) {
      navigate(paths.center.details(centerId));
    }
  };

  // Filtrar y ordenar requests en el frontend
  const filteredAndSortedRequests = React.useMemo(() => {
    let filtered = [...requests];

    // Filtro por centro
    if (selectedCenter !== "all") {
      filtered = filtered.filter(req => req.center_name === selectedCenter);
    }

    // Ordenamiento por fecha
    filtered.sort((a, b) => {
      const dateA = new Date(a.registered_at).getTime();
      const dateB = new Date(b.registered_at).getTime();
      
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [requests, selectedCenter, sortOrder]);

  // Obtener lista única de centros para el dropdown
  const availableCenters = React.useMemo(() => {
    const uniqueCenters = [...new Set(requests.map(req => req.center_name))];
    return uniqueCenters.sort();
  }, [requests]);

  // ---- Acciones: asignar / aprobar / rechazar ----
  const handleUpdateRequest = async (action: "assign" | "approve" | "reject") => {
    if (!selectedRequest) return;
    
    // Solo admins pueden asignar
    if (action === "assign" && !isAdmin) return;
    
    // Trabajadores y admins pueden aprobar/rechazar
    if (!isAdmin && !isMunicipalWorker) return;

    // Validaciones
    if (action === "assign" && !assignedWorkerId) {
      alert("Por favor, selecciona un trabajador.");
      return;
    }
    if (action === "reject" && !resolutionComment.trim()) {
      alert("Debes ingresar un motivo de rechazo.");
      return;
    }

    setIsSubmitting(true);
    const controller = new AbortController();

    try {
      const body: Record<string, unknown> = {};
      if (action === "assign") {
        body.assigned_to = parseInt(assignedWorkerId, 10);
      }
      if (action === "approve") {
        body.status = "approved";
        body.resolution_comment = resolutionComment || "Aprobado";
        body.resolved_by = user.user_id;
      }
      if (action === "reject") {
        body.status = "rejected";
        body.resolution_comment = resolutionComment.trim();
        body.resolved_by = user.user_id;
      }

      await patchUpdateRequest(selectedRequest.request_id, body, controller.signal);

      // Refrescar lista (mismo filtro/página)
      await loadRequests(controller.signal);
      closeManageModal();
    } catch (err: any) {
      if (!controller.signal.aborted) {
        alert(`Error al procesar la solicitud: ${err?.message ?? "desconocido"}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetear a página 1 cuando cambia el filtro
  const onChangeFilter = (s: UpdateStatus) => {
    setFilter(s);
    setPage(1);
    setSelectedCenter("all"); // Reset filtro centro al cambiar estado
  };

  // --- Render ---
  if (isLoading) return <div className="updates-list-container">Cargando solicitudes...</div>;
  if (error) return <div className="updates-list-container error-message">{error}</div>;

  const pageTitle = isAdmin 
    ? "Gestión de Solicitudes de Actualización" 
    : "Actualizaciones de Mis Centros Asignados";

  return (
    <div className="updates-list-container">
      <h2>{pageTitle}</h2>

      {requests.length > 0 && (
        <div className="results-summary">
          Mostrando {filteredAndSortedRequests.length} de {requests.length} solicitudes
          {selectedCenter !== "all" && <span> • Filtrado por: {selectedCenter}</span>}
        </div>
      )}

      <div className="filter-controls">
        <div className="status-filters">
          <button onClick={() => onChangeFilter("pending")} className={filter === "pending" ? "active" : ""}>Pendientes</button>
          <button onClick={() => onChangeFilter("approved")} className={filter === "approved" ? "active" : ""}>Aprobadas</button>
          <button onClick={() => onChangeFilter("rejected")} className={filter === "rejected" ? "active" : ""}>Rechazadas</button>
        </div>
        
        <div className="additional-filters">
          <div className="filter-group">
            <label htmlFor="center-filter">Centro:</label>
            <select
              id="center-filter"
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Todos los centros</option>
              {availableCenters.map(centerName => (
                <option key={centerName} value={centerName}>{centerName}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-order">Orden:</label>
            <select
              id="sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              className="filter-select"
            >
              <option value="newest">Más recientes primero</option>
              <option value="oldest">Más antiguas primero</option>
            </select>
          </div>
        </div>
      </div>

      <table className="updates-table">
        <thead>
          <tr>
            <th>Fecha</th>
            {isAdmin && <th>Centro</th>}
            {!isMunicipalWorker && <th>Solicitado por</th>}
            <th>Descripción</th>
            <th>Urgencia</th>
            {isAdmin && <th>Asignado a</th>}
            {isMunicipalWorker && <th>Centro</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedRequests.length > 0 ? (
            filteredAndSortedRequests.map((req) => (
              <tr key={req.request_id}>
                <td>{new Date(req.registered_at).toLocaleString()}</td>
                {isAdmin && (
                  <td>
                    <span 
                      className="center-link" 
                      onClick={() => handleCenterClick(req.center_id)}
                      title="Ir a detalles del centro"
                    >
                      {req.center_name}
                    </span>
                  </td>
                )}
                {!isMunicipalWorker && <td>{req.requested_by_name || "N/A"}</td>}
                <td>{req.description}</td>
                <td><span className={`urgency ${req.urgency.toLowerCase()}`}>{req.urgency}</span></td>
                {isAdmin && <td>{req.assigned_to_name || "Sin asignar"}</td>}
                {isMunicipalWorker && <td>{req.center_name}</td>}
                <td>
                  {(isAdmin || isMunicipalWorker) && req.status === "pending" ? (
                    <button onClick={() => openManageModal(req)} className="action-button">
                      Gestionar
                    </button>
                  ) : req.status === "approved" || req.status === "rejected" ? (
                    <div>
                      <div><strong>{req.status === "approved" ? "Aprobado" : "Rechazado"}</strong></div>
                      {req.resolved_by_name && (
                        <div>por {req.resolved_by_name}</div>
                      )}
                      {req.resolved_at && (
                        <div>el {new Date(req.resolved_at).toLocaleString()}</div>
                      )}
                      {req.resolution_comment && (
                        <div><em>"{req.resolution_comment}"</em></div>
                      )}
                    </div>
                  ) : (
                    req.resolution_comment || "N/A"
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={isAdmin ? 7 : (isMunicipalWorker ? 5 : 5)}>
              {requests.length === 0 
                ? "No hay solicitudes con el estado seleccionado."
                : "No hay solicitudes que coincidan con los filtros aplicados."
              }
            </td></tr>
          )}
        </tbody>
      </table>

      {/* Paginación */}
      <div className="pagination-controls">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
        <span>Página {page} de {Math.ceil(total / PAGE_SIZE) || 1}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}>Siguiente</button>
      </div>

      {/* Modal para Admin */}
      {isAdmin && isModalOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Gestionar Solicitud #{selectedRequest.request_id}</h3>
            <p><strong>Centro:</strong> {selectedRequest.center_name}</p>
            <p><strong>Descripción:</strong> {selectedRequest.description}</p>

            <div className="form-group">
              <label htmlFor="assign-worker">Asignar a Trabajador:</label>
              <select
                id="assign-worker"
                value={assignedWorkerId}
                onChange={(e) => setAssignedWorkerId(e.target.value)}
              >
                <option value="">-- Seleccionar --</option>
                {workers.map((w) => (
                  <option key={w.user_id} value={w.user_id}>
                    {w.nombre}
                  </option>
                ))}
              </select>
              <button onClick={() => handleUpdateRequest("assign")} disabled={isSubmitting || !assignedWorkerId}>
                Asignar
              </button>
            </div>

            <hr />

            <div className="form-group">
              <label htmlFor="resolution-comment">Motivo/Comentario de Resolución:</label>
              <textarea
                id="resolution-comment"
                rows={3}
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => handleUpdateRequest("reject")} className="btn-danger" disabled={isSubmitting}>
                Rechazar
              </button>
              <button onClick={() => handleUpdateRequest("approve")} className="btn-primary" disabled={isSubmitting}>
                Aprobar
              </button>
              <button onClick={closeManageModal} className="btn-secondary" disabled={isSubmitting}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Trabajador Municipal */}
      {isMunicipalWorker && isModalOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Resolver Solicitud #{selectedRequest.request_id}</h3>
            <p><strong>Centro:</strong> {selectedRequest.center_name}</p>
            <p><strong>Descripción:</strong> {selectedRequest.description}</p>
            <p><strong>Urgencia:</strong> <span className={`urgency ${selectedRequest.urgency.toLowerCase()}`}>{selectedRequest.urgency}</span></p>
            <p><strong>Solicitado por:</strong> {selectedRequest.requested_by_name || "N/A"}</p>

            <div className="form-group">
              <label htmlFor="resolution-comment">Comentario de Resolución:</label>
              <textarea
                id="resolution-comment"
                rows={4}
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                placeholder="Ingresa un comentario sobre la resolución..."
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => handleUpdateRequest("reject")} className="btn-danger" disabled={isSubmitting || !resolutionComment.trim()}>
                Rechazar
              </button>
              <button onClick={() => handleUpdateRequest("approve")} className="btn-primary" disabled={isSubmitting}>
                Aprobar
              </button>
              <button onClick={closeManageModal} className="btn-secondary" disabled={isSubmitting}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  