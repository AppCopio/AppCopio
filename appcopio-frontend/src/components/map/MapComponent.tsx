import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { useAuth } from '../../contexts/AuthContext';
import './MapComponent.css';

// La interfaz debe ser idéntica a la usada en MapPage
// Es buena práctica tenerla en un archivo compartido (ej: src/types.ts)
interface Center {
    center_id: string;
    name: string;
    address: string;
    type: 'Acopio' | 'Albergue';
    is_active: boolean;
    latitude: number;
    longitude: number;
    fullnessPercentage: number;
}

// Se define la interfaz para las props que el componente recibe
interface MapComponentProps {
  centers: Center[];
}

const apiKey = import.meta.env.VITE_Maps_API_KEY;
const valparaisoCoords = { lat: -33.04, lng: -71.61 };

const getPinStatusClass = (center: Center): string => {
    if (!center.is_active) return 'status-inactive';
    if (center.fullnessPercentage < 33) return 'status-critical';
    if (center.fullnessPercentage < 66) return 'status-warning';
    return 'status-ok';
};

// Se actualiza la firma del componente para aceptar las props
const MapComponent: React.FC<MapComponentProps> = ({ centers }) => {
    const { isAuthenticated } = useAuth();
    // Se elimina el estado 'centers' y el useEffect, ya que los datos ahora vienen de las props.
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
                            title={`${center.name} (${center.fullnessPercentage.toFixed(0)}% abastecido)`}
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
                                <p><strong>Estado:</strong> {selectedCenter.is_active ? 'Activo' : 'Inactivo'}</p>
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