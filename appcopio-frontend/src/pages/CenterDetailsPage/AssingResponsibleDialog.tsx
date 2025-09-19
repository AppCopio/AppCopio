import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete, CircularProgress, Stack, Typography } from "@mui/material";
import { listActiveUsersByRole, assignCenterToUser, getActiveAssignmentsByUserRole } from "@/services/users.service";
import ConfirmImpactDialog from "./ConfirmImpactDialog";

type RoleK = "trabajador municipal" | "contacto ciudadano";

export default function AssignResponsibleDialog({
  open, onClose, centerId, role, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  role: RoleK | null;
  onSuccess?: () => void;
}) {
  const [options, setOptions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [user, setUser] = React.useState<any | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [currentCenters, setCurrentCenters] = React.useState<{ center_id: string; center_name: string }[]>([]);

  React.useEffect(() => {
    if (!open || !role) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Filtra por rol_id: 2 = Trabajador Municipal, 3 = Contacto Ciudadano (según tu seed)
        const roleId = role === "trabajador municipal" ? 2 : 3;
        const res = await listActiveUsersByRole(roleId);
        if (alive) {
          const sorted = [...(res || [])].sort(
            (a, b) => (a.active_assignments ?? 0) - (b.active_assignments ?? 0)
          );
          setOptions(sorted);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, role]);

  React.useEffect(() => { if (open) setUser(null); }, [open]);

  const handleSave = async () => {
    if (!role || !user) return;
       // Si es contacto ciudadano, validar si ya tiene centro(s) activo(s)
    if (role === "contacto ciudadano") {
      try {
        setChecking(true);
        const { assignments } = await getActiveAssignmentsByUserRole(user.user_id, role);
        // Filtra los que NO son el centro actual (si ya es contacto del mismo centro, no tiene impacto)
        const otherCenters = (assignments || []).filter(a => a.center_id !== centerId);
        if (otherCenters.length > 0) {
          setCurrentCenters(otherCenters);
          setConfirmOpen(true);
          return; // esperar confirm
        }
      } catch {
        // Si falla la verificación, como fallback pregunta genérico
        if (!window.confirm("Este usuario ya podría tener un centro asignado. Si continúas, ese centro quedará sin contacto ciudadano. ¿Confirmas?")) {
          return;
        }
      } finally {
        setChecking(false);
      }
    }
    // Continua guardando directo si no aplica confirmación
    await doAssign();
   };

  const doAssign = async () => {
    try {
      setSaving(true);
      await assignCenterToUser(user!.user_id, centerId, role!);
      onSuccess?.();     // el contenedor decide si refresca
      onClose();         // cerrar modal
    } catch (e: any) {
      alert(e?.message ?? "Error creando la asignación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="bodyStrong">Asignar {role ?? ""}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="bodySmall" color="text.secondary">
            Selecciona el usuario que quedará vigente para este rol (la asignación anterior se cerrará automáticamente).
          </Typography>
          <Autocomplete
            value={user}
            onChange={(_, v) => setUser(v)}
            options={options}
            loading={loading}
            getOptionLabel={(o) => o?.nombre || o?.username || ""}
            isOptionEqualToValue={(o, v) => o?.user_id === v?.user_id} 
            renderOption={(props, option) => (
              <li {...props} key={option.user_id}>
                <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {option?.nombre || option?.username}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 8 }}>
                    {(option?.active_assignments ?? 0)} asign.
                  </span>
                </div>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Usuario"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlineGray" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!user || saving}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
      {role === "contacto ciudadano" && (
        <ConfirmImpactDialog
          open={confirmOpen}
          title="Confirmar cambio de contacto ciudadano"
          message={
            currentCenters.length === 1
              ? `Actualmente este usuario es contacto ciudadano del centro "${currentCenters[0].center_name}". Si continúas, ese centro quedará sin contacto ciudadano.`
              : `Actualmente este usuario es contacto ciudadano de los siguientes centros. Si continúas, todos ellos quedarán sin contacto ciudadano.`
          }
          details={currentCenters.map(c => `${c.center_name} (${c.center_id})`)}
          confirmLabel="Sí, continuar"
          cancelLabel="Cancelar"
          onConfirm={() => { setConfirmOpen(false); void doAssign(); }}
          onCancel={() => { setConfirmOpen(false); }}
        />
      )}
    </Dialog>
  );
}