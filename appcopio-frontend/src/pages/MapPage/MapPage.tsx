import React, { useState, useEffect } from 'react';
import MapComponent from '../../components/map/MapComponent';
import { fetchWithAbort } from '../../services/api';

// La interfaz se puede mover a un archivo de tipos compartido (ej: src/types.ts)
interface Center {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  capacity: number;
  is_active: boolean;
  latitude: number;
  longitude: number;
  fullnessPercentage: number;
}

const MapPage: React.FC = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  // Efecto para obtener los centros.
  // Se aplica el patrón AbortController para robustez y consistencia.
  useEffect(() => {
    const controller = new AbortController();

    const fetchCenters = async () => {
      // Reinicia el estado al iniciar la carga
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWithAbort<Center[]>(
            `${apiUrl}/centers`,
            controller.signal
        );
        setCenters(data);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Error fetching center data:", err);
          setError("No se pudieron cargar los datos de los centros.");
        }
      } finally {
        // Asegura que el estado de carga se desactive solo si la petición no fue abortada.
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCenters();

    // La función de limpieza cancela la petición si el componente se desmonta.
    return () => {
      controller.abort();
    };
  }, [apiUrl]); // Se añade apiUrl a las dependencias.

  if (loading) {
    return <div className="map-page-container">Cargando mapa y centros de acopio...</div>;
  }
  
  if (error) {
    return <div className="map-page-container error-message">Error: {error}</div>;
  }

  return (
    <div className="map-page-container">
      {/* Este componente ahora actúa como un "contenedor" que se encarga de la lógica de datos
        y le pasa la información al MapComponent, que se enfoca en la presentación.
      */}
      <MapComponent centers={centers} />
    </div>
  );
};

export default MapPage;