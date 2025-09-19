import * as React from "react";
import { useParams } from "react-router-dom";
import "./NeedsStatusPage.css";

import { listUpdates } from "@/services/updates.service";
import type { UpdateRequest } from "@/types/update";

const PAGE_SIZE = 100; // traemos todas las pendientes como antes

export default function NeedsStatusPage() {
  const { centerId } = useParams<{ centerId: string }>();

  const [requests, setRequests] = React.useState<UpdateRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal: AbortSignal) => {
    if (!centerId) {
      setError("Centro no encontrado.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      // ahora usamos el endpoint tipado vía service
      const data = await listUpdates({
        status: "pending",
        page: 1,
        limit: PAGE_SIZE,
        centerId,
        signal,
      });
      setRequests(data.requests ?? []);
    } catch (e) {
      if (!signal.aborted) setError("No se pudieron cargar las actualizaciones. Intente más tarde.");
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, [centerId]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="status-page">
      <h3>Estado de Actualizaciones del Centro {centerId}</h3>
      {!navigator.onLine && (
        <p className="offline-notice">Estás sin conexión. Mostrando últimos datos guardados.</p>
      )}

      {requests.length === 0 ? (
        <p>No hay actualizaciones pendientes para este centro.</p>
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
            {requests.map((req) => (
              <tr key={req.request_id}>
                <td>{new Date(req.registered_at).toLocaleString()}</td>
                <td>{req.description}</td>
                <td>{req.urgency}</td>
                <td className={`status ${req.status}`}>{req.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
