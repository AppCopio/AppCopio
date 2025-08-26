import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchWithAbort } from '../../services/api';
import './IncidentListPage.css';

// Definición de la interfaz para un incidente
interface Incident {
  incident_id: number;
  description: string;
  registered_at: string;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  center_id: string;
  assigned_to: number | null;
  assigned_username?: string | null; // Opcional, depende del JOIN en el backend
  resolution_comment?: string | null; // Opcional
}

// Definición de la interfaz para un usuario administrador
interface AdminUser {
  user_id: number;
  username: string;
}

// Definición de la interfaz para la respuesta de la API de incidentes
interface IncidentsApiResponse {
    incidents: Incident[];
    total: number;
}

const IncidentListPage: React.FC = () => {
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState<string>('pendiente');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 10;

  // Este efecto reinicia la paginación a 1 cuando cambia el filtro.
  // Su comportamiento es correcto y se mantiene.
  useEffect(() => {
    setPage(1);
  }, [filter]);

  // Efecto para obtener la lista de incidentes.
  // Es sensible a los cambios de filtro y página, por lo que necesita el AbortController.
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchIncidents = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchWithAbort<IncidentsApiResponse>(
          `${apiUrl}/incidents?status=${filter}&page=${page}&limit=${limit}`,
          controller.signal
        );
        
        if (Array.isArray(data.incidents)) {
          setIncidents(data.incidents);
          setTotal(data.total);
          // Opcional: Guardar en cache solo si la petición fue exitosa
          localStorage.setItem('incidents_cache', JSON.stringify(data.incidents));
        } else {
          setIncidents([]);
          setTotal(0);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Error al obtener incidentes, intentando cargar desde caché:", err);
          setError("Error de red. Mostrando datos locales si existen.");
          const cached = localStorage.getItem('incidents_cache');
          if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) setIncidents(parsed);
            } catch (parseError) {
                console.error("Error al parsear datos de caché:", parseError);
            }
          }
        }
      } finally {
        // Se asegura que el estado de carga se desactive solo si la petición no fue abortada.
        if (!controller.signal.aborted) {
            setIsLoading(false);
        }
      }
    };

    fetchIncidents();

    // La función de limpieza se ejecuta para cancelar la petición en curso
    // si el componente se desmonta o las dependencias cambian.
    return () => {
      controller.abort();
    };
  }, [filter, page, apiUrl]);

  // Efecto para obtener la lista de administradores una sola vez.
  // Se le aplica el patrón para evitar memory leaks si el componente se desmonta.

useEffect(() => {
  const controller = new AbortController();

  const fetchAdmins = async () => {
    try {
      const data = await fetchWithAbort<any>(
        `${apiUrl}/users?role=Emergencias&page=1&pageSize=200`,
        controller.signal
      );

      const list = Array.isArray(data) ? data
                 : Array.isArray(data?.users) ? data.users
                 : [];

      const admins: AdminUser[] = list.map((u: any) => ({
        user_id: u.user_id,
        username: u.username,
      }));

      setAdminUsers(admins);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error al cargar usuarios de emergencia:", err);
        setAdminUsers([]); 
      }
    }
  };

  fetchAdmins();
  return () => controller.abort();
}, [apiUrl]);

  const handleAssign = async (incidentId: number, userId: number) => {
    try {
      await fetch(`${apiUrl}/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      setIncidents(prev =>
        prev.map(i =>
          i.incident_id === incidentId
            ? {
                ...i,
                assigned_to: userId,
                assigned_username: adminUsers.find(u => u.user_id === userId)?.username ?? null
              }
            : i
        )
      );
    } catch (error) {
      console.error('Error al asignar incidencia:', error);
      alert('No se pudo asignar la incidencia.');
    }
  };

  const handleApprove = async (incidentId: number) => {
    const incident = incidents.find(i => i.incident_id === incidentId);
    if (!incident?.assigned_to) {
        alert('Debes asignar un usuario antes de aprobar esta incidencia.');
        return;
    }

    try {
      await fetch(`${apiUrl}/incidents/${incidentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.user_id })
      });

    } catch (error) {
        console.error('Error al aprobar incidencia:', error);
        alert('No se pudo aprobar la incidencia.');
    }
  };

  const handleReject = async (incidentId: number) => {
    const comment = prompt('Ingrese una justificación para rechazar esta incidencia:');
    if (!comment || comment.trim() === '') {
        alert('La justificación no puede estar vacía.');
        return;
    }

    const incident = incidents.find(i => i.incident_id === incidentId);
    if (!incident?.assigned_to) {
        alert('Debes asignar un usuario antes de rechazar esta incidencia.');
        return;
    }

    try {
      await fetch(`${apiUrl}/incidents/${incidentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.user_id, comment })
      });
      
    } catch (error) {
        console.error('Error al rechazar incidencia:', error);
        alert('No se pudo rechazar la incidencia.');
    }
  };

  if (isLoading) {
    return <div className="incident-list-container">Cargando incidencias...</div>;
  }

  if (error) {
    return <div className="incident-list-container error-message">{error}</div>;
  }

  return (
    <div className="incident-list-container">
      <h2>Listado de Incidencias</h2>

      <label className="filter-label">
        Filtrar por estado:
        <select value={filter} onChange={e => setFilter(e.target.value)} className="filter-select">
          <option value="pendiente">Pendiente</option>
          <option value="aceptada">Aceptada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </label>

      <table className="incidents-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Centro</th>
            <th>Estado</th>
            <th>Asignado a</th>
            <th>Acción</th>
            <th>Comentario</th>
          </tr>
        </thead>
        <tbody>
          {incidents.length > 0 ? (
            incidents.map((incident) => (
              <tr key={incident.incident_id}>
                <td>{new Date(incident.registered_at).toLocaleString()}</td>
                <td>{incident.description}</td>
                <td>{incident.center_id}</td>
                <td className={`status ${incident.status}`}>{incident.status}</td>
                <td>{incident.assigned_username ?? 'Sin asignar'}</td>
                <td>
                  {incident.status === 'pendiente' && (
                    <div className="action-cell">
                      <select
                        defaultValue=""
                        className="assign-select"
                        onChange={(e) => {
                          const selectedUserId = parseInt(e.target.value);
                          if (!isNaN(selectedUserId)) {
                            handleAssign(incident.incident_id, selectedUserId);
                          }
                        }}
                      >
                        <option value="" disabled>Asignar a…</option>
                        {adminUsers.map(admin => (
                          <option key={admin.user_id} value={admin.user_id}>
                            {admin.username}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => handleApprove(incident.incident_id)} className="action-button approve">Aprobar</button>
                      <button onClick={() => handleReject(incident.incident_id)} className="action-button reject">Rechazar</button>
                    </div>
                  )}
                </td>
                <td>{incident.resolution_comment}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>No hay incidencias que coincidan con el filtro.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination-controls">
        <button
          disabled={page === 1}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
        >
          Anterior
        </button>
        <span>
          Página {page} de {Math.ceil(total / limit) || 1}
        </span>
        <button
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default IncidentListPage;