// src/pages/NeedsStatusPage/NeedsStatusPage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAbort } from "../../services/api";
import "./NeedsStatusPage.css";

interface Incident {
  incident_id: number; // Ajustado para coincidir con la BD
  description: string;
  urgency: string;
  registered_at: string; // Ajustado
  status: "pendiente" | "aceptada" | "rechazada";
  resolution_comment?: string | null;
  resolved_at?: string | null;
  assigned_to_username?: string | null; // Nuevo campo
}

const NeedsStatusPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const apiUrl = import.meta.env.VITE_API_URL;
  const cacheKey = `incidents_cache_${centerId}`; // Clave única para el caché de este centro

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        // Guardamos los datos en localStorage si la petición fue exitosa.
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error de red al cargar incidencias, intentando desde caché.", err);
          // --- LÓGICA OFFLINE ---
          // Si falla, intentamos cargar desde el caché.
          try {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
              setIncidents(JSON.parse(cachedData));
            } else {
              setError("No se pudieron cargar las incidencias y no hay datos en caché.");
            }
          } catch (cacheError) {
            setError("Error al leer los datos de caché.");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    if (centerId) {
      fetchIncidents();
    }

    return () => {
      controller.abort();
    };
  }, [centerId, apiUrl, cacheKey]);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="status-page">
      <h3>Estado de Solicitudes / Incidencias del Centro {centerId}</h3>
      {!navigator.onLine && <p className="offline-notice">Estás sin conexión. Mostrando últimos datos guardados.</p>}
      
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
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.incident_id}>
                <td>{new Date(inc.registered_at).toLocaleString()}</td>
                <td>{inc.description}</td>
                <td>{inc.urgency}</td>
                <td className={`status ${inc.status}`}>{inc.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default NeedsStatusPage;