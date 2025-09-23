import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap} from '@vis.gl/react-google-maps';
import { useAuth } from '../../contexts/AuthContext';
import './MapComponent.css';

// Interfaz actualizada para incluir el estado operativo
interface Center {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  is_active: boolean;
  operational_status?: 'abierto' | 'cerrado temporalmente' | 'capacidad maxima';
  public_note?: string;
  latitude: number | string; 
  longitude: number | string;
  fullnessPercentage: number; 
}

// Se mantiene la interfaz para las props que el componente recibe
interface MapComponentProps {
  centers: Center[];
}

const apiKey = import.meta.env.VITE_Maps_API_KEY;
const valparaisoCoords = { lat: -33.04, lng: -71.61 };


// Función para formatear el estado operativo para mostrar en la UI
const formatOperationalStatus = (status?: string): string => {
  if (!status) return 'No definido';
  
  switch (status) {
    case 'abierto':
      return 'Abierto';
    case 'cerrado temporalmente':
      return 'Cerrado Temporalmente';
    case 'capacidad maxima':
      return 'Capacidad Máxima';
    default:
      return status;
  }
};

// Función para determinar el estado del centro considerando tanto is_active como operational_status
const getCenterStatus = (center: Center): string => {
  if (!center.is_active) {
    return 'Inactivo';
  }
  
  if (center.operational_status === 'cerrado temporalmente') {
    return 'Cerrado';
  }
  
  return 'Activo';
};

// Lógica de estilos corregida para el estado operativo
const getPinStatusClass = (center: Center): string => {
  if (!center.is_active) {
    return 'status-inactive'; // Gris
  }
  
  // Se da prioridad al estado operativo sobre el nivel de abastecimiento
  if (center.operational_status === 'cerrado temporalmente') {
    return 'status-temporarily-closed'; // Gris
  } else if (center.operational_status === 'capacidad maxima') {
    return 'status-full-capacity'; // Rojo
  } else if (center.operational_status === 'abierto') {
    return 'status-open'; // Verde
  }
  
  // Si no tiene estado operativo definido, se usa el porcentaje
  if (center.fullnessPercentage < 33) {
    return 'status-critical'; // Rojo
  } else if (center.fullnessPercentage < 66) {
    return 'status-warning'; 	// Naranja
  } else {
    return 'status-ok'; 		// Verde
  }
};

// 🔑 Subcomponente para la capa OMZ
const OMZLayer: React.FC<{ visible: boolean }> = ({ visible }) => {
  const map = useMap();
  useEffect(() => { 
    if (!map || !visible) return;
    // --- Capa de polígonos/zonas/colores ---
    const zonesLayer = new google.maps.Data();

    zonesLayer.loadGeoJson('/data/omz_zones.json');

    zonesLayer.setStyle(feature => {
      const fill = feature.getProperty('fill') as string || '#1E90FF'; //busca en el .json atributo fill. Si existe, usa el color, si no azul
      const stroke = feature.getProperty('stroke') as string || '#000'; //busca el color del borde del polígono. Si no lo encuentra usa negro.
      const strokeW = feature.getProperty('stroke-width') as number || 1; //define el grosor del borde. Si no hay nada en el JSON, le pone 1.
      const fillO = feature.getProperty('fill-opacity') as number || 0.5; //: define la transparencia del relleno (0 = transparente, 1 = sólido). sino dice = 0.5.

      return {
        fillColor: fill,
        strokeColor: stroke,
        strokeWeight: strokeW,
        fillOpacity: fillO,
      };
    });

    zonesLayer.setMap(map);

    // --- Capa de oficinas ---
    const officesLayer = new google.maps.Data();
    officesLayer.loadGeoJson('/data/omz_offices1.json');

    officesLayer.setStyle((feature): google.maps.Data.StyleOptions => {
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

      return {
        visible: false // para no dibujar nada si no es un punto
      };
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

// Se corrige la firma del componente para que acepte las props correctamente
const MapComponent: React.FC<MapComponentProps> = ({ centers }) => {
  const { isAuthenticated } = useAuth();
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [showOMZ, setShowOMZ] = useState(false); // AÑADI HU OMZ

  const centersToDisplay = isAuthenticated
    ? centers
    : centers.filter(center => center.is_active);

  const selectedCenter = centers.find(c => c.center_id === selectedCenterId);

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
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          fullscreenControl={true}
        >
          {centersToDisplay.map(center => (
            <AdvancedMarker
              key={center.center_id}
              position={{ lat: Number(center.latitude), lng: Number(center.longitude) }}
              title={`${center.name} - ${center.operational_status ? formatOperationalStatus(center.operational_status) : `Abastecido al ${center.fullnessPercentage.toFixed(0)}%`}`}
              onClick={() => setSelectedCenterId(center.center_id)}
            >
              <div className={`marker-pin ${getPinStatusClass(center)}`}>
                <span>{center.type === 'Albergue' ? '🏠' : '📦'}</span>
              </div>
            </AdvancedMarker>
          ))}

          {selectedCenter && (
            <InfoWindow
              position={{ lat: Number(selectedCenter.latitude), lng: Number(selectedCenter.longitude) }}
              onCloseClick={() => setSelectedCenterId(null)}
              pixelOffset={[0, -40]}
            >
              <div className="infowindow-content">
                <h4>{selectedCenter.name}</h4>
                <p><strong>Tipo:</strong> {selectedCenter.type}</p>
                <p><strong>Estado:</strong> {getCenterStatus(selectedCenter)}</p>
                
                {/* Se añade la lógica para mostrar el estado operativo y la nota pública */}
                {selectedCenter.operational_status && (
                  <p><strong>Estado Operativo:</strong> {formatOperationalStatus(selectedCenter.operational_status)}</p>
                )}
                
                {selectedCenter.operational_status === 'cerrado temporalmente' && selectedCenter.public_note && (
                  <div className="public-note">
                    <p><strong>Nota:</strong> {selectedCenter.public_note}</p>
                  </div>
                )}

                <p><strong>Nivel de Abastecimiento:</strong> {selectedCenter.fullnessPercentage.toFixed(0)}%</p>
              </div>
            </InfoWindow>
          )}
          {/* Capa OMZ (solo si showOMZ es true) */}
          <OMZLayer visible={showOMZ} />
        </Map>

        {/* Botón para alternar zonas OMZ */}
        <div className="omz-toggle-btn">
          <button onClick={() => setShowOMZ(!showOMZ)}>
            {showOMZ ? 'Ocultar zonas OMZ' : 'Ver zonas OMZ'}
          </button>
        </div>
      </div>
    </APIProvider>
  );
};

export default MapComponent;