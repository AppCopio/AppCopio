import * as React from "react";
import MapComponent from "@/components/map/MapComponent";
import { listCenters } from "@/services/centers.service";
import type { Center } from "@/types/center";
import { msgFromError } from "@/lib/errors";
import "./MapPage.css";

// Mantiene la misma UI/CSS (clases y estructura)
export default function MapPage() {
  const [centers, setCenters] = React.useState<Center[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listCenters(controller.signal);
        setCenters(data);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error("Error fetching center data:", e);
        setError(msgFromError(e) || "No se pudieron cargar los datos de los centros.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  if (loading) {
    return <div className="map-page-container">Cargando mapa y centros de acopio...</div>;
  }

  if (error) {
    return <div className="map-page-container error-message">Error: {error}</div>;
  }

  return (
    <div className="map-page-container">
      {/* Contenedor de datos -> presentación en MapComponent */}
      <MapComponent centers={centers} />
    </div>
  );
}
