    // src/components/map/MapComponent.tsx (Versión final y correcta)
    import React, { useState, useEffect } from 'react';
    import { APIProvider, Map, AdvancedMarker, InfoWindow, Pin} from '@vis.gl/react-google-maps';
    import './MapComponent.css';

  interface Center {
        center_id: string;
        name: string;
        address: string;
        type: 'Acopio' | 'Albergue';
        capacity: number;
        is_active: boolean;
        // Aunque TypeScript los define como number, la DB puede devolverlos como string.
        // La conversión se hará antes de pasarlos al componente de Google Maps.
        latitude: number | string; 
        longitude: number | string;
        fullnessPercentage: number; 
    }
    
    interface MapComponentProps {
    centers: Center[]; // Un array de objetos Center
    }
    
    const apiKey = import.meta.env.VITE_Maps_API_KEY;
    const valparaisoCoords = { lat: -33.04, lng: -71.61 };

    const MapComponent: React.FC<MapComponentProps> = ({centers}) => {
    //const [centes, setCenters] = useState<Center[]>([]);
    const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

    const getPinColor = (percentage: number): string => {
        if (percentage >= 80) {
            return '#4CAF50'; // Verde
        } else if (percentage >= 50 && percentage < 80) {
            return '#FFC107'; // Naranjo
        } else {
            return '#F44336'; // Rojo
        }
    };

    const selectedCenter = centers.find(c => c.center_id === selectedCenterId);

    // Si la clave API no está configurada, muestra un mensaje de error
    if (!apiKey) {
        return <div className="error-message">Error: Falta la Clave API de Google Maps (VITE_Maps_API_KEY). Revisa tu archivo .env.local</div>;
    }


    /*useEffect(() => {
        const apiUrl = 'http://localhost:4000/api/centers';
        fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener datos de la API');
            return response.json();
        })
        .then((data: Center[]) => setCenters(data))
        .catch(error => console.error("Hubo un problema con la llamada fetch:", error));
    }, []);*/
    
    //const selectedCenter = centers.find(c => c.center_id === selectedCenterId);

    return (
        <APIProvider apiKey={apiKey}>
        <div className="map-wrapper w-full h-full rounded-xl overflow-hidden shadow-lg">
            <Map
            defaultCenter={valparaisoCoords}
            defaultZoom={13}
            mapId="appcopio-map-main"
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            fullscreenControl={true}
            style={{ width: '100%', height: '100%' }}
            >
            {/*centers.map(center => (
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
            ))*/}
            {centers.map(center => {
                const pinColor = getPinColor(center.fullnessPercentage); // Get the color based on the percentage
                return (
                    <AdvancedMarker
                        key={center.center_id} // Unique key for React
                        // CRITICAL FIX HERE: Convert latitude and longitude to Number
                        position={{ lat: Number(center.latitude), lng: Number(center.longitude) }} 
                        title={`${center.name} (${center.fullnessPercentage.toFixed(0)}% full)`} // Title on hover
                        onClick={() => setSelectedCenterId(center.center_id)} // On click, select this center
                    >
                        {/* Pin component to customize the marker */}
                        <Pin background={pinColor} // Pin background color
                            borderColor={pinColor} // Pin border color (same as background for a solid color)
                            glyphColor={'#FFF'} // Glyph/icon color inside the pin (white for contrast)
                        />
                    </AdvancedMarker>
                );
            })}

            {selectedCenter && (
                <InfoWindow
                    position={{ lat: Number(selectedCenter.latitude), lng: Number(selectedCenter.longitude) }}
                    onCloseClick={() => setSelectedCenterId(null)} // Close the InfoWindow on click outside
                    pixelOffset={[0, -40]}
                >
                <div className="infowindow-content">
                    <h4>{selectedCenter.name}</h4>
                    <p><strong>Tipo:</strong> {selectedCenter.type}</p>
                    <p><strong>Estado:</strong> {selectedCenter.is_active ? 'Activo' : 'Inactivo'}</p>
                    <p className="text-sm mt-1"><strong>Llenado:</strong> {selectedCenter.fullnessPercentage.toFixed(0)}%</p>
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