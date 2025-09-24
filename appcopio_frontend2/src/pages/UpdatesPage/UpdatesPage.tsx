import * as React from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { listUpdates, patchUpdateRequest} from "@/services/updates.service";
import { listActiveUsersByRole} from "@/services/users.service";
import type { UpdateRequest, UpdateStatus } from "@/types/update";
import type {User as WorkerUser } from "@/types/user";
import "./UpdatesPage.css";

// IDs de roles (ajusta si cambian)
const ROLE_ID_TMO = 2;

// Para mantener la misma paginación
const PAGE_SIZE = 10;

export default function UpdatesPage() {
  const { user } = useAuth();
  const { centerId } = useParams<{ centerId?: string }>();

  // --- Estado ---
  const [requests, setRequests] = React.useState<UpdateRequest[]>([]);
  const [workers, setWorkers] = React.useState<WorkerUser[]>([]);
  const [filter, setFilter] = React.useState<UpdateStatus>("pending");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<UpdateRequest | null>(null);
  const [assignedWorkerId, setAssignedWorkerId] = React.useState<string>("");
  const [resolutionComment, setResolutionComment] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Permisos
  const isAdmin = !!user && (user.role_id === 1 || user.role_id === 2 || user.es_apoyo_admin === true);

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
        const data = await listUpdates({ status: filter, page, limit: PAGE_SIZE, centerId, signal });
        setRequests(data.requests ?? []);
        setTotal(data.total ?? 0);
      } catch (e: any) {
        if (signal.aborted) return;
        setError("No se pudieron cargar las solicitudes. Intente más tarde.");
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [user, filter, page, centerId]
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
            // Llama a la única función correcta y validada
            const workerData = await listActiveUsersByRole(ROLE_ID_TMO, controller.signal);
            setWorkers(workerData);
        } catch (err) {
            // AHORA: Si hay un error, se notifica y se actualiza el estado
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

  // ---- Acciones: asignar / aprobar / rechazar ----
  const handleUpdateRequest = async (action: "assign" | "approve" | "reject") => {
    if (!selectedRequest || !isAdmin) return;

    // Validaciones (mantenemos UX simple, igual visual)
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
      }
      if (action === "reject") {
        body.status = "rejected";
        body.resolution_comment = resolutionComment.trim();
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
  };

  // --- Render ---
  if (isLoading) return <div className="updates-list-container">Cargando solicitudes...</div>;
  if (error) return <div className="updates-list-container error-message">{error}</div>;

  return (
    <div className="updates-list-container">
      <h2>{isAdmin ? "Gestión de Solicitudes de Actualización" : "Mis Solicitudes de Actualización"}</h2>

      <div className="filter-controls">
        <button onClick={() => onChangeFilter("pending")} className={filter === "pending" ? "active" : ""}>Pendientes</button>
        <button onClick={() => onChangeFilter("approved")} className={filter === "approved" ? "active" : ""}>Aprobadas</button>
        <button onClick={() => onChangeFilter("rejected")} className={filter === "rejected" ? "active" : ""}>Rechazadas</button>
        <button onClick={() => onChangeFilter("canceled")} className={filter === "canceled" ? "active" : ""}>Canceladas</button>
      </div>

      <table className="updates-table">
        <thead>
          <tr>
            <th>Fecha</th>
            {isAdmin && <th>Centro</th>}
            <th>Solicitado por</th>
            <th>Descripción</th>
            <th>Urgencia</th>
            {isAdmin && <th>Asignado a</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {requests.length > 0 ? (
            requests.map((req) => (
              <tr key={req.request_id}>
                <td>{new Date(req.registered_at).toLocaleString()}</td>
                {isAdmin && <td>{req.center_name}</td>}
                <td>{req.requested_by_name || "N/A"}</td>
                <td>{req.description}</td>
                <td><span className={`urgency ${req.urgency.toLowerCase()}`}>{req.urgency}</span></td>
                {isAdmin && <td>{req.assigned_to_name || "Sin asignar"}</td>}
                <td>
                  {isAdmin && req.status === "pending" ? (
                    <button onClick={() => openManageModal(req)} className="action-button">Gestionar</button>
                  ) : (
                    req.resolution_comment || "N/A"
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={isAdmin ? 7 : 5}>No hay solicitudes con el estado seleccionado.</td></tr>
          )}
        </tbody>
      </table>

      {/* Paginación */}
      <div className="pagination-controls">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
        <span>Página {page} de {Math.ceil(total / PAGE_SIZE) || 1}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}>Siguiente</button>
      </div>

      {/* Modal (igual visual) */}
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
    </div>
  );
}
  