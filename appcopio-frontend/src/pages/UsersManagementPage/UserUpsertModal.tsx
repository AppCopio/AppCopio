// src/pages/UsersManagementPage/UserUpsertModal.tsx
import * as React from "react";
import {
  Alert, Box, Button, CircularProgress, DialogContentText,
  FormControl, FormHelperText, InputLabel, MenuItem, Select,
  Stack, TextField
} from "@mui/material";
import type { User } from "../../types/user";
import {
  getRoles, createUser, updateUser,
  assignCenterToUser, removeCenterFromUser, getUser
} from "../../services/usersApi";

type Center = { center_id: string | number; name: string };
async function getCenters(signal?: AbortSignal): Promise<Center[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/centers`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data as Center[]).map(c => ({ ...c, center_id: String(c.center_id) }));
}

type Props = {
  mode: "create" | "edit";
  user?: User;
  onClose: () => void;
  onSaved: () => void;
};

export default function UserUpsertModal({ mode, user, onClose, onSaved }: Props) {
  const isEdit = mode === "edit";

  // form
  const [rut, setRut] = React.useState(isEdit ? (user?.rut ?? "") : "");
  const [nombre, setNombre] = React.useState(isEdit ? (user?.nombre ?? "") : "");          
  const [username, setUsername] = React.useState(isEdit ? (user?.username ?? "") : "");
  const [password, setPassword] = React.useState(""); 
  const [email, setEmail] = React.useState(isEdit ? (user?.email ?? "") : "");            
  const [roleId, setRoleId] = React.useState<number | "">("");
  const [centerId, setCenterId] = React.useState<string>("");

  // catálogos
  const [roles, setRoles] = React.useState<{ role_id: number; role_name: string }[]>([]);
  const [centers, setCenters] = React.useState<Center[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = React.useState(true);

  // estado UI
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // carga catálogos + estado inicial en edit
  React.useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    (async () => {
      try {
        setLoadingCatalogs(true);
        const [{ roles }, centersList] = await Promise.all([
          getRoles(controller.signal),
          getCenters(controller.signal),
        ]);
        if (!mounted) return;
        setRoles(roles);
        setCenters(centersList);

        if (isEdit && user) {
          setRoleId(user.role_id);

          const isComunidad = user.role_name === "Contacto Ciudadano";
          if (isComunidad) {
            const u = await getUser(user.user_id, controller.signal);
            if (!mounted) return;
            const assigned = (u.assignedCenters || []).map(String);
            setCenterId(assigned[0] ?? "");
          }
        }
      } catch (e: any) {
        if (controller.signal.aborted || e?.name === "AbortError") return;
        setError(e?.message ?? "Error cargando catálogos");
      } finally {
        if (mounted) setLoadingCatalogs(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort("unmount");
    };
  }, [isEdit, user]);

  // validaciones
  const required = (v: string) => v.trim().length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); 

  const selectedRole = roles.find(r => r.role_id === (roleId === "" ? -1 : roleId));
  const needsCenter = selectedRole?.role_name === "Contacto Ciudadano";

  const canSave =
    required(rut) &&
    required(nombre) &&                
    required(username) &&
    (isEdit || required(password)) &&
    !!roleId &&
    required(email) && emailValid    

  const handleSave = async () => {
    if (!canSave) {
      setTouched({
        rut: true, nombre: true, username: true, password: true, email: true, role: true, center: true,
      } as any);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit && user) {
        // 1) actualizar datos base
        await updateUser(user.user_id, {
          nombre,                           
          username,
          email,                            
          role_id: Number(roleId),
        });

        // 2) sincronizar centro según rol
        const u = await getUser(user.user_id);
        const currentAssigned: string[] = (u.assignedCenters || []).map(String);

        if (needsCenter) {
          const toRemove = currentAssigned.filter((id) => id !== centerId);
          const toAdd = centerId && !currentAssigned.includes(centerId) ? [centerId] : [];
          await Promise.all([
            ...toRemove.map((id) => removeCenterFromUser(user.user_id, id)),
            ...toAdd.map((id) => assignCenterToUser(user.user_id, id, "Contacto Comunidad")),
          ]);
        } else if (currentAssigned.length > 0) {
          await Promise.all(currentAssigned.map((id) => removeCenterFromUser(user.user_id, id)));
        }
      } else {
        // CREATE
        const created = await createUser({
          rut,
          username,
          password,
          email,                             
          role_id: Number(roleId),
          nombre,                           
        });

        if (needsCenter && centerId) {
          await assignCenterToUser(created.user_id, centerId, "Contacto Comunidad");
        }
      }

      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? (isEdit ? "Error al actualizar usuario" : "Error al crear usuario"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ minWidth: { xs: 0, sm: 520 } }}>
      <DialogContentText component="div">
        {isEdit ? "Edita" : "Crea"} un usuario. Si el rol es <b>Contacto Comunidad</b>, selecciona un centro.
      </DialogContentText>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <TextField
        label="RUT"
        value={rut}
        onChange={(e) => setRut(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, rut: true }))}
        error={!!touched.rut && !required(rut)}
        helperText={!!touched.rut && !required(rut) ? "Requerido" : " "}
        fullWidth
        disabled={isEdit} 
      />

      <TextField
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
        error={!!touched.nombre && !required(nombre)}
        helperText={!!touched.nombre && !required(nombre) ? "Requerido" : " "}
        fullWidth
      />

      <TextField
        label="Nombre de usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, username: true }))}
        error={!!touched.username && !required(username)}
        helperText={!!touched.username && !required(username) ? "Requerido" : " "}
        fullWidth
      />

      {!isEdit && (
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={!!touched.password && !required(password)}
          helperText={!!touched.password && !required(password) ? "Requerido" : " "}
          fullWidth
        />
      )}

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        error={!!touched.email && (!required(email) || !emailValid)}
        helperText={
          !!touched.email && !required(email)
            ? "Requerido"
            : (!!touched.email && !emailValid ? "Formato inválido" : " ")
        }
        fullWidth
      />

      <FormControl fullWidth error={!!touched.role && !roleId} disabled={loadingCatalogs}>
        <InputLabel id="role-select-label">Rol</InputLabel>
        <Select
          labelId="role-select-label"
          label="Rol"
          value={loadingCatalogs || roles.length === 0 ? "" : roleId}
          onChange={(e) => setRoleId(Number(e.target.value))}
          onBlur={() => setTouched((t) => ({ ...t, role: true }))}
          displayEmpty
          disabled={loadingCatalogs || roles.length === 0}
          renderValue={(selected: number | "") => {
            const r = roles.find((x) => x.role_id === Number(selected));
            return r ? r.role_name : "";
          }}
        >
          {roles.map((r) => (
            <MenuItem key={r.role_id} value={r.role_id}>
              {r.role_name}
            </MenuItem>
          ))}
        </Select>
        {!!touched.role && !roleId && !loadingCatalogs && (
          <FormHelperText>Selecciona un rol</FormHelperText>
        )}
      </FormControl>

      {needsCenter && (
        <FormControl fullWidth error={!!touched.center && !centerId} disabled={loadingCatalogs}>
          <InputLabel id="center-select-label">Centro</InputLabel>
          <Select
            labelId="center-select-label"
            label="Centro"
            value={centerId}
            onChange={(e) => setCenterId(String(e.target.value))}
            onBlur={() => setTouched((t) => ({ ...t, center: true }))}
          >
            {centers.map((c) => (
              <MenuItem key={String(c.center_id)} value={String(c.center_id)}>
                {c.name} (ID {String(c.center_id)})
              </MenuItem>
            ))}
          </Select>
          {!!touched.center && !centerId && <FormHelperText>Selecciona un centro</FormHelperText>}
        </FormControl>
      )}

      {loadingCatalogs && (
        <Box display="flex" gap={1} alignItems="center">
          <CircularProgress size={20} />
          Cargando catálogos…
        </Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? (isEdit ? "Guardando..." : "Creando...") : (isEdit ? "Guardar" : "Crear usuario")}
        </Button>
      </Box>
    </Stack>
  );
}
