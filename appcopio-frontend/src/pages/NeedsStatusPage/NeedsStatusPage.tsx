import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./NeedsStatusPage.css";

interface Incident {
  id: number;
  description: string;
  urgency: string;
  created_at: string;
  status: "pendiente" | "aceptado" | "rechazado";
  resolution_comment?: string | null;
  resolved_at?: string | null;
  assigned_to_username?: string | null;
}

const NeedsStatusPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/api/incidents/center/${centerId}`
        );
        if (!res.ok) throw new Error("Error al cargar las incidencias");
        const data = await res.json();
        setIncidents(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncidents();
  }, [centerId]);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="status-page">
      <h3>Estado de Solicitudes / Incidencias del Centro {centerId}</h3>
      {incidents.length === 0 ? (
        <p>No hay incidencias registradas.</p>
      ) : (
        <table className="status-table">
          <thead>
            <tr>
              <th>Fecha reporte</th>
              <th>Descripción</th>
              <th>Urgencia</th>
              <th>Estado</th>
              <th>Resuelto por</th>
              <th>Comentario</th>
              <th>Fecha resolución</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id}>
                <td>{new Date(inc.created_at).toLocaleString()}</td>
                <td>{inc.description}</td>
                <td>{inc.urgency}</td>
                <td className={`status ${inc.status}`}>{inc.status}</td>
                <td>{inc.assigned_to_username || "—"}</td>
                <td>{inc.resolution_comment || "—"}</td>
                <td>{inc.resolved_at ? new Date(inc.resolved_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default NeedsStatusPage;
