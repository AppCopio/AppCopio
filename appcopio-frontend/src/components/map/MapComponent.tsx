    // src/components/map/MapComponent.tsx (Versión final y correcta)
    import React, { useState, useEffect } from 'react';
    import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
    import './MapComponent.css';

    interface Center {
    center_id: string;
    name: string;
    address: string;
    type: 'Acopio' | 'Albergue';
    capacity: number;
    is_active: boolean;
    latitude: string | number;
    longitude: string | number;
    }
    const apiKey = import.meta.env.VITE_Maps_API_KEY;
    const valparaisoCoords = { lat: -33.04, lng: -71.61 };

    const MapComponent: React.FC = () => {
    const [centers, setCenters] = useState<Center[]>([]);
    const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

    useEffect(() => {
        const apiUrl = 'http://localhost:4000/api/centers';
        fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener datos de la API');
            return response.json();
        })
        .then((data: Center[]) => setCenters(data))
        .catch(error => console.error("Hubo un problema con la llamada fetch:", error));
    }, []);

    if (!apiKey) {
        return <div className="error-message">Error: Falta la Clave API de Google Maps. Revisa el archivo .env.local</div>;
    }
    
    const selectedCenter = centers.find(c => c.center_id === selectedCenterId);

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
            {centers.map(center => (
                <AdvancedMarker
                key={center.center_id}
                position={{ lat: Number(center.latitude), lng: Number(center.longitude) }}
                title={center.name}
                onClick={() => setSelectedCenterId(center.center_id)}
                >
                <div className={`marker-pin ${center.is_active ? 'active' : 'inactive'}`}>
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
                    <p>{selectedCenter.address}</p>
                </div>
                </InfoWindow>
            )}
            </Map>
        </div>
        </APIProvider>
    );
    };

    export default MapComponent;