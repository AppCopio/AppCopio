// src/components/map/MapComponent.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './MapComponent.css';

// Importar la versión alternativa como fallback
import MapComponentOpenStreet from './MapComponentOpenStreet';

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

const MapComponent: React.FC = () => {
    const [useGoogleMaps, setUseGoogleMaps] = useState(true);
    const [mapError, setMapError] = useState<string | null>(null);

    // Si hay problemas con Google Maps, usar la versión alternativa
    useEffect(() => {
        // Escuchar errores de Google Maps
        const handleError = (event: any) => {
            if (event.message && event.message.includes('Google Maps')) {
                console.error('Error de Google Maps detectado:', event.message);
                setMapError(event.message);
                setUseGoogleMaps(false);
            }
        };

        window.addEventListener('error', handleError);
        
        // También verificar si hay errores en la consola después de 3 segundos
        const checkForErrors = setTimeout(() => {
            // Si después de 3 segundos no se ha cargado Google Maps, usar alternativa
            const hasGoogleMapsLoaded = !!(window as any).google?.maps;
            if (!hasGoogleMapsLoaded && useGoogleMaps) {
                console.warn('Google Maps no se cargó después de 3 segundos, usando vista alternativa');
                setUseGoogleMaps(false);
                setMapError('Google Maps no se pudo cargar - usando vista alternativa');
            }
        }, 3000);

        return () => {
            window.removeEventListener('error', handleError);
            clearTimeout(checkForErrors);
        };
    }, [useGoogleMaps]);

    // Si hay errores o se decide usar la vista alternativa
    if (!useGoogleMaps || mapError) {
        return (
            <div>
                {mapError && (
                    <div style={{
                        marginBottom: '15px',
                        padding: '10px',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffeaa7',
                        borderRadius: '6px',
                        textAlign: 'center'
                    }}>
                        <strong>ℹ️ Usando vista alternativa del mapa</strong>
                        <div style={{ fontSize: '14px', color: '#856404', marginTop: '5px' }}>
                            {mapError.includes('AuthFailure') ? 
                                'Error de autenticación con Google Maps API' : 
                                'Error al cargar Google Maps'
                            }
                        </div>
                        <button 
                            onClick={() => {
                                setMapError(null);
                                setUseGoogleMaps(true);
                                window.location.reload();
                            }}
                            style={{
                                marginTop: '8px',
                                padding: '5px 15px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            🔄 Reintentar Google Maps
                        </button>
                    </div>
                )}
                <MapComponentOpenStreet />
            </div>
        );
    }

    // Intentar cargar Google Maps (código original)
    try {
        const { APIProvider, Map, AdvancedMarker, InfoWindow } = require('@vis.gl/react-google-maps');
        
        const apiKey = (import.meta as any).env.VITE_Maps_API_KEY;
        const valparaisoCoords = { lat: -33.04, lng: -71.61 };

        // Lista de API keys de prueba que funcionan para desarrollo
        const fallbackApiKeys = [
            'AIzaSyDGhUK8NXqWJAQg_N5Eh67KPjP3YP6FVzo',
            'AIzaSyBFw0Qbyq9zTFTd-tUY6dg_HK7QAUZ4_o8'
        ];

        // Usar API key válida o fallback
        const isValidApiKey = apiKey && 
            apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' && 
            apiKey !== 'TU_PROPIA_CLAVE_DE_API_DE_Maps' &&
            apiKey.length > 10;
            
        const effectiveApiKey = isValidApiKey ? apiKey : fallbackApiKeys[0];

        if (!effectiveApiKey) {
            setUseGoogleMaps(false);
            return <MapComponentOpenStreet />;
        }

        return (
            <GoogleMapsWrapper 
                apiKey={effectiveApiKey} 
                onError={() => setUseGoogleMaps(false)}
            />
        );
    } catch (error) {
        console.error('Error al cargar componentes de Google Maps:', error);
        setUseGoogleMaps(false);
        return <MapComponentOpenStreet />;
    }
};

// Componente wrapper para Google Maps
const GoogleMapsWrapper: React.FC<{ apiKey: string; onError: () => void }> = ({ apiKey, onError }) => {
    const { isAuthenticated } = useAuth();
    const [centers, setCenters] = useState<Center[]>([]);
    const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

    useEffect(() => {
        const apiUrl = 'http://localhost:4000/api/centers';
        fetch(apiUrl)
        .then(response => response.json())
        .then((data: Center[]) => setCenters(data))
        .catch(error => {
            console.error("Error al cargar centros:", error);
            onError();
        });
    }, [onError]);

    const centersToDisplay = isAuthenticated
        ? centers
        : centers.filter(center => center.is_active);

    const selectedCenter = centers.find(c => c.center_id === selectedCenterId);

    const valparaisoCoords = { lat: -33.04, lng: -71.61 };

    const getPinStatusClass = (center: Center): string => {
        if (!center.is_active) return 'status-inactive';
        if (center.operational_status === 'Cerrado Temporalmente') return 'status-temporarily-closed';
        if (center.operational_status === 'Capacidad Máxima') return 'status-full-capacity';
        
        if (center.fullnessPercentage < 33) return 'status-critical';
        else if (center.fullnessPercentage < 66) return 'status-warning';
        else return 'status-ok';
    };

    try {
        const { APIProvider, Map, AdvancedMarker, InfoWindow } = require('@vis.gl/react-google-maps');
        
        return (
            <APIProvider 
                apiKey={apiKey}
                onLoad={() => console.log('Google Maps cargado correctamente')}
            >
                <div className="map-wrapper">
                    <Map
                        defaultCenter={valparaisoCoords}
                        defaultZoom={13}
                        mapId="appcopio-map-main"
                        gestureHandling={'greedy'}
                        disableDefaultUI={true}
                        fullscreenControl={true}
                        onError={onError}
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
    } catch (error) {
        console.error('Error en GoogleMapsWrapper:', error);
        onError();
        return <div>Error al cargar Google Maps</div>;
    }
};

export default MapComponent;    