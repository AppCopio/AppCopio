import * as React from 'react';
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
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  MapsHomeWork as AssignIcon,
} from '@mui/icons-material';

import type { User } from '@/types/user';
import {
  listUsers, updateUser, deleteUser
} from '@/services/users.service';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import AssignCentersModal from "@/pages/UsersManagementPage/AssignCentersModal";
import UserUpsertModal from './UserUpsertModal';

export default function UsersManagementPage() {
  const [rows, setRows] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [assigningUser, setAssigningUser] = React.useState<User | null>(null);
  const [upsertMode, setUpsertMode] = React.useState<
    null | { mode: 'create' } | { mode: 'edit'; user: User }
  >(null);

  const [confirm, setConfirm] = React.useState<{
    open: boolean;
    msg: string;
    onOk?: () => Promise<void> | void;
  }>({ open: false, msg: '' });

  const ask = (msg: string, onOk: () => Promise<void> | void) =>
    setConfirm({ open: true, msg, onOk });
  const closeConfirm = () => setConfirm({ open: false, msg: '' });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { users } = await listUsers();
      setRows(users);
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { users } = await listUsers();
        if (!ac.signal.aborted) setRows(users);
      } catch (e: any) {
        if (!ac.signal.aborted) setError(e?.message ?? 'Error al cargar usuarios');
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [load]);

  // --- Acciones con confirmación ---
  const handleToggleSupport = (u: User) =>
    ask(`¿Cambiar permiso de Apoyo de Administrador para ${u.nombre}?`, async () => {
      await updateUser(u.user_id, { es_apoyo_admin: !u.es_apoyo_admin });
      await load();
      closeConfirm();
    });

  const handleToggleActive = (u: User) =>
    ask(`¿Activar/desactivar usuario ${u.nombre}?`, async () => {
      await updateUser(u.user_id, { is_active: !u.is_active });
      await load();
      closeConfirm();
    });

  const handleDelete = (u: User) =>
    ask(`¿Eliminar usuario ${u.nombre}?`, async () => {
      await deleteUser(u.user_id);
      await load();
      closeConfirm();
    });

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Stack spacing={2}>
        {/* Encabezado */}
        <Toolbar
          disableGutters
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box />
          <Typography variant="h5" fontWeight={700} textAlign="center">
            Gestión de Usuarios
          </Typography>
          <Box sx={{ justifySelf: 'end' }}>
            <Button variant="contained" onClick={() => setUpsertMode({ mode: 'create' })}>
              Crear Usuario
            </Button>
          </Box>
        </Toolbar>

        {loading && <LinearProgress />}
        {error && <Alert severity="error">{error}</Alert>}

        <Paper elevation={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell align="center">Apoyo Admin</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((user) => {
                  const isTM = user.role_id === 2;
                  return (
                    <TableRow key={user.user_id} hover>
                      <TableCell>{user.nombre}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.role_name ?? user.role_id}
                          color={
                            user.role_name === 'Administrador'
                              ? 'primary'
                              : user.role_name === 'Trabajador Municipal'
                              ? 'success'
                              : 'default'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {isTM && (
                          <Switch
                            checked={!!user.es_apoyo_admin}
                            onChange={() => handleToggleSupport(user)}
                            inputProps={{ 'aria-label': 'Apoyo Admin' }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {isTM && (
                            <Tooltip title="Asignar Centros">
                              <IconButton size="small" onClick={() => setAssigningUser(user)}>
                                <AssignIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => setUpsertMode({ mode: 'edit', user })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
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
                              inputProps={{ 'aria-label': 'Activo' }}
                            />
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6}>
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

      {/* Modal Asignar Centros */}
      <Dialog open={!!assigningUser} onClose={() => setAssigningUser(null)} fullWidth maxWidth="md">
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

      {/* Modal Crear/Editar Usuario */}
      <Dialog open={!!upsertMode} onClose={() => setUpsertMode(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {upsertMode?.mode === 'edit' ? 'Editar usuario' : 'Nuevo usuario'}
        </DialogTitle>
        <DialogContent dividers>
          {upsertMode && (
            <UserUpsertModal
              mode={upsertMode.mode}
              user={upsertMode.mode === 'edit' ? upsertMode.user : undefined}
              onClose={() => setUpsertMode(null)}
              onSaved={async () => {
                await load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación */}
      <ConfirmDialog
        open={confirm.open}
        message={confirm.msg}
        onClose={closeConfirm}
        onConfirm={async () => {
          await confirm.onOk?.();
        }}
      />
    </Container>
  );
}
