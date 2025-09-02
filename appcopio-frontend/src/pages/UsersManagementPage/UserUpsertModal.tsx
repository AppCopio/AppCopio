// src/pages/UsersManagementPage/UserUpsertModal.tsx
import * as React from "react";
import {
  Alert, Box, Button, CircularProgress, DialogContentText,
  FormControl, FormHelperText, InputLabel, MenuItem, Select,
  Stack, TextField, Switch, FormControlLabel, Divider, Typography
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

const GENEROS = [
  { value: "", label: "—" },
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
  { value: "Otro", label: "Otro" },
  { value: "Prefiero no decir", label: "Prefiero no decir" },
];

// Aquí se integran las funciones de formateo y validación de RUT
const cleanRut = (v: string) => v.replace(/[^0-9kK]/g, "").toUpperCase();
const formatRut = (v: string) => {
  const s = cleanRut(v);
  if (s.length <= 1) return s;
  const body = s.slice(0, -1);
  const dv = s.slice(-1);
  const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${bodyWithDots}-${dv}`;
};
const computeDV = (bodyDigits: string) => {
  let sum = 0, mul = 2;
  for (let i = bodyDigits.length - 1; i >= 0; i--) {
    sum += parseInt(bodyDigits[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
};
const isValidRut = (rutFormattedOrNot: string) => {
  const s = cleanRut(rutFormattedOrNot);
  if (s.length < 2) return false;
  const body = s.slice(0, -1);
  const dv = s.slice(-1);
  return computeDV(body) === dv.toUpperCase();
};

export default function UserUpsertModal({ mode, user, onClose, onSaved }: Props) {
  const isEdit = mode === "edit";

  const [rut, setRut] = React.useState(isEdit ? (user?.rut ?? "") : "");
  const [nombre, setNombre] = React.useState(isEdit ? (user?.nombre ?? "") : "");
  const [username, setUsername] = React.useState(isEdit ? (user?.username ?? "") : "");
  const [password, setPassword] = React.useState(""); 
  const [email, setEmail] = React.useState(isEdit ? (user?.email ?? "") : "");
  const [roleId, setRoleId] = React.useState<number | "">("");
  const [centerId, setCenterId] = React.useState<string>("");

  const [genero, setGenero] = React.useState<string>(isEdit ? (user?.genero ?? "") : "");
  const [celular, setCelular] = React.useState<string>(isEdit ? (user?.celular ?? "") : "");
  const [esApoyoAdmin, setEsApoyoAdmin] = React.useState<boolean>(isEdit ? !!user?.es_apoyo_admin : false);
  const [isActive, setIsActive] = React.useState<boolean>(isEdit ? !!user?.is_active : true);
  const createdAt = isEdit ? user?.created_at : undefined;

  const [roles, setRoles] = React.useState<{ role_id: number; role_name: string }[]>([]);
  const [centers, setCenters] = React.useState<Center[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = React.useState(true);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
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

          const isTM = user.role_id === 2;
          const isCC = user.role_id === 3;
          if (isTM || isCC) {
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

  const required = (v: string) => v.trim().length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const selectedRole = roles.find(r => r.role_id === (roleId === "" ? -1 : roleId));
  const needsCenter = selectedRole?.role_id === 3;
  const needsApoyo = selectedRole?.role_id === 2;


  // Usa useMemo para validar el RUT, para que se recalcule solo cuando cambian las dependencias
  const rutDVInvalid = React.useMemo(() => {
    const s = cleanRut(rut);
    if (!touched.rut || s.length < 2) return false;
    return !isValidRut(s);
  }, [touched.rut, rut]);

  const canSave =
    required(rut) &&
    !rutDVInvalid && 
    required(nombre) &&
    required(username) &&
    (isEdit || required(password)) &&
    !!roleId &&
    required(email) &&
    emailValid 

  const handleSave = async () => {
    if (!canSave) {
      setTouched({
        rut: true,
        nombre: true,
        username: true,
        password: true,
        email: true,
        role: true,
        center: true,
        genero: true,
        celular: true,
      } as any);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit && user) {
        await updateUser(user.user_id, {
          nombre,
          username,
          email,
          role_id: Number(roleId),
          genero: genero || null,
          celular: celular || null,
          es_apoyo_admin: !!esApoyoAdmin,
          is_active: !!isActive,
        });

        const u = await getUser(user.user_id);
        const currentAssigned: string[] = (u.assignedCenters || []).map(String);

        if (needsCenter) {
          if (centerId) {
            const toRemove = currentAssigned.filter((id) => id !== centerId);
            const toAdd = currentAssigned.includes(centerId) ? [] : [centerId];
            await Promise.all([
              ...toRemove.map((id) => removeCenterFromUser(user.user_id, id)),
              ...toAdd.map((id) => assignCenterToUser(user.user_id, centerId, u.role_name)),
            ]);
          } else {
            if (currentAssigned.length > 0) {
              await Promise.all(currentAssigned.map((id) => removeCenterFromUser(user.user_id, id)));
            }
          }
        } else {
          if (currentAssigned.length > 0) {
            await Promise.all(currentAssigned.map((id) => removeCenterFromUser(user.user_id, id)));
          }
        }

      } else {
        const created = await createUser({
          rut: cleanRut(rut),
          username,
          password,
          email,
          role_id: Number(roleId),
          nombre,
          genero: genero || null,
          celular: celular || null,
          es_apoyo_admin: !!esApoyoAdmin,
          is_active: !!isActive,
        });
        if (needsCenter && centerId) {
          const roleName = selectedRole?.role_name ?? "";
          await assignCenterToUser(created.user_id, centerId, roleName);
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

  React.useEffect(() => {
    if (!needsCenter) setCenterId("");
  }, [needsCenter]);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  // Manejador de cambio para el campo RUT, aplicando el formato
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedValue = formatRut(value);
    setRut(formattedValue);
  };

  return (
    <Stack spacing={2} sx={{ minWidth: { xs: 0, sm: 500 } }}>
      <DialogContentText component="div">
        {isEdit ? "Edita" : "Crea"} un usuario. Si el rol es <b>Contacto Comunidad</b>, selecciona un centro.
      </DialogContentText>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <TextField
        label="RUT"
        value={rut}
        onChange={handleRutChange}
        onBlur={() => setTouched((t) => ({ ...t, rut: true }))}
        error={!!touched.rut && (!required(rut) || rutDVInvalid)}
        helperText={
          !!touched.rut && !required(rut)
            ? "Requerido"
            : (!!touched.rut && rutDVInvalid ? "RUT inválido" : " ") }
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
        <FormControl fullWidth  disabled={loadingCatalogs}>
          <InputLabel id="center-select-label">Centro</InputLabel>
          <Select
            labelId="center-select-label"
            label="Centro"
            value={centerId}
            onChange={(e) => setCenterId(String(e.target.value))}
            onBlur={() => setTouched((t) => ({ ...t, center: true }))}
          >
            <MenuItem value="">
               Sin centro 
            </MenuItem>
            {centers.map((c) => (
              <MenuItem key={String(c.center_id)} value={String(c.center_id)}>
                {c.name} (ID {String(c.center_id)})
              </MenuItem>
            ))}
          </Select>
          {!!touched.center && !centerId && (
            <FormHelperText>Selecciona un centro</FormHelperText>
          )}
        </FormControl>
      )}

      <FormControl fullWidth>
        <InputLabel id="genero-select-label">Género</InputLabel>
        <Select
          labelId="genero-select-label"
          label="Género"
          value={genero}
          onChange={(e) => setGenero(String(e.target.value))}
          onBlur={() => setTouched((t) => ({ ...t, genero: true }))}
        >
          {GENEROS.map((g) => (
            <MenuItem key={g.value || "empty"} value={g.value}>
              {g.label}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Opcional</FormHelperText>
      </FormControl>

      <TextField
        label="Celular"
        value={celular}
        onChange={(e) => setCelular(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, celular: true }))}
        helperText="Opcional"
        fullWidth
      />

      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          }
          label="Usuario activo"
        />
        {needsApoyo && (<FormControlLabel
          control={
            <Switch
              checked={esApoyoAdmin}
              onChange={(e) => setEsApoyoAdmin(e.target.checked)}
            />
          }
          label="Es apoyo admin"
        />)}
      </Stack>

      

      {loadingCatalogs && (
        <Box display="flex" gap={1} alignItems="center">
          <CircularProgress size={20} />
          Cargando catálogos…
        </Box>
      )}

      {isEdit && (
        <>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            Creado el: {formatDate(createdAt)}
          </Typography>
        </>
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
