import * as React from "react";
import {
  Avatar,
  Box,
  CircularProgress,
  Typography,
  Chip,
  Paper,
  Stack,
  Divider,
} from "@mui/material";

import { useAuth } from "@/contexts/AuthContext";
import { getUser } from "@/services/users.service";
import type { User } from "@/types/user";
import { msgFromError } from "@/lib/errors";

export default function MyUserPage() {
  const { user, loadingAuth: authLoading } = useAuth();
  const [data, setData] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getUser(user.user_id, controller.signal)
      .then((res) => setData(res))
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(msgFromError(e) || "Error al cargar usuario");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [authLoading, user?.user_id]);

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Typography>No estás autenticado</Typography>;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!data) {
    return <Typography>Error al cargar usuario</Typography>;
  }

  const userAttributes = [
    { label: "RUT", value: data.rut },
    { label: "Rol", value: (data as any).role_name ?? data.role_id },
    { label: "Género", value: data.genero },
    { label: "Celular", value: data.celular },
  ];

  const formatDate = (date: string | number | Date) =>
    new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(date)
    );

  const initial =
    (data.nombre?.trim()?.[0] || data.username?.trim()?.[0] || "U").toUpperCase();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh", // mismo aspecto que antes
        bgcolor: "background.default",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 600 }}>
        <Stack direction="column" spacing={3} divider={<Divider flexItem />} alignItems="center">
          <Stack direction="column" alignItems="center" spacing={1} sx={{ textAlign: "center" }}>
            <Avatar
              src={data.imagen_perfil || undefined}
              sx={{ width: 100, height: 100, mb: 1, fontSize: "3rem" }}
              alt={data.nombre || data.username || "Usuario"}
            >
              {initial}
            </Avatar>
            <Typography variant="h5" component="h1" gutterBottom>
              {data.nombre || data.username}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {data.email}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
            <Chip
              label={data.is_active ? "Activo" : "Inactivo"}
              color={data.is_active ? "success" : "default"}
              size="small"
            />
            <Chip
              label={data.es_apoyo_admin ? "Apoyo Admin" : "No Apoyo Admin"}
              color={data.es_apoyo_admin ? "primary" : "default"}
              size="small"
            />
          </Stack>

          <Stack spacing={2} sx={{ width: "100%" }}>
            {userAttributes.map((attr) => (
              <Stack
                key={attr.label}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle1" color="text.secondary">
                  {attr.label}
                </Typography>
                <Typography variant="body1">{attr.value || "—"}</Typography>
              </Stack>
            ))}

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" color="text.secondary">
                Fecha de creación
              </Typography>
              <Typography variant="body1">{formatDate(data.created_at)}</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
