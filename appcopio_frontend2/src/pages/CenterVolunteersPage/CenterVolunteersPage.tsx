import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  Card,
  CardContent,
  Stack,
  Chip
} from '@mui/material';
import { 
  VolunteerActivism as VolunteerIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useActivation } from '@/contexts/ActivationContext';
import { getOneCenter } from '@/services/centers.service';
import VolunteerContactPanel from '@/components/volunteers/VolunteerContactPanel';
import type { CenterData } from '@/types/center';
import { useScrollToTop } from '@/hooks/useScrollToTop';

export default function CenterVolunteersPage() {
  useScrollToTop({ behavior: 'smooth' });
  const { centerId } = useParams<{ centerId: string }>();
  const { activation, loading: activationLoading } = useActivation();
  const [center, setCenter] = React.useState<CenterData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  if (!center || !activation) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert severity="info">No se encontraron datos del centro o la activación.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <VolunteerIcon sx={{ fontSize: 48, color: 'white' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: 'white', mb: 0.5 }}>
                Gestión de Voluntarios
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  {center.name}
                </Typography>
                <Chip 
                  icon={<GroupIcon />}
                  label="Servicios Voluntarios" 
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Panel principal */}
      <VolunteerContactPanel activationId={activation.activation_id} />
    </Box>
  );
}