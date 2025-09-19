import * as React from "react";
import type { User } from "@/types/user";
import type { Center } from "@/types/center";
import {
  assignCenterToUser,
  removeCenterFromUser,
  getOne as getUser,
} from "@/services/users.service";
import { listCenters } from "@/services/centers.service";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import { Refresh as RefreshIcon, Search as SearchIcon } from "@mui/icons-material";

// Si ya usas un ConfirmDialog común en el proyecto
import ConfirmDialog from "@/components/common/ConfirmDialog";

type Props = {
  user: User;
  onClose: () => void;
  onSave: () => void; // refrescar lista externa
};

const AssignCentersModal: React.FC<Props> = ({ user, onClose, onSave }) => {
  const [allCenters, setAllCenters] = React.useState<Center[]>([]);
  const [selectedCenters, setSelectedCenters] = React.useState<Set<string>>(new Set());
  const [initialAssignments, setInitialAssignments] = React.useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [showOnlyAssigned, setShowOnlyAssigned] = React.useState(false);

  // Confirmación al remover todos o varios centros
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const pendingActionRef = React.useRef<(() => Promise<void>) | null>(null);

  const controllerRef = React.useRef<AbortController | null>(null);

  const loadData = React.useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const [userData, centersData] = await Promise.all([
        getUser(user.user_id, controller.signal),
        listCenters(controller.signal),
      ]);

      const userAssignedCenters = new Set<string>(
        (userData.assignedCenters || []).map((id) => String(id))
      );

      setSelectedCenters(userAssignedCenters);
      setInitialAssignments(userAssignedCenters);
      setAllCenters(centersData); // ya normalizados a string en el service
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === "AbortError" || err?.aborted) return;
      console.error(err);
      setError("No se pudieron cargar los datos para la asignación.");
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [user.user_id]);

  React.useEffect(() => {
    loadData();
    return () => controllerRef.current?.abort();
  }, [loadData]);

  // Filtro por búsqueda + "solo asignados"
  const filteredCenters = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = allCenters;

    if (showOnlyAssigned) {
      list = list.filter((c) => selectedCenters.has(c.center_id));
    }
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.center_id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allCenters, query, showOnlyAssigned, selectedCenters]);

  // Visibles + contadores (para seleccionar todo visible)
  const visibleIds = React.useMemo(
    () => new Set(filteredCenters.map((c) => c.center_id)),
    [filteredCenters]
  );
  const visibleSelectedCount = React.useMemo(
    () => [...selectedCenters].filter((id) => visibleIds.has(id)).length,
    [selectedCenters, visibleIds]
  );
  const allVisibleSelected =
    filteredCenters.length > 0 && visibleSelectedCount === filteredCenters.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  // ¿Hubo cambios?
  const hasChanges = React.useMemo(() => {
    if (selectedCenters.size !== initialAssignments.size) return true;
    for (const id of selectedCenters) {
      if (!initialAssignments.has(id)) return true;
    }
    return false;
  }, [selectedCenters, initialAssignments]);

  const handleToggleOne = (centerId: string) => {
    setSelectedCenters((prev) => {
      const next = new Set(prev);
      next.has(centerId) ? next.delete(centerId) : next.add(centerId);
      return next;
    });
  };

  const handleToggleAllVisible = () => {
    setSelectedCenters((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredCenters.forEach((c) => next.delete(c.center_id));
      } else {
        filteredCenters.forEach((c) => next.add(c.center_id));
      }
      return next;
    });
  };

  const doPersist = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const toAdd = [...selectedCenters].filter((id) => !initialAssignments.has(id));
      const toRemove = [...initialAssignments].filter((id) => !selectedCenters.has(id));

      await Promise.all([
        ...toAdd.map((center_id) =>
          assignCenterToUser(user.user_id, center_id, user.role_name ?? "")
        ),
        ...toRemove.map((center_id) => removeCenterFromUser(user.user_id, center_id)),
      ]);

      onSave(); // refresca lista externa
      onClose();
    } catch (err) {
      console.error(err);
      setError("Error al guardar las asignaciones.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCenters, initialAssignments, user.user_id, user.role_name, onSave, onClose]);

  const handleSaveChanges = async () => {
    // Confirmación si se están quitando TODOS o muchos
    const toRemove = [...initialAssignments].filter((id) => !selectedCenters.has(id));
    if (toRemove.length > 0) {
      pendingActionRef.current = doPersist;
      setConfirmOpen(true);
      return;
    }
    await doPersist();
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (pendingActionRef.current) {
      await pendingActionRef.current();
      pendingActionRef.current = null;
    }
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    pendingActionRef.current = null;
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Asignar Centros para {user.nombre}</Typography>
        <Tooltip title="Recargar">
          <span>
            <IconButton onClick={loadData} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {isLoading && (
        <Stack alignItems="center" py={3}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" mt={1}>
            Cargando datos de asignación...
          </Typography>
        </Stack>
      )}

      {!isLoading && error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && (
        <>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              size="small"
              placeholder="Buscar centro por nombre o ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={showOnlyAssigned}
                  onChange={(e) => setShowOnlyAssigned(e.target.checked)}
                />
              }
              label="Mostrar solo asignados"
            />
          </Stack>

          <FormControlLabel
            sx={{ pl: 1 }}
            control={
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                onChange={handleToggleAllVisible}
              />
            }
            label={
              <Typography variant="body2">
                Seleccionar todo ({visibleSelectedCount}/{filteredCenters.length})
              </Typography>
            }
          />

          <Divider />

          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              height: 350,
              overflow: "auto",
            }}
          >
            <List disablePadding>
              {filteredCenters.map((center) => {
                const checked = selectedCenters.has(center.center_id);
                return (
                  <ListItem key={center.center_id} disablePadding divider>
                    <ListItemButton onClick={() => handleToggleOne(center.center_id)} dense>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                      </ListItemIcon>
                      <ListItemText
                        primary={center.name}
                        secondary={`ID: ${center.center_id}`}
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              {filteredCenters.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary={
                      showOnlyAssigned
                        ? "No hay centros asignados que coincidan con la búsqueda."
                        : "No hay centros que coincidan con la búsqueda."
                    }
                    primaryTypographyProps={{ color: "text.secondary" }}
                  />
                </ListItem>
              )}
            </List>
          </Box>

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              disabled={!hasChanges || isLoading}
            >
              Guardar cambios
            </Button>
          </Stack>
        </>
      )}

      {/* Confirmación para eliminaciones */}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar cambios en asignaciones"
        message="Se eliminarán una o más asignaciones de centro para este usuario. ¿Deseas continuar?"
        confirmText="Sí, continuar"
        cancelText="Cancelar"
        onConfirm={handleConfirm}
        onClose={handleCancelConfirm}
      />
    </Stack>
  );
};

export default AssignCentersModal;
