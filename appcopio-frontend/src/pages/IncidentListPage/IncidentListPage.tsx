import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './IncidentListPage.css';

interface Incident {
  incident_id: number;
  description: string;
  registered_at: string;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  center_id: string;
  assigned_to: number | null;
  assigned_username?: string | null; // opcional si haces el JOIN en backend
  resolution_comment?: string | null; // opcional si haces el JOIN en backend
}

interface AdminUser {
  user_id: number;
  username: string;
}

const IncidentListPage: React.FC = () => {
  const { user } = useAuth();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState<string>('pendiente');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    setPage(1); // Reinicia la paginación cuando cambia el filtro
  }, [filter]);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch(`/api/incidents?status=${filter}&page=${page}&limit=${limit}`);
        const data = await response.json();

        if (Array.isArray(data.incidents)) {
          setIncidents(data.incidents);
          setTotal(data.total);
        } else {
          setIncidents([]);
        }
      } catch (error) {
        const cached = localStorage.getItem('incidents_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setIncidents(parsed);
        }
      }
    };

    fetchIncidents();
  }, [filter, page]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await fetch('/api/users?role=Emergencias');
        const data = await res.json();
        setAdminUsers(data);
      } catch (err) {
        console.error('Error al cargar usuarios:', err);
      }
    };
    fetchAdmins();
  }, []);

  const handleAssign = async (incidentId: number, userId: number) => {
    try {
      await fetch(`/api/incidents/${incidentId}/assign`, {
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
      alert('No se pudo asignar la incidencia. Se guardará localmente.');
    }
  };

  const handleApprove = async (incidentId: number) => {

    const incident = incidents.find(i => i.incident_id === incidentId);
  if (!incident?.assigned_to) {
    alert('Debes asignar un usuario antes de aprobar esta incidencia.');
    return;
  }

    try {
      await fetch(`/api/incidents/${incidentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.user_id })
      });

      setIncidents(prev =>
        prev.map(i =>
          i.incident_id === incidentId
            ? {
              ...i,
              status: 'aceptada',
              // mantener el assigned_to actual si existe, o asignar el actual user
              assigned_to: i.assigned_to ?? user!.user_id,
              assigned_username: i.assigned_username ?? user!.username
            }
            : i
        )
      );

    } catch (error) {
      alert('No se pudo aprobar la incidencia.');
    }
  };

  const handleReject = async (incidentId: number) => {
    const comment = prompt('Ingrese una justificación para rechazar esta incidencia:');
    if (!comment) return;

    const incident = incidents.find(i => i.incident_id === incidentId);
  if (!incident?.assigned_to) {
    alert('Debes asignar un usuario antes de rechazar esta incidencia.');
    return;
  }

    try {
      await fetch(`/api/incidents/${incidentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.user_id, comment })
      });

      setIncidents(prev =>
        prev.map(i =>
          i.incident_id === incidentId
            ? {
              ...i,
              status: 'rechazada',
              assigned_to: i.assigned_to,
              assigned_username: i.assigned_username
            }
            : i
        )
      );

    } catch (error) {
      alert('No se pudo rechazar la incidencia.');
    }
  };


  return (
    <div>
      <h2>Listado de Incidencias</h2>

      <label>
        Filtrar por estado:
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="pendiente">Pendiente</option>
          <option value="aceptada">Aceptada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </label>

      <table>
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
          {incidents.map((incident) => (
            <tr key={incident.incident_id}>
              <td>{new Date(incident.registered_at).toLocaleString()}</td>
              <td>{incident.description}</td>
              <td>{incident.center_id}</td>
              <td className={`status ${incident.status}`}>{incident.status}</td>
              <td>{incident.assigned_username ?? incident.assigned_to ?? 'Nadie'}</td>
              <td>
                {incident.status === 'pendiente' && (
                  <>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const selectedUserId = parseInt(e.target.value);
                        if (!isNaN(selectedUserId)) {
                          handleAssign(incident.incident_id, selectedUserId);
                        }
                      }}
                    >
                      <option value="" disabled>Asignar a…</option>
                      {adminUsers.map(user => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => handleApprove(incident.incident_id)} style={{ marginLeft: '0.5rem' }}>Aprobar</button>
                    <button onClick={() => handleReject(incident.incident_id)} style={{ marginLeft: '0.5rem' }}>Rechazar</button>
                  </>
                )}
              </td>
              <td>{incident.resolution_comment}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '1rem' }}>
        <button
          disabled={page === 1}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
        >
          Anterior
        </button>
        <span style={{ margin: '0 1rem' }}>
          Página {page} de {Math.ceil(total / limit)}
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
