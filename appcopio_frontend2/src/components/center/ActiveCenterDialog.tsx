import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  CircularProgress,
  Stack,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import { listActiveUsersByRole } from "@/services/users.service";
import type { User } from "@/types/user";

interface ActivateCenterDialogProps {
  open: boolean;
  onClose: () => void;
  centerId: string;
  centerName: string;
  defaultManagerId?: number | null;
  onConfirm: (data: { notes: string; assignedUserId: number }) => Promise<void>;
}

// Tipos comunes de emergencia para botones rápidos
const EMERGENCY_TYPES = [
  { label: "Incendio Forestal", icon: "🔥" },
  { label: "Inundación", icon: "💧" },
  { label: "Terremoto", icon: "🌋" },
  { label: "Temporal", icon: "🌪️" },
  { label: "Aluvión", icon: "🏔️" },
];

export default function ActivateCenterDialog({
  open,
  onClose,
  centerId,
  centerName,
  defaultManagerId,
  onConfirm,
}: ActivateCenterDialogProps) {
  const [notes, setNotes] = React.useState("");
  const [assignedUser, setAssignedUser] = React.useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = React.useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Cargar usuarios disponibles (Trabajadores Municipales)
  React.useEffect(() => {
    if (!open) return;

    let alive = true;
    (async () => {
      setLoadingUsers(true);
      try {
        // Rol ID 2 = Trabajador Municipal
        const users = await listActiveUsersByRole(2);
        if (alive) {
          setAvailableUsers(users || []);

          // Si hay un TM asignado por defecto, seleccionarlo
          if (defaultManagerId) {
            const defaultUser = users.find((u) => u.user_id === defaultManagerId);
            if (defaultUser) {
              setAssignedUser(defaultUser);
            }
          }
        }
      } catch (error) {
        console.error("Error al cargar trabajadores municipales:", error);
      } finally {
        if (alive) setLoadingUsers(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, defaultManagerId]);

  // Reset al cerrar
  React.useEffect(() => {
    if (!open) {
      setNotes("");
      setAssignedUser(null);
    }
  }, [open]);

  const handleQuickNote = (emergencyType: string) => {
    const currentNotes = notes.trim();
    if (currentNotes) {
      setNotes(`${currentNotes} - ${emergencyType}`);
    } else {
      setNotes(`Emergencia: ${emergencyType}`);
    }
  };

  const handleConfirm = async () => {
    if (!assignedUser) {
      alert("Debes seleccionar un encargado para activar el centro");
      return;
    }

    if (!notes.trim()) {
      alert("Debes indicar el motivo de la activación");
      return;
    }

    try {
      setSaving(true);
      await onConfirm({
        notes: notes.trim(),
        assignedUserId: assignedUser.user_id,
      });
      onClose();
    } catch (error: any) {
      console.error("Error al activar centro:", error);
      alert(error?.message || "Error al activar el centro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div" fontWeight={700}>
          Activar Centro
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {centerName}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Sección 1: Motivo de Emergencia */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              1. Indica el motivo de la emergencia *
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Describe la situación que requiere activar este centro
            </Typography>

            {/* Botones rápidos */}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1, mb: 2, gap: 1 }}>
              {EMERGENCY_TYPES.map((type) => (
                <Chip
                  key={type.label}
                  label={`${type.icon} ${type.label}`}
                  onClick={() => handleQuickNote(type.label)}
                  clickable
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>

            {/* Campo de texto */}
            <TextField
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Incendio forestal en sector alto del cerro, Temporal con inundaciones en zona baja..."
              required
            />
          </Box>

          {/* Sección 2: Encargado */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              2. Selecciona el encargado del centro *
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {defaultManagerId
                ? "Por defecto se seleccionó el Trabajador Municipal asignado"
                : "Escoge quién será responsable de este centro"}
            </Typography>

            <Autocomplete
              value={assignedUser}
              onChange={(_, newValue) => setAssignedUser(newValue)}
              options={availableUsers}
              loading={loadingUsers}
              getOptionLabel={(option) => option?.nombre || option?.username || ""}
              isOptionEqualToValue={(option, value) => option?.user_id === value?.user_id}
              renderOption={(props, option) => (
                <li {...props} key={option.user_id}>
                  <Box sx={{ display: "flex", width: "100%", alignItems: "center", gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">{option?.nombre || option?.username}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.email}
                      </Typography>
                    </Box>
                    {option.active_assignments ? (
                      <Chip label={`${option.active_assignments} asign.`} size="small" />
                    ) : null}
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Encargado"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingUsers ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>

          {/* Sección 3: Confirmación */}
          <Box sx={{ bgcolor: "info.lighter", p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>⚠️ Importante:</strong> Al activar este centro se creará un nuevo registro en el
              historial de activaciones y se asignará el encargado seleccionado. El centro quedará disponible
              para recibir personas y gestionar recursos.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={saving || !assignedUser || !notes.trim()}>
          {saving ? "Activando..." : "Confirmar Activación"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}