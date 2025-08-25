// MapComponent usando Leaflet (OpenStreetMap) como alternativa a Google Maps
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './MapComponent.css';

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

const MapComponentOpenStreet: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [centers, setCenters] = useState<Center[]>([]);
    const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);

    useEffect(() => {
        const apiUrl = 'http://localhost:4000/api/centers';
        fetch(apiUrl)
        .then(response => response.json())
        .then((data: Center[]) => setCenters(data))
        .catch(error => console.error("Error al cargar centros:", error));
    }, []);

    const centersToDisplay = isAuthenticated
        ? centers
        : centers.filter(center => center.is_active);

    const getPinStatusColor = (center: Center): string => {
        if (!center.is_active) return '#6c757d';
        if (center.operational_status === 'Cerrado Temporalmente') return '#fd7e14';
        if (center.operational_status === 'Capacidad Máxima') return '#ffc107';
        
        if (center.fullnessPercentage < 33) return '#dc3545';
        else if (center.fullnessPercentage < 66) return '#fd7e14';
        else return '#28a745';
    };

    // Coordenadas de Valparaíso
    const valparaisoLat = -33.04;
    const valparaisoLng = -71.61;

    return (
        <div className="map-wrapper">
            <div style={{
                display: 'flex',
                height: '600px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#f8f9fa'
            }}>
                {/* Panel izquierdo - Lista de centros */}
                <div style={{
                    width: '400px',
                    backgroundColor: 'white',
                    borderRight: '2px solid #ddd',
                    overflow: 'auto'
                }}>
                    <div style={{
                        padding: '15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                    }}>
                        <h3 style={{ margin: 0 }}>📍 Centros en Valparaíso</h3>
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                            {centersToDisplay.length} centros disponibles
                        </p>
                    </div>

                    <div style={{ padding: '10px' }}>
                        {centersToDisplay.map((center) => (
                            <div 
                                key={center.center_id}
                                onClick={() => setSelectedCenter(center)}
                                style={{
                                    padding: '12px',
                                    marginBottom: '8px',
                                    backgroundColor: selectedCenter?.center_id === center.center_id ? '#e3f2fd' : '#f8f9fa',
                                    borderRadius: '6px',
                                    border: `2px solid ${selectedCenter?.center_id === center.center_id ? '#2196f3' : 'transparent'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    borderLeft: `4px solid ${getPinStatusColor(center)}`
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedCenter?.center_id !== center.center_id) {
                                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedCenter?.center_id !== center.center_id) {
                                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '20px', marginRight: '8px' }}>
                                        {center.type === 'Albergue' ? '🏠' : '📦'}
                                    </span>
                                    <strong style={{ fontSize: '16px' }}>{center.name}</strong>
                                </div>
                                
                                <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                                    <div style={{ marginBottom: '3px' }}>📍 {center.address}</div>
                                    <div style={{ marginBottom: '3px' }}>
                                        📊 {center.fullnessPercentage.toFixed(0)}% abastecido
                                    </div>
                                    <div style={{ marginBottom: '3px' }}>
                                        🏷️ {center.is_active ? 'Activo' : 'Inactivo'}
                                        {center.operational_status && ` - ${center.operational_status}`}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>
                                        📍 {Number(center.latitude).toFixed(4)}, {Number(center.longitude).toFixed(4)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Panel derecho - Detalles del centro seleccionado */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Simulación de mapa */}
                    <div style={{
                        flex: 1,
                        backgroundColor: '#e3f2fd',
                        backgroundImage: `
                            radial-gradient(circle at 25% 25%, #bbdefb 2px, transparent 2px),
                            radial-gradient(circle at 75% 75%, #90caf9 2px, transparent 2px)
                        `,
                        backgroundSize: '50px 50px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {/* Indicador de Valparaíso */}
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            padding: '10px 15px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}>
                            🗺️ Valparaíso, Chile<br/>
                            <small style={{ fontWeight: 'normal' }}>
                                {valparaisoLat}°, {valparaisoLng}°
                            </small>
                        </div>

                        {/* Marcadores simulados */}
                        {centersToDisplay.slice(0, 5).map((center, index) => (
                            <div
                                key={center.center_id}
                                onClick={() => setSelectedCenter(center)}
                                style={{
                                    position: 'absolute',
                                    left: `${30 + index * 15}%`,
                                    top: `${40 + (index % 2) * 20}%`,
                                    width: '30px',
                                    height: '30px',
                                    backgroundColor: getPinStatusColor(center),
                                    borderRadius: '50% 50% 50% 0',
                                    transform: 'rotate(-45deg)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                    transition: 'transform 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'rotate(-45deg) scale(1.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'rotate(-45deg) scale(1)';
                                }}
                            >
                                <span style={{
                                    transform: 'rotate(45deg)',
                                    fontSize: '16px'
                                }}>
                                    {center.type === 'Albergue' ? '🏠' : '📦'}
                                </span>
                            </div>
                        ))}

                        {!selectedCenter && (
                            <div style={{
                                textAlign: 'center',
                                color: '#666',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                padding: '20px',
                                borderRadius: '8px',
                                maxWidth: '300px'
                            }}>
                                <h3>🗺️ Mapa Interactivo</h3>
                                <p>Haz clic en un centro de la lista para ver sus detalles</p>
                                <p><small>Los marcadores muestran la ubicación aproximada de cada centro</small></p>
                            </div>
                        )}
                    </div>

                    {/* Panel de detalles */}
                    {selectedCenter && (
                        <div className="map-details-panel" style={{
                            backgroundColor: 'white',
                            color: '#333',
                            padding: '20px',
                            borderTop: '2px solid #ddd',
                            maxHeight: '200px',
                            overflow: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div className="map-details-text" style={{ flex: 1, color: '#333' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#333 !important' }}>
                                        {selectedCenter.type === 'Albergue' ? '🏠' : '📦'} {selectedCenter.name}
                                    </h4>
                                    
                                    <div className="map-details-text" style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                                        <div style={{ color: '#333 !important' }}><strong style={{ color: '#222 !important' }}>📍 Dirección:</strong> {selectedCenter.address}</div>
                                        <div style={{ color: '#333 !important' }}><strong style={{ color: '#222 !important' }}>🏷️ Tipo:</strong> {selectedCenter.type}</div>
                                        <div style={{ color: '#333 !important' }}><strong style={{ color: '#222 !important' }}>📊 Nivel de abastecimiento:</strong> 
                                            <span style={{ 
                                                color: getPinStatusColor(selectedCenter),
                                                fontWeight: 'bold',
                                                marginLeft: '5px'
                                            }}>
                                                {selectedCenter.fullnessPercentage.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div style={{ color: '#333 !important' }}><strong style={{ color: '#222 !important' }}>🔄 Estado:</strong> {selectedCenter.is_active ? 'Activo' : 'Inactivo'}</div>
                                        {selectedCenter.operational_status && (
                                            <div style={{ color: '#333 !important' }}><strong style={{ color: '#222 !important' }}>🏥 Estado operativo:</strong> {selectedCenter.operational_status}</div>
                                        )}
                                        {selectedCenter.public_note && (
                                            <div style={{ 
                                                marginTop: '8px',
                                                padding: '8px',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '4px',
                                                fontStyle: 'italic',
                                                color: '#333 !important'
                                            }}>
                                                <strong style={{ color: '#222 !important' }}>💬 Nota:</strong> <span style={{ color: '#333 !important' }}>{selectedCenter.public_note}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => setSelectedCenter(null)}
                                    style={{
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '5px 10px',
                                        cursor: 'pointer',
                                        marginLeft: '15px'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '6px',
                fontSize: '14px',
                textAlign: 'center'
            }}>
                ℹ️ <strong>Vista alternativa del mapa</strong> - Los marcadores muestran ubicaciones aproximadas de los centros.
                Para un mapa interactivo completo, configura la API de Google Maps siguiendo las instrucciones en <code>GOOGLE_MAPS_SETUP.md</code>
            </div>
        </div>
    );
};

export default MapComponentOpenStreet;
