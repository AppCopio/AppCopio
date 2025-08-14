import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAbort } from "../../services/api";
import "./NeedsStatusPage.css";

// Es buena práctica mover las interfaces compartidas a un archivo (ej: src/types.ts)
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
  const apiUrl = import.meta.env.VITE_API_URL;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Efecto para obtener las incidencias de un centro específico.
  // Se refactoriza para ser resiliente a desmontajes y cambios rápidos.
  useEffect(() => {
    // Si no hay centerId, no se ejecuta la petición.
    if (!centerId) {
        setIsLoading(false);
        setError("No se ha especificado un centro.");
        return;
    }

    const controller = new AbortController();

    const fetchIncidents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWithAbort<Incident[]>(
          `${apiUrl}/incidents/center/${centerId}`,
          controller.signal
        );
        setIncidents(data);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error al cargar las incidencias:", err);
          setError(err.message);
        }
      } finally {
        // Asegura que el estado de carga se desactive solo si la petición no fue abortada.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchIncidents();

    // La función de limpieza cancela la petición si el componente se desmonta
    // o si el centerId cambia antes de que la petición se complete.
    return () => {
      controller.abort();
    };
  }, [centerId, apiUrl]); // Se depende del centerId y de la apiUrl.

  if (isLoading) {
    return <div className="status-page">Cargando incidencias...</div>;
  }
  
  if (error) {
    return <div className="status-page error-message">Error: {error}</div>;
  }

  return (
    <div className="status-page">
      <h3>Estado de Solicitudes / Incidencias del Centro {centerId}</h3>
      {incidents.length === 0 ? (
        <p>No hay incidencias registradas para este centro.</p>
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