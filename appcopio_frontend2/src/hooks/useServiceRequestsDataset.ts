import { useState, useEffect } from 'react';
import { databasesService } from '@/services/databases.service';
import { fieldsService } from '@/services/fields.service';
import { templatesService } from '@/services/template.service';

const SERVICE_REQUESTS_DATASET_KEY = 'solicitudes_servicios';

interface UseServiceRequestsDatasetResult {
  datasetId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook para gestionar el dataset de solicitudes de servicios.
 * Automáticamente crea el dataset si no existe.
 */
export function useServiceRequestsDataset(
  activationId: number | undefined,
  centerId: string | undefined
): UseServiceRequestsDatasetResult {
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!activationId || !centerId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Buscar si ya existe el dataset
        const datasets = await databasesService.listByActivation(activationId, controller.signal);
        const existing = datasets.find(d => d.key === SERVICE_REQUESTS_DATASET_KEY);

        if (existing) {
          setDatasetId(existing.dataset_id);
          setLoading(false);
          return;
        }

        // 2. Si no existe, crearlo
        console.log('📦 Creando dataset de solicitudes de servicios...');
        
        const newDataset = await databasesService.create({
          activation_id: activationId,
          center_id: centerId,
          name: 'Solicitudes de Servicios',
          key: SERVICE_REQUESTS_DATASET_KEY,
          config: { template_key: SERVICE_REQUESTS_DATASET_KEY }
        });

        console.log('✅ Dataset creado:', newDataset.dataset_id);

        // 3. Obtener los campos de la plantilla
        const templateFields = await templatesService.getTemplateFields(SERVICE_REQUESTS_DATASET_KEY);

        // 4. Crear los campos en el dataset
        for (const fieldTemplate of templateFields) {
          await fieldsService.create({
            dataset_id: newDataset.dataset_id,
            name: fieldTemplate.name,
            key: fieldTemplate.key,
            field_type: fieldTemplate.field_type,
            type: fieldTemplate.field_type,
            position: fieldTemplate.position,
            is_required: fieldTemplate.is_required,
            is_multi: fieldTemplate.is_multi || false,
            is_active: true,
            settings: fieldTemplate.settings || {},
            config: fieldTemplate.settings || {},
          });
        }

        console.log('✅ Campos creados exitosamente');

        setDatasetId(newDataset.dataset_id);
      } catch (err: any) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') return;
        
        console.error('❌ Error al configurar dataset de solicitudes:', err);
        setError(err.message || 'Error al configurar el sistema de solicitudes');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activationId, centerId, refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  return { datasetId, loading, error, refresh };
}