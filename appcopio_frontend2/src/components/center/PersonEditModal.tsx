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
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import type { FullFamily, FullFamilyMember } from '@/services/family.service';
import { familyService } from '@/services/family.service';
import { NEEDS_OPTIONS } from '@/types/fibe';
import PersonFormCard from '@/pages/FibePage/PersonFormCard';
import type { Person } from '@/types/person';

interface PersonEditModalProps {
  open: boolean;
  onClose: () => void;
  familyId: number;
  onSaveSuccess: () => void;
}

export default function PersonEditModal({
  open,
  onClose,
  familyId,
  onSaveSuccess,
}: PersonEditModalProps) {
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

  // Cargar familia completa cuando se abre el modal
  React.useEffect(() => {
    if (!open || !familyId) return;

    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(false);
      try {
        const data = await familyService.getFull(familyId, ac.signal);
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
  }, [open, familyId]);

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

      // Esperar un momento para mostrar el mensaje de éxito
      setTimeout(() => {
        onSaveSuccess(); // Callback para recargar datos y cerrar modal
      }, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={handleClose}>
      <AppBar sx={{ position: 'relative', bgcolor: '#1976d2' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleClose}
            disabled={saving}
            aria-label="cerrar"
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, ml: 2 }}>
            Editar Información de Familia #{family?.family_id || familyId}
          </Typography>
          {family?.status && (
            <Chip 
              label={family.status} 
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.2)', 
                color: 'white',
                mr: 2 
              }} 
            />
          )}
          <Button
            color="inherit"
            onClick={handleSave}
            disabled={saving || success}
            startIcon={<SaveIcon />}
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4, pb: 8 }}>
        {loading ? (
          <Box sx={{ mt: 4 }}>
            <LinearProgress />
            <Typography sx={{ mt: 2, textAlign: 'center' }}>
              Cargando información de la familia...
            </Typography>
          </Box>
        ) : error && !family ? (
          <Alert severity="error" sx={{ mt: 4 }}>
            {error}
          </Alert>
        ) : (
          <>
            {/* Info del Centro */}
            {family?.center_name && (
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light' }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Centro:</strong> {family.center_name}
                </Typography>
              </Paper>
            )}

            {/* Alerts */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                ✅ Cambios guardados correctamente. Cerrando...
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
                disabled={saving || success}
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
                disabled={saving || success}
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
                Miembros de la Familia ({miembros.length})
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

            {/* Botón Guardar flotante inferior (adicional) */}
            <Box
              sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                bgcolor: 'background.paper',
                borderTop: 1,
                borderColor: 'divider',
                p: 2,
                display: 'flex',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving || success}
                sx={{ minWidth: 200 }}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </Box>
          </>
        )}
      </Container>
    </Dialog>
  );
}
