import React, { useEffect, useState } from "react";
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
import { useAuth } from "../../contexts/AuthContext";
import { getUser } from "../../services/usersApi";
import { User } from "../../types/user";

export default function MyUserPage() {
  const { user } = useAuth();
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getUser(user.user_id)
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, [user]);

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

  if (!data) {
    return <Typography>Error al cargar usuario</Typography>;
  }

  const userAttributes = [
    { label: "RUT", value: data.rut },
    { label: "Rol", value: data.role_name },
    { label: "Género", value: data.genero },
    { label: "Celular", value: data.celular },
  ];

  const formatDate = (dateString: string | number | Date) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 600 }}>
        <Stack
          direction="column"
          spacing={3}
          divider={<Divider flexItem />}
          alignItems="center"
        >
          <Stack
            direction="column"
            alignItems="center"
            spacing={1}
            sx={{ textAlign: "center" }}
          >
            <Avatar
              src={data.imagen_perfil || undefined}
              sx={{ width: 100, height: 100, mb: 1, fontSize: '3rem' }}
            >
              {data.nombre?.[0] ?? data.username?.[0]}
            </Avatar>
            <Typography variant="h5" component="h1" gutterBottom>
              {data.nombre || data.username}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {data.email}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={2}
            divider={<Divider orientation="vertical" flexItem />}
          >
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
            {userAttributes.map((attr, index) => (
              <Stack
                key={index}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle1" color="text.secondary">
                  {attr.label}
                </Typography>
                <Typography variant="body1">
                  {attr.value || "—"}
                </Typography>
              </Stack>
            ))}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="subtitle1" color="text.secondary">
                Fecha de creación
              </Typography>
              <Typography variant="body1">
                {formatDate(data.created_at)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}