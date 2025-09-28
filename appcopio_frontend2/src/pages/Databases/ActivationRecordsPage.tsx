import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, Typography, Paper, List, ListItemButton, ListItemText,
Divider } from "@mui/material";
import { listDatasets } from "@/services/datasets.service";
import type { Dataset } from "@/types/database";
import CreateDatasetDialog from "./CreateDatasetDialog";
export default function ActivationRecordsPage() {
const { activationId, centerId } = useParams(); // si tu router incluye
centerId
const navigate = useNavigate();
const actId = Number(activationId);
const cenId = centerId ? Number(centerId) : undefined;
const [items, setItems] = React.useState<Dataset[]>([]);
const [loading, setLoading] = React.useState(true);
const [error, setError] = React.useState<string | null>(null);
const [open, setOpen] = React.useState(false);
const load = React.useCallback(() => {
if (!Number.isFinite(actId)) return;
setLoading(true);
setError(null);
listDatasets(actId)
.then(r => setItems(r.data || []))
.catch(e => setError(e.message || "No se pudo listar"))
.finally(() => setLoading(false));
}, [actId]);
React.useEffect(() => { load(); }, [load]);
const existingNames = React.useMemo(() => items.map(it => it.name),
[items]);
return (
<Box sx={{ p: 2 }}>
<Box sx={{ display: "flex", alignItems: "center", justifyContent:
"space-between", mb: 2 }}>
<Typography variant="h5">Registros de activación</Typography>
<Button variant="contained" onClick={() => setOpen(true)}>Nueva
base</Button>
</Box>
<Paper variant="outlined">
{loading && <Box sx={{ p: 3 }}><Typography>Cargando…</Typography></
Box>}
{error && <Box sx={{ p: 3 }}><Typography color="error">{error}</
Typography></Box>}
{!loading && !error && items.length === 0 && (
<Box sx={{ p: 3 }}><Typography variant="body2"
color="text.secondary">No hay bases creadas para esta activación.</
Typography></Box>
)}
{!loading && !error && items.length > 0 && (
<List>
{items.map((d, idx) => (
<React.Fragment key={String(d.dataset_id)}>
<ListItemButton onClick={() => navigate(`./db/$
{encodeURIComponent(String(d.dataset_id))}`)}>
<ListItemText primary={d.name} secondary={`ID: $
{d.dataset_id} · Activación: ${d.activation_id}`} />
</ListItemButton>
{idx < items.length - 1 && <Divider component="li" />}
</React.Fragment>
))}
</List>
)}
</Paper>
<CreateDatasetDialog
open={open}
activationId={actId}
centerId={cenId}
existingNames={existingNames}
onClose={() => setOpen(false)}
onCreated={() => { setOpen(false); load(); }}
/>
</Box>
);
}
