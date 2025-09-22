import * as React from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { useAuth } from "@/contexts/AuthContext";
import type { Center } from "@/types/center";
import "./MapComponent.css";

type MapComponentProps = {
  centers: Center[];
};

const apiKey = import.meta.env.VITE_Maps_API_KEY as string | undefined;
const valparaisoCoords = { lat: -33.04, lng: -71.61 };

// Mostrar texto bonito para el estado operativo
const formatOperationalStatus = (status?: Center["operational_status"]): string => {
  if (!status) return "No definido";
  switch (status) {
    case "abierto":
      return "Abierto";
    case "cerrado temporalmente":
      return "Cerrado Temporalmente";
    case "capacidad maxima":
      return "Capacidad Máxima";
    default:
      return String(status);
  }
};

// Estado general combinando is_active + operational_status
const getCenterStatus = (center: Center): string => {
  if (center.is_active === false) return "Inactivo";
  if (center.operational_status === "cerrado temporalmente") return "Cerrado";
  return "Activo";
};

// Clase de pin según estado/ocupación
const getPinStatusClass = (center: Center): string => {
  if (center.is_active === false) return "status-inactive";

  if (center.operational_status === "cerrado temporalmente") return "status-temporarily-closed";
  if (center.operational_status === "capacidad maxima") return "status-full-capacity";
  if (center.operational_status === "abierto") return "status-open";

  // fallback por porcentaje
  const fp = Number(center.fullnessPercentage ?? 0);
  if (fp < 33) return "status-critical";
  if (fp < 66) return "status-warning";
  return "status-ok";
};

export default function MapComponent({ centers }: MapComponentProps) {
  const { isAuthenticated } = useAuth();
  const [selectedCenterId, setSelectedCenterId] = React.useState<string | null>(null);

  // Públicos solo ven activos
  const centersToDisplay = React.useMemo(
    () => (isAuthenticated ? centers : centers.filter((c) => c.is_active !== false)),
    [isAuthenticated, centers]
  );

  const selectedCenter = React.useMemo(
    () => centers.find((c) => String(c.center_id) === selectedCenterId) || null,
    [centers, selectedCenterId]
  );

  if (!apiKey) {
    return <div className="error-message">Error: Falta la Clave API de Google Maps.</div>;
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="map-wrapper">
        <Map
          defaultCenter={valparaisoCoords}
          defaultZoom={13}
          mapId="appcopio-map-main"
          gestureHandling="greedy"
          disableDefaultUI
          fullscreenControl
        >
          {centersToDisplay.map((center) => (
            <AdvancedMarker
              key={String(center.center_id)}
              position={{
                lat: Number(center.latitude),
                lng: Number(center.longitude),
              }}
              title={
                center.operational_status
                  ? `${center.name} - ${formatOperationalStatus(center.operational_status)}`
                  : `${center.name} - Abastecido al ${Number(center.fullnessPercentage ?? 0).toFixed(0)}%`
              }
              onClick={() => setSelectedCenterId(String(center.center_id))}
            >
              <div className={`marker-pin ${getPinStatusClass(center)}`}>
                <span>{center.type === "Albergue" ? "🏠" : "📦"}</span>
              </div>
            </AdvancedMarker>
          ))}

          {selectedCenter && (
            <InfoWindow
              position={{
                lat: Number(selectedCenter.latitude),
                lng: Number(selectedCenter.longitude),
              }}
              onCloseClick={() => setSelectedCenterId(null)}
              pixelOffset={[0, -40]}
            >
              <div className="infowindow-content">
                <h4>{selectedCenter.name}</h4>
                <p>
                  <strong>Tipo:</strong> {selectedCenter.type}
                </p>
                <p>
                  <strong>Estado:</strong> {getCenterStatus(selectedCenter)}
                </p>

                {selectedCenter.operational_status && (
                  <p>
                    <strong>Estado Operativo:</strong>{" "}
                    {formatOperationalStatus(selectedCenter.operational_status)}
                  </p>
                )}

                {selectedCenter.operational_status === "cerrado temporalmente" &&
                  selectedCenter.public_note && (
                    <div className="public-note">
                      <p>
                        <strong>Nota:</strong> {selectedCenter.public_note}
                      </p>
                    </div>
                  )}

                <p>
                  <strong>Nivel de Abastecimiento:</strong>{" "}
                  {Number(selectedCenter.fullnessPercentage ?? 0).toFixed(0)}%
                </p>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
