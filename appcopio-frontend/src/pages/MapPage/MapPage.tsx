import React, { useState, useEffect } from 'react';
import MapComponent from '../../components/map/MapComponent';
import SimpleMapComponent from '../../components/map/SimpleMapComponent';
import { fetchWithAbort } from '../../services/api';

// La interfaz se puede mover a un archivo de tipos compartido (ej: src/types.ts)
interface Center {
  center_id: string;
  name: string;
  address: string;
  type: string; // Cambiar a string para aceptar valores del backend
  capacity: number;
  is_active: boolean;
  operational_status?: string; // Agregar campo que viene del backend
  public_note?: string; // Agregar campo que viene del backend
  latitude: number | string; // Puede venir como string
  longitude: number | string; // Puede venir como string
  fullnessPercentage: number;
}

const MapPage: React.FC = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // Check if Google Maps API key is available
  const hasGoogleMapsKey = Boolean(import.meta.env.VITE_Maps_API_KEY) && 
                          import.meta.env.VITE_Maps_API_KEY !== 'TU_PROPIA_CLAVE_DE_API_DE_Maps';

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
        
        // Log para debugging
        console.log('Datos recibidos del backend:', data);
        
        // Transformar los datos para asegurar compatibilidad
        const transformedData = data.map(center => ({
          ...center,
          type: center.type === 'albergue comunitario' ? 'Albergue' : 
                center.type === 'acopio' ? 'Acopio' : center.type,
          latitude: Number(center.latitude) || 0,
          longitude: Number(center.longitude) || 0,
          fullnessPercentage: center.fullnessPercentage || 0
        }));
        
        console.log('Datos transformados:', transformedData);
        setCenters(transformedData);
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
        y le pasa la información al MapComponent o SimpleMapComponent según disponibilidad de API key.
      */}
      {hasGoogleMapsKey ? (
        <MapComponent centers={centers} />
      ) : (
        <SimpleMapComponent centers={centers} />
      )}
    </div>
  );
};

export default MapPage;