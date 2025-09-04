import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import OperationalStatusControl from '../../components/center/OperationalStatusControl';
import './CenterDetailsPage.css';

// Función para mapear estados del frontend al backend
const mapStatusToBackend = (status: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima'): string => {
  switch (status) {
    case 'Abierto':
      return 'abierto';
    case 'Cerrado Temporalmente':
      return 'cerrado temporalmente';
    case 'Capacidad Máxima':
      return 'capacidad maxima';
    default:
      return status;
  }
};

// Función para mapear estados del backend al frontend  
const mapStatusToFrontend = (status?: string): 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima' | undefined => {
  if (!status) return undefined;
  
  switch (status) {
    case 'abierto':
      return 'Abierto';
    case 'cerrado temporalmente':
      return 'Cerrado Temporalmente';
    case 'capacidad maxima':
      return 'Capacidad Máxima';
    default:
      return undefined;
  }
};

import { getUser } from "../../services/usersApi";
import { fetchWithAbort } from '../../services/api';

import ResponsibleSection from './ResponsibleSection';
import AssignResponsibleDialog from './AssingResponsibleDialog';

import { useActivation } from "../../contexts/ActivationContext";
import { Button } from "@mui/material";
// Importa los componentes de catastro
import CenterCatastroDetails from './CenterCatastroDetails';
import './CenterCatastroDetails.css'; // Importa el nuevo CSS

interface CenterDetails {
  center_id: string;
  name: string;
  address: string;
  type: 'Acopio' | 'Albergue';
  capacity: number;
  is_active: boolean;
  operational_status?: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima';
  public_note?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  fullnessPercentage?: number;

  municipal_manager_id?: number | null;
  comunity_charge_id?: number | null;

  // Propiedades de la tabla CentersDescription
  [key: string]: any;
}

interface Resource {
  item_id: string;
  name: string;
  category: string;
  quantity: number;
}

type AssignRole = "trabajador municipal" | "contacto ciudadano";

const CenterDetailsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;
  
  const [center, setCenter] = useState<CenterDetails | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingOperationalStatus, setIsUpdatingOperationalStatus] = useState<boolean>(false);

  const { activation } = useActivation();



  useEffect(() => {
    const fetchCenterDetails = async () => {
      if (!centerId) return;

      setIsLoading(true);
      setError(null);

      try {
        const controller = new AbortController();
        
        // 1. Obtener detalles del centro (ahora incluye la tabla CentersDescription)
        const centerResponse = await fetchWithAbort<CenterDetails>(
          `${apiUrl}/centers/${centerId}`,
          controller.signal
        );
        
        // Mapear el estado operativo del backend al frontend
        const mappedCenter = {
          ...centerResponse,
          operational_status: mapStatusToFrontend(centerResponse.operational_status as string)
        };
        
        setCenter(mappedCenter);

        // 2. Obtener inventario del centro
        const resourcesResponse = await fetchWithAbort<Resource[]>(
          `${apiUrl}/centers/${centerId}/inventory`,
          controller.signal
        );
        setResources(resourcesResponse || []);

      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error al cargar los detalles del centro:', err);
          setError('No se pudieron cargar los detalles actualizados. Revisa tu conexión.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchCenterDetails();
  }, [centerId, apiUrl]);


  const handleOperationalStatusChange = async (newStatus: 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima', publicNote?: string) => {
    if (!center || !centerId) return;

    setIsUpdatingOperationalStatus(true);

    try {
      const backendStatus = mapStatusToBackend(newStatus);
      
      console.log(`🔍 Intentando cambiar estado del centro ${centerId}:`);
      console.log(`   - Estado frontend: ${newStatus}`);
      console.log(`   - Estado backend: ${backendStatus}`);
      console.log(`   - Nota: ${publicNote || 'Sin nota'}`);
      
      const response = await fetch(`${apiUrl}/centers/${centerId}/operational-status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Incluir cookies de autenticación
        body: JSON.stringify({ 
          operationalStatus: backendStatus,
          publicNote: publicNote || ''
        }),
      });

      console.log(`📝 Response status: ${response.status}`);
      console.log(`📝 Response headers:`, response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error response text:`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new Error(errorData.message || 'No se pudo actualizar el estado operativo');
      }

      const responseData = await response.json();
      console.log(`✅ Success response:`, responseData);

      setCenter(prev => prev ? { 
        ...prev, 
        operational_status: newStatus,
        public_note: newStatus === 'Cerrado Temporalmente' ? publicNote : undefined
      } : null);
      
      alert(`Estado operativo actualizado a "${newStatus}" exitosamente`);
    } catch (err) {
      console.error('❌ Error al actualizar el estado operativo:', err);
      console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack');
      
      const errorMessage = err instanceof Error ? err.message : 'No se pudo actualizar el estado operativo';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsUpdatingOperationalStatus(false);
    }
  };

  const [assignRole, setAssignRole] = useState<AssignRole | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const openAssign = (role: AssignRole) => {
    setAssignRole(role);
    setAssignOpen(true);
  };

  const closeAssign = () => setAssignOpen(false);

  const groupedResources = resources.reduce((acc, resource) => {
    if (!acc[resource.category]) {
      acc[resource.category] = [];
    }
    acc[resource.category].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  const getStatusText = (isActive: boolean) => isActive ? 'Activo' : 'Inactivo';
  const getStatusClass = (isActive: boolean) => isActive ? 'status-active' : 'status-inactive';
  const getOperationalStatusClass = (status: string) => {
    switch (status) {
      case 'Abierto': return 'operational-open';
      case 'Cerrado Temporalmente': return 'operational-closed';
      case 'Capacidad Máxima': return 'operational-full';
      default: return 'operational-unknown';
    }
  };

  if (isLoading) {
    return <div className="center-details-container loading">Cargando detalles del centro...</div>;
  }
  if (error || !center) {
    return (
      <div className="center-details-container">
        <div className="error-message">{error || 'Centro no encontrado'}</div>
        <button onClick={() => navigate(-1)} className="back-button">Volver</button>
      </div>
    );
  }

  return (
    <div className="center-details-container">
      <div className="center-details-header">
        <button onClick={() => navigate(-1)} className="back-button">← Volver</button>
        <h1>Detalles del Centro</h1>
        <Link to={`/admin/centers/${centerId}/edit`} className="edit-button">Editar Detalles</Link>
      </div>

      <div className="center-details-content">
        <div className="center-info-section">
          <div className="center-basic-info">
            <h2>{center.name}</h2>
            <div className="info-grid">
              <div className="info-item"><label>Dirección:</label><span>{center.address}</span></div>
              <div className="info-item"><label>Tipo:</label><span className={`type-badge ${center.type.toLowerCase()}`}>{center.type}</span></div>
              <div className="info-item"><label>Capacidad:</label><span>{center.capacity} personas</span></div>
              <div className="info-item"><label>Estado Actual:</label><span className={`status-badge ${getStatusClass(center.is_active)}`}>{getStatusText(center.is_active)}</span></div>
              {center.fullnessPercentage !== undefined && (<div className="info-item"><label>Nivel de Abastecimiento:</label><span className="fullness-percentage">{center.fullnessPercentage.toFixed(1)}%</span></div>)}
              {center.operational_status && (<div className="info-item"><label>Estado Operativo:</label><span className={`operational-status-badge ${getOperationalStatusClass(center.operational_status)}`}>{center.operational_status}</span></div>)}
              {center.operational_status === 'Cerrado Temporalmente' && center.public_note && (<div className="info-item"><label>Información adicional:</label><div className="public-note-display">{center.public_note}</div></div>)}
            </div>
            {/* Mostrar control de estado operativo para encargados de centros */}
            {(user?.role_name === 'Encargado' || user?.role_name === 'Trabajador Municipal' || user?.role_name === 'Contacto Ciudadano') && center.operational_status && (
              <OperationalStatusControl
                centerId={centerId!}
                currentStatus={center.operational_status}
                currentNote={center.public_note}
                onStatusChange={handleOperationalStatusChange}
                isUpdating={isUpdatingOperationalStatus}
              />
            )}
          </div>
        </div>

        {/* Nueva sección con los detalles del catastro */}
        <CenterCatastroDetails centerData={center} />

        <div className="resources-section">
          <h3>Recursos Disponibles</h3>
          {Object.keys(groupedResources).length === 0 ? (
            <div className="no-resources"><p>No hay recursos registrados en este centro.</p></div>
          ) : (
            <div className="resources-grid">
              {Object.entries(groupedResources).map(([category, items]) => (
                <div key={category} className="resource-category">
                  <h4>{category}</h4>
                  <div className="resource-items">
                    {items.map(item => (<div key={item.item_id} className="resource-item"><span className="resource-name">{item.name}</span><span className="resource-quantity">{item.quantity}</span></div>))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="responsible-section">
          <h3>Responsable</h3>
          <div className="responsible-info">
            <ResponsibleSection
              municipalId={center.municipal_manager_id}
              comunityId={center.comunity_charge_id}
              onAssignMunicipal={() => openAssign("trabajador municipal")}
              onAssignCommunity={() => openAssign("contacto ciudadano")}
            />
            <AssignResponsibleDialog
              open={assignOpen}
              onClose={closeAssign}
              centerId={centerId!}
              role={assignRole}
              onSuccess={async () => {
                closeAssign();
                try {
                  const r = await fetch(`${apiUrl}/centers/${centerId}`);
                  if (r.ok) setCenter(await r.json());
                } catch {}
              }}
            />
            {activation && (
              <Button
                variant="contained"
                onClick={() => navigate(`/center/${center.center_id}/fibe`)}
              >
                Formulario FIBE
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CenterDetailsPage;