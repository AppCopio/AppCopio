// src/pages/NeedsStatusPage/NeedsStatusPage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAbort } from "../../services/api";
import "./NeedsStatusPage.css";


interface UpdateRequest {
  request_id: number;
  center_id: string; 
  center_name: string;
  description: string;
  urgency: string;
  registered_at: string;
  status: "pending" | "approved" | "rejected" | "canceled";
  // ...otros campos que puedan venir
}

interface UpdatesApiResponse {
    requests: UpdateRequest[];
    total: number;
}

const NeedsStatusPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const apiUrl = import.meta.env.VITE_API_URL;
  const cacheKey = `updates_cache_${centerId}`;

  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUpdates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWithAbort<UpdatesApiResponse>(
          `${apiUrl}/updates?status=pending&limit=100`, // Traemos todas las pendientes
          controller.signal
        );

        // --- INICIO DE LA DEPURACIÓN ---
        // ✅ 1. Mostramos en consola TODO lo que llegó de la API.
        // Aquí deberías ver todos los updates, y cada uno debería tener la propiedad "center_id".
        //console.log("1. Datos CRUDOS recibidos de la API:", data.requests);
        
        const centerRequests = data.requests.filter(req => {
          // ✅ 2. Mostramos en consola la comparación que se hace para CADA update.
          // Esto nos dirá si los IDs coinciden como esperamos.
          //console.log(`Comparando: (req.center_id) ${req.center_id} === ${centerId} (centerId de la URL)`);
          return req.center_id === centerId;
        });

        // ✅ 3. Mostramos el resultado FINAL del filtro.
        // Si aquí ves un array vacío, el problema está en la comparación. Si ves los datos, ¡éxito!
        //console.log("2. Solicitudes FILTRADAS para este centro:", centerRequests);
        // --- FIN DE LA DEPURACIÓN ---
        
        setRequests(centerRequests);
        // Guardamos en caché solo las solicitudes ya filtradas para este centro.
        localStorage.setItem(cacheKey, JSON.stringify(centerRequests));

      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error de red al cargar actualizaciones, intentando desde caché.", err);
          try {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
              const parsedCache = JSON.parse(cachedData) as UpdateRequest[];
              // El caché ya debería estar filtrado, pero por seguridad lo volvemos a hacer.
              setRequests(parsedCache.filter(req => req.center_id === centerId));
            } else {
              setError("No se pudieron cargar las actualizaciones y no hay datos en caché.");
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
      fetchUpdates();
    }

    return () => {
      controller.abort();
    };
  }, [centerId, apiUrl, cacheKey]);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="status-page">
      <h3>Estado de Actualizaciones del Centro {centerId}</h3>
      {!navigator.onLine && <p className="offline-notice">Estás sin conexión. Mostrando últimos datos guardados.</p>}
      
      {requests.length === 0 ? (
        <p>No hay actualizaciones pendientes para este centro.</p> // Mensaje más específico
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
};

export default NeedsStatusPage;