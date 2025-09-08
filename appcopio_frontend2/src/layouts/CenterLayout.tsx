import * as React from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Box, Tabs, Tab, Typography, Stack, CircularProgress, Alert } from "@mui/material";
import { getOneCenter } from "@/services/centers.service";
import type { Center } from "@/types/center";
import { paths } from "@/routes/paths";

export default function CenterLayout() {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [center, setCenter] = React.useState<Center | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await getOneCenter(centerId, controller.signal);
        setCenter(data);
      } catch (e) {
        if (!(e as any)?.name?.includes?.("Abort")) {
          setErr("No se pudo cargar el centro.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [centerId]);

  const tabs = React.useMemo(() => {
    const p = paths.center(centerId);
    return [
      { label: "Inventario", path: p.inventory },
      { label: "Detalles",   path: p.details },
      { label: "Solicitudes", path: p.needsNew },
      { label: "Actualizaciones", path: p.updates },
      { label: "Personas", path: p.residents },
    ];
  }, [centerId]);

  // Activa el tab según URL
  const value = React.useMemo(
    () => tabs.findIndex(t => location.pathname.startsWith(t.path)),
    [location.pathname, tabs]
  );

  const handleTabChange = (_: React.SyntheticEvent, idx: number) => {
    navigate(tabs[idx].path);
  };

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h6">
          Gestionando: {center ? center.name : `Centro ${centerId}`}
        </Typography>
        <Tabs value={Math.max(0, value)} onChange={handleTabChange} variant="scrollable" allowScrollButtonsMobile>
          {tabs.map((t) => (
            <Tab key={t.path} label={t.label} />
          ))}
        </Tabs>
      </Stack>

      {loading && (
        <Stack alignItems="center" py={3}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" mt={1}>
            Cargando centro…
          </Typography>
        </Stack>
      )}

      {!loading && err && <Alert severity="error">{err}</Alert>}

      {!loading && !err && (
        <Box>
          <Outlet />
        </Box>
      )}
    </Box>
  );
}
