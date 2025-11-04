import React, { useState, useEffect } from 'react';
import { listCenters, getActiveActivation } from '@/services/centers.service';
import { databasesService } from '@/services/databases.service';
import { recordsService } from '@/services/records.service';
import type { DatabaseRecord } from '@/types/record';
import type { Center } from '@/types/center';
import './ServiceRequestsSection.css';

const SERVICE_REQUESTS_DATASET_KEY = 'solicitudes_servicios';

const CATEGORY_ICONS: Record<string, string> = {
  salud: '🏥',
  psicologia: '🧠',
  alimentacion: '🍽️',
  limpieza: '🧹',
  transporte: '🚐',
  educacion: '📚',
  legal: '⚖️',
  mantenimiento: '🔧',
  otro: '📋',
};

const CATEGORY_LABELS: Record<string, string> = {
  salud: 'Salud',
  psicologia: 'Psicología',
  alimentacion: 'Alimentación',
  limpieza: 'Limpieza',
  transporte: 'Transporte',
  educacion: 'Educación',
  legal: 'Legal',
  mantenimiento: 'Mantenimiento',
  otro: 'Otro',
};

const PRIORITY_CONFIG = {
  alta: { label: 'Alta', icon: '🔴', className: 'alta' },
  media: { label: 'Media', icon: '🟡', className: 'media' },
  baja: { label: 'Baja', icon: '🟢', className: 'baja' },
};

interface CenterWithActivation extends Center {
  activation_id: number;
}

interface ServiceRequestWithCenter extends DatabaseRecord {
  center_name?: string;
  center_address?: string;
}

export default function ServiceRequestsSection() {
  const [requests, setRequests] = useState<ServiceRequestWithCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchRequests = async () => {
      try {
        setIsLoading(true);

        // 1. Obtener todos los centros
        const allCenters = await listCenters(controller.signal);

        // 2. Para cada centro, verificar si tiene activación activa
        const centersWithActivation: CenterWithActivation[] = [];
        
        for (const center of allCenters) {
          try {
            const activation = await getActiveActivation(center.center_id, {
              signal: controller.signal
            });
            
            if (activation) {
              centersWithActivation.push({
                ...center,
                activation_id: activation.activation_id
              });
            }
          } catch (err) {
            // Continuar con el siguiente centro si hay error
            console.error(`Error checking activation for center ${center.center_id}:`, err);
          }
        }

        if (centersWithActivation.length === 0) {
          setRequests([]);
          setIsLoading(false);
          return;
        }

        // 3. Para cada centro activo, obtener sus solicitudes
        const allRequests: ServiceRequestWithCenter[] = [];

        for (const center of centersWithActivation) {
          try {
            // Obtener datasets de la activación
            const datasets = await databasesService.listByActivation(
              center.activation_id,
              controller.signal
            );

            // Buscar el dataset de solicitudes
            const serviceDataset = datasets.find(d => d.key === SERVICE_REQUESTS_DATASET_KEY);
            
            if (!serviceDataset) continue;

            // Obtener los registros del dataset
            const recordsPage = await recordsService.list(serviceDataset.dataset_id);
            
            // Filtrar solo solicitudes activas (pendientes o en progreso)
            const activeRecords = recordsPage.items.filter(
              (record: DatabaseRecord) =>
                record.data.estado === 'pendiente' ||
                record.data.estado === 'en_progreso'
            );

            // Agregar información del centro a cada registro
            const recordsWithCenter = activeRecords.map((record: DatabaseRecord) => ({
              ...record,
              center_name: center.name,
              center_address: center.address || undefined,
            }));

            allRequests.push(...recordsWithCenter);
          } catch (err) {
            console.error(`Error fetching requests for center ${center.center_id}:`, err);
            // Continuar con el siguiente centro
          }
        }

        // 4. Ordenar por prioridad y fecha
        const priorityOrder: Record<string, number> = { alta: 1, media: 2, baja: 3 };
        allRequests.sort((a, b) => {
          const priorityA = priorityOrder[a.data.prioridad as string] ?? 99;
          const priorityB = priorityOrder[b.data.prioridad as string] ?? 99;
          
          if (priorityA !== priorityB) return priorityA - priorityB;
          
          // Si tienen la misma prioridad, ordenar por fecha (más reciente primero)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setRequests(allRequests);
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'CanceledError') return;
        console.error('Error fetching service requests:', error);
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();

    // Refrescar cada 30 segundos
    const interval = setInterval(fetchRequests, 30000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="service-requests-section">
        <p className="loading-text">Cargando solicitudes...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="service-requests-section">
        <p className="no-requests-text">
          No hay solicitudes de servicios activas en este momento.
        </p>
      </div>
    );
  }

  // Agrupar por prioridad
  const byPriority = {
    alta: requests.filter((r) => r.data.prioridad === 'alta'),
    media: requests.filter((r) => r.data.prioridad === 'media'),
    baja: requests.filter((r) => r.data.prioridad === 'baja'),
  };

  return (
    <div className="service-requests-section">
      <div className="service-requests-title-separator">
        <hr className="separator-line" />
        <h4 className="service-requests-section-title">🤝 Servicios Solicitados</h4>
      </div>

      {(['alta', 'media', 'baja'] as const).map((priority) => {
        const priorityRequests = byPriority[priority];
        if (priorityRequests.length === 0) return null;

        const config = PRIORITY_CONFIG[priority];

        return (
          <div key={priority} className="priority-group">
            <h5 className={`priority-header ${config.className}`}>
              <span className="priority-icon">{config.icon}</span>
              Prioridad {config.label}
            </h5>

            {priorityRequests.map((request) => (
              <ServiceRequestCard key={request.record_id} request={request} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

interface ServiceRequestCardProps {
  request: ServiceRequestWithCenter;
}

function ServiceRequestCard({ request }: ServiceRequestCardProps) {
  const categoryIcon = CATEGORY_ICONS[request.data.categoria] || '📋';
  const categoryLabel = CATEGORY_LABELS[request.data.categoria] || 'Otro';

  return (
    <div className="service-request-card">
      <div className="service-request-header">
        <div className="category-badge">
          <span className="category-icon">{categoryIcon}</span>
          <span className="category-label">{categoryLabel}</span>
        </div>
        {request.data.estado === 'en_progreso' && (
          <span className="status-badge in-progress">En progreso</span>
        )}
      </div>

      <h6 className="service-request-title">{request.data.titulo}</h6>
      
      <p className="service-request-description">{request.data.descripcion}</p>

      {request.center_name && (
        <div className="service-request-footer">
          <span className="center-info">
            📍 {request.center_name}
          </span>
        </div>
      )}
    </div>
  );
}