import * as React from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getNearestCenters, getDistanceToCenter, formatDistance, isCenterNearby } from "@/utils/distance";
import type { Center } from "@/types/center";
import MapFilters, { type OperationalStatusFilters } from "./MapFilters";
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

// Clase de pin según estado/ocupación con soporte para destacar centros cercanos
const getPinStatusClass = (center: Center, isNearby: boolean = false): string => {
  let baseClass = "";
  
  if (center.is_active === false) {
    baseClass = "status-inactive";
  } else if (center.operational_status === "cerrado temporalmente") {
    baseClass = "status-temporarily-closed";
  } else if (center.operational_status === "capacidad maxima") {
    baseClass = "status-full-capacity";
  } else if (center.operational_status === "abierto") {
    baseClass = "status-open";
  } else {
    // fallback por porcentaje
    const fp = Number(center.fullnessPercentage ?? 0);
    if (fp < 33) baseClass = "status-critical";
    else if (fp < 66) baseClass = "status-warning";
    else baseClass = "status-ok";
  }

  return isNearby ? `${baseClass} nearby-center` : baseClass;
};

// Función para filtrar centros por estado operativo específico
const filterCentersByOperationalStatus = (centers: Center[], filters: OperationalStatusFilters): Center[] => {
  return centers.filter(center => {
    // Si el centro no está activo, no mostrarlo (regla de negocio existente)
    if (center.is_active === false) return filters.showTemporarilyClosed;;
    
    const status = center.operational_status;
    
    // Si no tiene estado operativo definido, considerarlo como "abierto" por defecto
    if (!status || status === "abierto") {
      return filters.showOpen;
    }
    
    if (status === "cerrado temporalmente") {
      return filters.showTemporarilyClosed;
    }
    
    if (status === "capacidad maxima") {
      return filters.showMaxCapacity;
    }
    
    // Fallback para estados no reconocidos - mostrar si "abierto" está habilitado
    return filters.showOpen;
  });
};

import { fetchZones, type MunicipalZone } from "@/services/zones.service";

// 🔑 Subcomponente para la capa OMZ (ahora usando backend)
const OMZLayer: React.FC<{ visible: boolean }> = ({ visible }) => {
  const map = useMap();
  const [zones, setZones] = React.useState<MunicipalZone[]>([]);
  const [offices, setOffices] = React.useState<MunicipalZone[]>([]);

  React.useEffect(() => {
    if (!map || !visible) return;
    let zonesLayer: google.maps.Data | null = null;
    let officesLayer: google.maps.Data | null = null;
    let abort = false;

    // Fetch OMZ polygons
    fetchZones('OMZ')
      .then((data) => {
        if (abort) return;
        setZones(data);
        zonesLayer = new google.maps.Data();
        data.forEach((zone) => {
          zonesLayer!.addGeoJson(zone.geojson);
        });
        zonesLayer.setStyle((feature) => {
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
      });

    // Fetch OMZ offices (points)
    fetchZones('OMZ_OFFICE')
      .then((data) => {
        if (abort) return;
        setOffices(data);
        officesLayer = new google.maps.Data();
        data.forEach((office) => {
          officesLayer!.addGeoJson(office.geojson);
        });
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
      });

    return () => {
      abort = true;
      if (zonesLayer) zonesLayer.setMap(null);
      if (officesLayer) officesLayer.setMap(null);
    };
  }, [map, visible]);

  return null;
};



export default function MapComponent({ centers }: MapComponentProps) {
  const { isAuthenticated } = useAuth();
  const [selectedCenterId, setSelectedCenterId] = React.useState<string | null>(null);
  const [showOMZ, setShowOMZ] = React.useState(false); // Estado para controlar la visibilidad de la capa OMZ
  const [statusFilters, setStatusFilters] = React.useState<OperationalStatusFilters>({
    showOpen: true,
    showTemporarilyClosed: true,
    showMaxCapacity: true,
  });
  const [isFiltersCollapsed, setIsFiltersCollapsed] = React.useState<boolean>(true); // Comenzar colapsado

  // Hook de geolocalización
  const {
    location: userLocation,
    error: locationError,
    loading: isLocationLoading,
    requestLocation,
    supported: locationSupported
  } = useGeolocation();

  // Públicos solo ven activos, autenticados ven todos
  const visibleCenters = React.useMemo(
    () => (isAuthenticated ? centers : centers.filter((c) => c.is_active !== false)),
    [isAuthenticated, centers]
  );

  // Aplicar filtros de estado operativo
  const centersToDisplay = React.useMemo(() => {
    return filterCentersByOperationalStatus(visibleCenters, statusFilters);
  }, [visibleCenters, statusFilters]);

  // Calcular centros más cercanos
  const nearestCenterIds = React.useMemo(() => {
    return getNearestCenters(centersToDisplay, userLocation, 3);
  }, [centersToDisplay, userLocation]);

  const selectedCenter = React.useMemo(
    () => centers.find((c) => String(c.center_id) === selectedCenterId) || null,
    [centers, selectedCenterId]
  );

  // Centrar mapa en ubicación del usuario cuando se obtenga
  // Nota: Se podría implementar un mecanismo para centrar el mapa programáticamente
  // cuando se obtenga la ubicación del usuario, pero por simplicidad se omite por ahora

  // Función para manejar el cambio de filtros de estado operativo
  const handleStatusFiltersChange = (newFilters: OperationalStatusFilters) => {
    setStatusFilters(newFilters);
    // Guardar preferencias en localStorage para funcionalidad offline
    try {
      localStorage.setItem('mapFilters_operationalStatus', JSON.stringify(newFilters));
    } catch (error) {
      console.warn('No se pudieron guardar los filtros en localStorage:', error);
    }
  };

  // Función para solicitar ubicación del usuario
  const handleLocationRequest = () => {
    if (!locationSupported) {
      alert('La geolocalización no está soportada en este dispositivo o navegador.');
      return;
    }
    requestLocation();
  };

  // Cargar filtros y estado de colapso guardados al montar el componente
  React.useEffect(() => {
    try {
      // Cargar filtros de estado operativo
      const savedFilters = localStorage.getItem('mapFilters_operationalStatus');
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters) as OperationalStatusFilters;
        // Validar que el objeto tenga las propiedades correctas
        if (
          typeof parsedFilters.showOpen === 'boolean' &&
          typeof parsedFilters.showTemporarilyClosed === 'boolean' &&
          typeof parsedFilters.showMaxCapacity === 'boolean'
        ) {
          setStatusFilters(parsedFilters);
        }
      }
      
      // Cargar estado de colapso
      const savedCollapsed = localStorage.getItem('mapFilters_collapsed');
      if (savedCollapsed !== null) {
        setIsFiltersCollapsed(savedCollapsed === 'true');
      }
    } catch (error) {
      console.warn('No se pudieron cargar configuraciones guardadas:', error);
    }
  }, []);

  // Función para manejar el toggle del colapso
  const handleToggleCollapse = (collapsed: boolean) => {
    setIsFiltersCollapsed(collapsed);
  };

  if (!apiKey) {
    return <div className="error-message">Error: Falta la Clave API de Google Maps.</div>;
  }

  return (
    <div className="map-container">
      {/* Componente de filtros flotante y colapsable */}
      <MapFilters
        onStatusFiltersChange={handleStatusFiltersChange}
        onLocationRequest={handleLocationRequest}
        statusFilters={statusFilters}
        isLocationLoading={isLocationLoading}
        hasUserLocation={userLocation !== null}
        locationError={locationError}
        totalCenters={visibleCenters.length}
        filteredCenters={centersToDisplay.length}
        isCollapsed={isFiltersCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

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
            {/* Marcador de la ubicación del usuario */}
            {userLocation && (
              <AdvancedMarker
                position={{
                  lat: userLocation.latitude,
                  lng: userLocation.longitude,
                }}
                title="Tu ubicación"
                zIndex={1000} // Asegurar que esté arriba de otros marcadores
              >
                <div className="user-location-marker">
                  <div className="user-location-pulse"></div>
                  <div className="user-location-dot">📍</div>
                </div>
              </AdvancedMarker>
            )}

            {/* Marcadores de centros */}
            {centersToDisplay.map((center) => {
              const isNearby = isCenterNearby(center.center_id, nearestCenterIds);
              const distance = userLocation ? getDistanceToCenter(userLocation, center) : null;
              
              return (
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
                  <div className={`marker-pin ${getPinStatusClass(center, isNearby)}`}>
                    <span>{center.type === "Albergue" ? "🏠" : "📦"}</span>
                    {isNearby && <div className="nearby-indicator">★</div>}
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Ventana de información */}
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

                  {/* Mostrar distancia si la ubicación del usuario está disponible */}
                  {userLocation && (() => {
                    const distance = getDistanceToCenter(userLocation, selectedCenter);
                    if (distance !== null) {
                      return (
                        <p>
                          <strong>Distancia:</strong> {formatDistance(distance)}
                        </p>
                      );
                    }
                    return null;
                  })()}

                  {/* Indicar si es uno de los centros más cercanos */}
                  {isCenterNearby(selectedCenter.center_id, nearestCenterIds) && (
                    <div className="nearby-badge">
                      ⭐ Uno de los más cercanos a ti
                    </div>
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
            <OMZLayer visible={showOMZ} />
          </Map>
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
    </div>
  );
}
