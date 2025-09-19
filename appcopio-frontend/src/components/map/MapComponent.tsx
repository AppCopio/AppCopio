import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
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

// Se corrige la firma del componente para que acepte las props correctamente
const MapComponent: React.FC<MapComponentProps> = ({ centers }) => {
  const { isAuthenticated } = useAuth();
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

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
        </Map>
      </div>
    </APIProvider>
  );
};

export default MapComponent;