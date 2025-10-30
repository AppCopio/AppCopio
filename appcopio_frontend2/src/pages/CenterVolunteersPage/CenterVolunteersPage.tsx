// src/pages/CenterVolunteersPage/CenterVolunteersPage.tsx
/**
 * Página para gestionar voluntarios de un centro
 * Accesible desde el panel operativo del centro
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import VolunteerManagementPanel from '@/components/volunteers/VolunteerManagementPanel';
import { useActivation } from '@/contexts/ActivationContext';
import { getOneCenter } from '@/services/centers.service';
import type { Center } from '@/types/center';

export default function CenterVolunteersPage() {
  const { centerId } = useParams<{ centerId: string }>();
  const { activation, loading: activationLoading } = useActivation();
  const [center, setCenter] = React.useState<Center | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Cargar información del centro
  React.useEffect(() => {
    if (!centerId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getOneCenter(centerId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCenter(data as Center);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Error cargando centro:', err);
          setError(err?.message || 'Error al cargar la información del centro');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [centerId]);

  // Estado de carga
  if (activationLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Sin centro
  if (!center || !centerId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">No se encontró el centro</Alert>
      </Box>
    );
  }

  // Verificar que sea un albergue
  if (center.type !== 'Albergue' && center.type !== 'Acopio') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          La gestión de voluntarios solo está disponible para albergues.
          Este centro es de tipo: <strong>{center.type}</strong>
        </Alert>
      </Box>
    );
  }

  // Mostrar panel de gestión
  return (
    <Box sx={{ width: '100%' }}>
      {/* Nota informativa si no hay activación */}
      {!activation && (
        <Box sx={{ p: 3, pb: 0 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Este centro no tiene una activación activa, pero puedes gestionar los voluntarios
            que se han registrado.
          </Alert>
        </Box>
      )}

      {/* Panel de gestión de voluntarios */}
      <VolunteerManagementPanel
        centerId={centerId}
        centerName={center.name}
      />
    </Box>
  );
}