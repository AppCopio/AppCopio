import * as React from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { useAuth } from "@/contexts/AuthContext";
import type { Center } from "@/types/center";
import "./MapComponent.css";
import { Button } from "@mui/material";


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

// 🔑 Subcomponente para la capa OMZ
const OMZLayer: React.FC<{ visible: boolean }> = ({ visible }) => {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !visible) return;
    const zonesLayer = new google.maps.Data();
    zonesLayer.loadGeoJson('/data/omz_zones.json');
    
    zonesLayer.setStyle(feature => {
      const fill = feature.getProperty('fill') as string || '#1E90FF';
      const stroke = feature.getProperty('stroke') as string || '#000';
      const strokeW = feature.getProperty('stroke-width') as number || 1;
      const fillO = feature.getProperty('fill-opacity') as number || 0.5;

      return {
        fillColor: fill,
        strokeColor: stroke,
        strokeWeight: strokeW,
        fillOpacity: fillO,
      };
    });

    zonesLayer.setMap(map);

    const officesLayer = new google.maps.Data();
    officesLayer.loadGeoJson('/data/omz_offices1.json');

    officesLayer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === 'Point') {
        const n = String(feature.getProperty('omz_number'));
        const iconUrl = `/icons/omz-${n}.png`;

        return {
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(36, 36),
          },
          title: `OMZ ${n} - ${feature.getProperty('name')}`,
        };
      }

      return { visible: false };
    });

    officesLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
      const name = event.feature.getProperty('name');
      const description = event.feature.getProperty('description') as { value?: string };
      const desc = description?.value || '';
      const pos = (event.feature.getGeometry() as google.maps.Data.Point).get();
      const n = event.feature.getProperty('omz_number') ?? '';

      new google.maps.InfoWindow({
        content: `<strong>OMZ ${n} - ${name}</strong><br>${desc}`,
        position: pos,
      }).open({ map });
    });

    officesLayer.setMap(map);

    return () => {
      zonesLayer.setMap(null);
      officesLayer.setMap(null);
    };
  }, [map, visible]);

  return null;
};

export default function MapComponent({ centers }: MapComponentProps) {
  const { isAuthenticated } = useAuth();
  const [selectedCenterId, setSelectedCenterId] = React.useState<string | null>(null);
  const [showOMZ, setShowOMZ] = React.useState(false); // Estado para controlar la visibilidad de la capa OMZ

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
          {/* Capa OMZ (solo si showOMZ es true) */}
          <OMZLayer visible={showOMZ} />
        </Map>
        {/* Botón para alternar zonas OMZ */}
        <div className="omz-toggle-btn">
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => setShowOMZ(!showOMZ)}
            sx={(t) => t.typography.bodyStrong}
          >
            {showOMZ ? "Ocultar zonas OMZ" : "Ver zonas OMZ"}
          </Button>
        </div>
      </div>
    </APIProvider>
  );
}
