import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './SimpleMapComponent.css';

interface Center {
  center_id: string;
  name: string;
  address: string;
  type: string;
  is_active: boolean;
  operational_status?: string;
  public_note?: string;
  latitude: number | string;
  longitude: number | string;
  fullnessPercentage: number;
}

interface SimpleMapComponentProps {
  centers: Center[];
}

const SimpleMapComponent: React.FC<SimpleMapComponentProps> = ({ centers }) => {
  const { isAuthenticated } = useAuth();
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);

  const centersToDisplay = isAuthenticated
    ? centers
    : centers.filter(center => center.is_active);

  const getPinStatusClass = (center: Center): string => {
    if (!center.is_active) {
      return 'status-inactive';
    }
    
    const operationalStatus = center.operational_status?.toLowerCase();
    
    if (operationalStatus === 'cerrado temporalmente') {
      return 'status-temporarily-closed';
    } else if (operationalStatus === 'capacidad maxima' || operationalStatus === 'capacidad máxima') {
      return 'status-full-capacity';
    }
    
    if (center.fullnessPercentage < 33) {
      return 'status-critical';
    } else if (center.fullnessPercentage < 66) {
      return 'status-warning';
    } else {
      return 'status-ok';
    }
  };

  const getStatusText = (center: Center): string => {
    if (!center.is_active) return 'Inactivo';
    
    const operationalStatus = center.operational_status?.toLowerCase();
    if (operationalStatus === 'cerrado temporalmente') return 'Cerrado Temporalmente';
    if (operationalStatus === 'capacidad maxima' || operationalStatus === 'capacidad máxima') return 'Capacidad Máxima';
    
    return 'Activo - Abierto';
  };

  return (
    <div className="simple-map-container">
      <div className="map-section">
        <div className="map-header">
          <h2>Centros en Valparaíso</h2>
          <p>{centersToDisplay.length} centros disponibles</p>
        </div>
        
        <div className="map-layout">
          <div className="centers-sidebar">
            <div className="centers-list">
              {centersToDisplay.map(center => (
                <div 
                  key={center.center_id} 
                  className={`center-item ${selectedCenter?.center_id === center.center_id ? 'selected' : ''}`}
                  onClick={() => setSelectedCenter(center)}
                >
                  <div className={`center-icon ${getPinStatusClass(center)}`}>
                    {center.type?.toLowerCase().includes('albergue') ? '🏠' : '📦'}
                  </div>
                  <div className="center-info">
                    <h4>{center.name}</h4>
                    <p className="center-address">{center.address}</p>
                    <p className="center-status">
                      <span className={`status-badge ${getPinStatusClass(center)}`}>
                        {getStatusText(center)}
                      </span>
                    </p>
                    {center.fullnessPercentage !== undefined && (
                      <p className="center-fullness">{center.fullnessPercentage}% abastecido</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="map-placeholder">
            <div className="interactive-map">
              <div className="map-background">
                <h3>📍 Valparaíso, Chile</h3>
                <p>-33.04°, -71.61°</p>
                
                <div className="pins-container">
                  {centersToDisplay.map((center, index) => (
                    <div 
                      key={center.center_id}
                      className={`map-pin ${getPinStatusClass(center)} ${selectedCenter?.center_id === center.center_id ? 'selected' : ''}`}
                      style={{
                        left: `${20 + (index % 4) * 20}%`,
                        top: `${30 + Math.floor(index / 4) * 25}%`
                      }}
                      onClick={() => setSelectedCenter(center)}
                      title={center.name}
                    >
                      {center.type?.toLowerCase().includes('albergue') ? '🏠' : '📦'}
                    </div>
                  ))}
                </div>

                {selectedCenter && (
                  <div className="info-popup">
                    <button 
                      className="close-popup"
                      onClick={() => setSelectedCenter(null)}
                    >
                      ×
                    </button>
                    <h4>{selectedCenter.name}</h4>
                    <p><strong>Tipo:</strong> {selectedCenter.type}</p>
                    <p><strong>Dirección:</strong> {selectedCenter.address}</p>
                    <p><strong>Estado:</strong> {getStatusText(selectedCenter)}</p>
                    
                    {selectedCenter.operational_status && (
                      <p><strong>Estado operativo:</strong> {selectedCenter.operational_status}</p>
                    )}
                    
                    {selectedCenter.operational_status?.toLowerCase() === 'cerrado temporalmente' && selectedCenter.public_note && (
                      <div className="public-note">
                        <p><strong>Nota:</strong> {selectedCenter.public_note}</p>
                      </div>
                    )}

                    <p><strong>Nivel de abastecimiento:</strong> {selectedCenter.fullnessPercentage}%</p>
                  </div>
                )}
              </div>
            </div>

            <div className="map-footer">
              <p>Vista alternativa del mapa - Los marcadores muestran ubicaciones aproximadas de los centros. Para un mapa interactivo completo, configura la API de Google Maps siguiendo las instrucciones en GOOGLE_MAPS_SETUP.md</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleMapComponent;
