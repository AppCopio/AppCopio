import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Alert,
  Card,
  CardContent,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Check as CheckIcon } from '@mui/icons-material';
import { recordsService } from '@/services/records.service';
import { useServiceRequestsDataset } from '@/hooks/useServiceRequestsDataset';

interface CreateServiceRequestFormProps {
  centerId: string;
  activationId: number;
  onSuccess?: () => void;
}

type ServiceCategory = 'salud' | 'psicologia' | 'alimentacion' | 'limpieza' | 'transporte' | 'educacion' | 'legal' | 'mantenimiento' | 'otro';
type ServicePriority = 'alta' | 'media' | 'baja';

const CATEGORIES: { value: ServiceCategory; label: string; icon: string }[] = [
  { value: 'salud', label: 'Salud', icon: '🏥' },
  { value: 'psicologia', label: 'Psicología', icon: '🧠' },
  { value: 'alimentacion', label: 'Alimentación', icon: '🍽️' },
  { value: 'limpieza', label: 'Limpieza', icon: '🧹' },
  { value: 'transporte', label: 'Transporte', icon: '🚐' },
  { value: 'educacion', label: 'Educación', icon: '📚' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧' },
  { value: 'otro', label: 'Otro', icon: '📋' },
];

const PRIORITIES: { value: ServicePriority; label: string; color: string }[] = [
  { value: 'alta', label: 'Alta', color: '#d32f2f' },
  { value: 'media', label: 'Media', color: '#ed6c02' },
  { value: 'baja', label: 'Baja', color: '#2e7d32' },
];

export default function CreateServiceRequestForm({
  centerId,
  activationId,
  onSuccess,
}: CreateServiceRequestFormProps) {
  // Obtener o crear el dataset automáticamente
  const { datasetId, loading: datasetLoading, error: datasetError } = useServiceRequestsDataset(
    activationId,
    centerId
  );

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<ServiceCategory>('otro');
  const [prioridad, setPrioridad] = useState<ServicePriority>('media');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!datasetId) {
      setSubmitError('El sistema de solicitudes no está disponible');
      return;
    }

    if (!titulo.trim() || !descripcion.trim()) {
      setSubmitError('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Crear el registro en el dataset
      await recordsService.create(
        datasetId,
        activationId,
        {
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          categoria: categoria,
          prioridad: prioridad,
          estado: 'pendiente', // Siempre inicia como pendiente
          notas: null,
        }
      );

      setSubmitSuccess(true);
      
      // Reset form después de 2 segundos
      setTimeout(() => {
        setTitulo('');
        setDescripcion('');
        setCategoria('otro');
        setPrioridad('media');
        setSubmitSuccess(false);
        onSuccess?.();
      }, 2000);

    } catch (error: any) {
      console.error('Error al crear solicitud:', error);
      setSubmitError(error.response?.data?.message || error.message || 'Error al crear la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estados de carga
  if (datasetLoading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Configurando sistema de solicitudes...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (datasetError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Error al configurar el sistema: {datasetError}
      </Alert>
    );
  }

  if (submitSuccess) {
    return (
      <Alert 
        severity="success" 
        icon={<CheckIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="body1" fontWeight={600}>
          ¡Solicitud creada exitosamente!
        </Typography>
        <Typography variant="body2">
          Tu solicitud de servicio ha sido registrada y será visible para la comunidad.
        </Typography>
      </Alert>
    );
  }

  const isFormValid = titulo.trim().length > 0 && descripcion.trim().length > 0;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Solicitar Servicio
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Crea una solicitud para que la comunidad pueda ver qué servicios necesita este centro.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {/* Título */}
            <TextField
              fullWidth
              label="Título de la solicitud"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Necesitamos enfermero/a para turno mañana"
              required
              disabled={isSubmitting}
              inputProps={{ maxLength: 100 }}
              helperText={`${titulo.length}/100 caracteres`}
            />

            {/* Descripción */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Descripción detallada"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el servicio que necesitas, horarios, requisitos, etc."
              required
              disabled={isSubmitting}
              inputProps={{ maxLength: 500 }}
              helperText={`${descripcion.length}/500 caracteres`}
            />

            {/* Categoría */}
            <TextField
              fullWidth
              select
              label="Categoría"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as ServiceCategory)}
              disabled={isSubmitting}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {/* Prioridad */}
            <TextField
              fullWidth
              select
              label="Prioridad"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as ServicePriority)}
              disabled={isSubmitting}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: p.color,
                      }}
                    />
                    <span>{p.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {/* Error */}
            {submitError && (
              <Alert severity="error">
                {submitError}
              </Alert>
            )}

            {/* Botón Submit */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!isFormValid || isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : <AddIcon />}
              fullWidth
            >
              {isSubmitting ? 'Creando solicitud...' : 'Crear Solicitud'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}