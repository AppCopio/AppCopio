import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  LinearProgress,
  Alert,
  Divider,
  Chip,
  TextField,
  Autocomplete,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import type { FullFamily, FullFamilyMember } from '@/services/family.service';
import { familyService } from '@/services/family.service';
import { NEEDS_OPTIONS } from '@/types/fibe';
import PersonFormCard from '@/pages/FibePage/PersonFormCard';
import type { Person } from '@/types/person';

export default function PersonEditPage() {
  const navigate = useNavigate();
  const { personId } = useParams<{ personId: string }>();
  const [searchParams] = useSearchParams();
  const familyId = searchParams.get('family_id');

  // Estados
  const [family, setFamily] = React.useState<FullFamily | null>(null);
  const [miembros, setMiembros] = React.useState<Person[]>([]);
  const [observaciones, setObservaciones] = React.useState('');
  const [selectedNeeds, setSelectedNeeds] = React.useState<string[]>([]);
  
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [forceValidate, setForceValidate] = React.useState(0);

  // Cargar familia completa
  React.useEffect(() => {
    if (!familyId) {
      setError('No se proporcionó el ID de la familia');
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await familyService.getFull(Number(familyId), ac.signal);
        if (!ac.signal.aborted) {
          setFamily(data);
          setObservaciones(data.observaciones || '');
          setSelectedNeeds(familyService.needsArrayToSelected(data.necesidades_basicas));
          
          // Convertir miembros a formato Person (compatible con PersonFormCard)
          const personsList: Person[] = data.miembros.map((m) => ({
            rut: m.rut,
            nombre: m.nombre,
            primer_apellido: m.primer_apellido,
            segundo_apellido: m.segundo_apellido || '',
            nacionalidad: m.nacionalidad as any,
            genero: m.genero as any,
            edad: m.edad,
            estudia: m.estudia,
            trabaja: m.trabaja,
            perdida_trabajo: m.perdida_trabajo,
            rubro: m.rubro || '',
            discapacidad: m.discapacidad,
            dependencia: m.dependencia,
            parentesco: m.parentesco,
            // Guardar IDs para actualización
            _member_id: m.member_id,
            _person_id: m.person_id,
          } as any));
          
          setMiembros(personsList);
        }
      } catch (e: any) {
        if (!ac.signal.aborted) {
          setError(e?.response?.data?.error || e?.message || 'Error al cargar la familia');
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    
    return () => ac.abort();
  }, [familyId]);

  const handleMemberChange = (index: number, patch: Partial<Person>) => {
    setMiembros((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const handleSave = async () => {
    // Validación
    setForceValidate((prev) => prev + 1);
    
    if (!family) {
      setError('No hay datos de familia cargados');
      return;
    }

    // Validar campos requeridos en miembros
    const hasErrors = miembros.some((m, idx) => {
      const isEmpty = (v: any) =>
        v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
      
      const isHead = idx === 0;
      return (
        isEmpty(m.rut) ||
        isEmpty(m.nombre) ||
        isEmpty(m.primer_apellido) ||
        isEmpty(m.nacionalidad) ||
        isEmpty(m.genero) ||
        isEmpty(m.edad) ||
        (!isHead && isEmpty(m.parentesco))
      );
    });

    if (hasErrors) {
      setError('Por favor completa todos los campos requeridos de los miembros');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Construir datos de actualización
      const updateData = {
        observaciones,
        necesidades_basicas: familyService.selectedToNeedsArray(selectedNeeds),
        miembros: miembros.map((m): FullFamilyMember => ({
          member_id: (m as any)._member_id,
          parentesco: m.parentesco || '',
          person_id: (m as any)._person_id,
          rut: m.rut,
          nombre: m.nombre,
          primer_apellido: m.primer_apellido,
          segundo_apellido: m.segundo_apellido || null,
          nacionalidad: m.nacionalidad as any,
          genero: m.genero as any,
          edad: Number(m.edad),
          estudia: m.estudia,
          trabaja: m.trabaja,
          perdida_trabajo: m.perdida_trabajo,
          rubro: m.rubro || null,
          discapacidad: m.discapacidad,
          dependencia: m.dependencia,
        })),
      };

      await familyService.updateFull(family.family_id, updateData);
      setSuccess(true);
      
      // Mostrar mensaje y volver después de 2s
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Cargando información...
        </Typography>
      </Container>
    );
  }

  if (error && !family) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Volver
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          Volver
        </Button>
        <Typography variant="h4" sx={{ flex: 1 }}>
          Editar Información de Familia #{family?.family_id}
        </Typography>
        <Chip label={family?.status} color="primary" />
      </Stack>

      {/* Info del Centro */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Centro:</strong> {family?.center_name}
        </Typography>
      </Paper>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Cambios guardados correctamente. Redirigiendo...
        </Alert>
      )}

      {/* Observaciones */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Observaciones
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Ingresa observaciones sobre la familia..."
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </Paper>

      {/* Necesidades Básicas */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Necesidades Básicas
        </Typography>
        <Autocomplete
          multiple
          options={NEEDS_OPTIONS}
          value={selectedNeeds}
          onChange={(_, newValue) => setSelectedNeeds(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Selecciona necesidades..."
              helperText="Selecciona una o más necesidades básicas"
            />
          )}
        />
      </Paper>

      {/* Miembros de la Familia */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Miembros de la Familia
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Edita la información de cada miembro del grupo familiar
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Stack spacing={2}>
          {miembros.map((miembro, index) => (
            <PersonFormCard
              key={`member-${index}`}
              person={miembro}
              index={index}
              onChange={handleMemberChange}
              onRemove={() => {}} // No permitir eliminar en edición
              isRemovable={false}
              forceValidate={forceValidate}
            />
          ))}
        </Stack>
      </Paper>

      {/* Botón Guardar */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving || success}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </Box>
    </Container>
  );
}
