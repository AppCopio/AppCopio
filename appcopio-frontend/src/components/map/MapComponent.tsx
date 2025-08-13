// src/components/map/MapComponent.tsx
import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, Pin} from '@vis.gl/react-google-maps';
import { useAuth } from '../../contexts/AuthContext';
import './MapComponent.css';

// 1. La interfaz actualizada con el estado operativo
interface Center {
    center_id: string;
    name: string;
    address: string;
    type: 'Acopio' | 'Albergue';
    is_active: boolean;
    operational_status?: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima';
    public_note?: string;
    latitude: number | string; 
    longitude: number | string;
    fullnessPercentage: number; 
}

const apiKey = (import.meta as any).env.VITE_Maps_API_KEY; // Clave API de Google Maps
const valparaisoCoords = { lat: -33.04, lng: -71.61 };

// 2. MODIFICAMOS LA FUNCIÓN para considerar el estado operativo
const getPinStatusClass = (center: Center): string => {
    if (!center.is_active) {
        return 'status-inactive'; // Gris
    }
    
    // Prioridad al estado operativo
    if (center.operational_status === 'Cerrado Temporalmente') {
        return 'status-temporarily-closed'; // Rojo/naranja especial
    } else if (center.operational_status === 'Capacidad Máxima') {
        return 'status-full-capacity'; // Amarillo especial
    }
    
    // Lógica de clase basada en el porcentaje si está abierto
    if (center.fullnessPercentage < 33) {
        return 'status-critical'; // Rojo
    } else if (center.fullnessPercentage < 66) {
        return 'status-warning';  // Naranja
    } else {
        return 'status-ok';       // Verde
    }
};

const MapComponent: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [centers, setCenters] = useState<Center[]>([]);
    const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

    useEffect(() => {
        const apiUrl = 'http://localhost:4000/api/centers';
        fetch(apiUrl)
        .then(response => response.json())
        .then((data: Center[]) => setCenters(data))
        .catch(error => console.error("Hubo un problema con la llamada fetch:", error));
    }, []);

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
                            {/* 3. AQUÍ ESTÁ EL CAMBIO: Volvemos a usar nuestro DIV personalizado */}
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
                                {selectedCenter.operational_status && (
                                    <p><strong>Estado Operativo:</strong> {selectedCenter.operational_status}</p>
                                )}
                                {selectedCenter.operational_status === 'Cerrado Temporalmente' && selectedCenter.public_note && (
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