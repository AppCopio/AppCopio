// src/pages/UsersManagementPage/UsersManagementPage.tsx
import * as React from "react";
import type { User } from "../../types/user";
import { listUsers, updateUser, deleteUser } from "../../services/usersApi";
import { AssignCentersModal } from "./AssignCentersModal";
import UserUpsertModal from "./UserUpsertModal";

// MUI
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  MapsHomeWork as AssignIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

export default function UsersManagementPage() {
  const [rows, setRows] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [assigningUser, setAssigningUser] = React.useState<User | null>(null);
  const [upsertMode, setUpsertMode] = React.useState<
    null | { mode: "create" } | { mode: "edit"; user: User }
  >(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { users } = await listUsers({});
      setRows(users as User[]);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleToggleSupport(user: User) {
    const ok = window.confirm(
      `¿Cambiar permiso de Apoyo de Administrador para ${user.nombre}?`
    );
    if (!ok) return;
    try {
      await updateUser(user.user_id, { es_apoyo_admin: !user.es_apoyo_admin });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error al actualizar permiso");
    }
  }

  async function handleToggleActive(user: User) {
    const ok = window.confirm(`¿Activar/desactivar usuario ${user.nombre}?`);
    if (!ok) return;
    try {
      await updateUser(user.user_id, { is_active: !user.is_active });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error al actualizar permiso");
    }
  }

  async function handleDelete(u: User) {
    const ok = window.confirm(`¿Eliminar usuario ${u.nombre}?`);
    if (!ok) return;
    try {
      await deleteUser(u.user_id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error al eliminar");
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Stack spacing={2}>
        {/* Encabezado tipo Dashboard */}
        <Toolbar
          disableGutters
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr", 
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box />
          {/* columna izquierda vacía */}

          <Typography variant="h5" fontWeight={700} textAlign="center">
            Gestión de Usuarios
          </Typography>

          <Box
            sx={{
              justifySelf: "end",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              onClick={() => setUpsertMode({ mode: "create" })}
            >
              Crear Usuario
            </Button>
          </Box>
        </Toolbar>

        <Paper elevation={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">Nombre</TableCell>
                  <TableCell align="center">Username</TableCell>
                  <TableCell align="center">Email</TableCell>
                  <TableCell align="center">Rol</TableCell>
                  <TableCell align="center">Apoyo Admin</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((user) => {
                  const isTM = user.role_name === "Trabajador Municipal";
                  return (
                    <TableRow key={user.user_id} hover>
                      <TableCell>{user.nombre}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.role_name}
                          color={
                            user.role_name === "Administrador"
                              ? "primary"
                              : user.role_name === "Trabajador Municipal"
                              ? "success"
                              : "default"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {isTM ? (
                          <Switch
                            checked={!!user.es_apoyo_admin}
                            onChange={() => handleToggleSupport(user)}
                            inputProps={{
                              "aria-label": "Apoyo Admin",
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            N/A
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell >
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                          alignItems="center"
                        >
                          {isTM && (
                            <Tooltip title="Asignar Centros">
                              <IconButton
                                size="small"
                                onClick={() => setAssigningUser(user)}
                              >
                                <AssignIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Editar">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setUpsertMode({ mode: "edit", user })
                                }
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(user)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Activar/Desactivar usuario">
                            <Switch
                              checked={!!user.is_active}
                              onChange={() => handleToggleActive(user)}
                            />
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box py={6} textAlign="center" color="text.secondary">
                        No hay usuarios para mostrar.
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      {/* Dialog MUI para AssignCentersModal */}
      <Dialog
        open={!!assigningUser}
        onClose={() => setAssigningUser(null)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogContent dividers>
          {assigningUser && (
            <AssignCentersModal
              user={assigningUser}
              onClose={() => setAssigningUser(null)}
              onSave={async () => {
                setAssigningUser(null);
                await load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!upsertMode}
        onClose={() => setUpsertMode(null)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <DialogTitle>
          {upsertMode?.mode === "edit" ? "Editar usuario" : "Nuevo usuario"}
        </DialogTitle>
        <DialogContent dividers>
          {upsertMode && (
            <UserUpsertModal
              mode={upsertMode.mode}
              user={upsertMode.mode === "edit" ? upsertMode.user : undefined}
              onClose={() => setUpsertMode(null)}
              onSaved={async () => {
                await load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
