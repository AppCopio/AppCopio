import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import { useActivation } from '@/contexts/ActivationContext';
import { getOneCenter } from '@/services/centers.service';
import type { Center } from '@/types/center';
import VolunteerContactPanel from '@/components/volunteers/VolunteerContactPanel';
import type { CenterData } from '@/types/center';

export default function CenterVolunteersPage() {
  const { centerId } = useParams<{ centerId: string }>();
  const { activation, loading: activationLoading } = useActivation();
  const [center, setCenter] = React.useState<CenterData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // --- AÑADIR ESTE USEEFFECT ---
  React.useEffect(() => {
    if (centerId) {
      const fetchCenter = async () => {
        try {
          setLoading(true);
          setError(null);
          const centerData = await getOneCenter(centerId);
          setCenter(centerData);
        } catch (err: any) {
          setError(err.message || 'Error al cargar el centro');
        } finally {
          setLoading(false);
        }
      };
      fetchCenter();
    }
  }, [centerId]);
  if (loading || activationLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  if (!center || !activation) {
    return <Alert severity="info">No se encontraron datos del centro o la activación.</Alert>;
  }
  // Mostrar panel de gestión
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Voluntarios
      </Typography>
      <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
        {center.name}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={0}>
          <Tab label="Solicitudes de Contacto" />
        </Tabs>
      </Box>

      {/* Cargamos el NUEVO panel pasando el activation.id */}
      <VolunteerContactPanel activationId={activation.activation_id} />

      {/* ELIMINAR EL CÓDIGO ANTIGUO de VolunteerManagementPanel */}
    </Box>
  );
}