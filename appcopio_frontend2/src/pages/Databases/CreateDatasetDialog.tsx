import * as React from "react";
import {
Dialog, DialogTitle, DialogContent, DialogActions,
TextField, Button, FormControl, InputLabel, Select, MenuItem,
Typography, CircularProgress, Box
} from "@mui/material";
import { createDataset, listTemplates } from "@/services/datasets.service";
import type { DatasetTemplate, DatasetCreatePayload } from "@/types/database";

export type CreateDatasetDialogProps = {
open: boolean;
activationId: number;
centerId?: number | null;
existingNames?: string[];
onClose: () => void;
onCreated: (datasetId: string | number) => void;
};
const EMPTY = "__EMPTY__";
export default function CreateDatasetDialog({ open, activationId, centerId =
null, existingNames = [], onClose, onCreated }: CreateDatasetDialogProps) {
const [name, setName] = React.useState("");
const [templateId, setTemplateId] = React.useState<string>(EMPTY);
const [templates, setTemplates] = React.useState<DatasetTemplate[]>([]);
const [loading, setLoading] = React.useState(false);
const [error, setError] = React.useState<string | null>(null);
React.useEffect(() => {
if (!open) return;
listTemplates()
    .then(r => setTemplates(r.data || []))
    .catch(e => setError(e.message || "No se pudieron cargar plantillas"));
}, [open]);
React.useEffect(() => {
if (!open) {
setName("");
setTemplateId(EMPTY);
setError(null);
setLoading(false);
}
}, [open]);
const trimmed = name.trim();
const taken = existingNames.map(n =>
n.trim().toLowerCase()).includes(trimmed.toLowerCase());
const canSubmit = !!trimmed && !taken && !loading;
async function handleSubmit() {
if (!canSubmit) return;
setLoading(true);
setError(null);
const payload: DatasetCreatePayload = {
name: trimmed,
activation_id: activationId,
center_id: centerId ?? null,
template_id: templateId === EMPTY ? null : Number(templateId),
};
try {
const r = await createDataset(payload);
onCreated(r.data.dataset_id);
onClose();
} catch (e: any) {
const msg = String(e?.message || e);
setError(msg.includes("409") ? "El nombre ya existe" : msg);
} finally {
setLoading(false);
}
}
return (
<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
<DialogTitle>Nueva base</DialogTitle>
<DialogContent sx={{ pt: 1 }}>
<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
Ingresa un <strong>nombre único</strong> y elige si partes desde
una plantilla o vacía.
</Typography>
<TextField
autoFocus
label="Nombre de la base"
fullWidth
value={name}
onChange={(e) => setName(e.target.value)}
error={!!trimmed && taken}
helperText={taken ? "Ya existe una base con ese nombre" : ""}
sx={{ mb: 2 }}
/>
<FormControl fullWidth>
<InputLabel id="tpl">Plantilla (opcional)</InputLabel>
<Select labelId="tpl" label="Plantilla (opcional)"
value={templateId} onChange={(e) => setTemplateId(String(e.target.value))}>
<MenuItem value={EMPTY}>Sin plantilla (vacía)</MenuItem>
{templates.map(t => (
<MenuItem key={t.template_id} value={String(t.template_id)}
>{t.name}</MenuItem>
))}
</Select>
</FormControl>
{error && <Typography color="error" sx={{ mt: 2 }}>{error}</
Typography>}
</DialogContent>
<DialogActions>
<Button onClick={onClose} disabled={loading}>Cancelar</Button>
<Box sx={{ position: "relative" }}>
<Button variant="contained" onClick={handleSubmit} disabled={!
canSubmit}>Crear</Button>
{loading && <CircularProgress size={24} sx={{ position:
"absolute", top: 8, right: -40 }} />}
</Box>
</DialogActions>
</Dialog>
);
}

