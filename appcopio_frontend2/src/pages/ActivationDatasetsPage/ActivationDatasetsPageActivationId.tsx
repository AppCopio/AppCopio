import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import TableRowsOutlined from "@mui/icons-material/TableRowsOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";

/*
  Activation Datasets — Notion-like page
  ------------------------------------------------------
  Purpose: Let an Encargado create "flexible" datasets per activation.
  - Lists existing datasets for current activation
  - "New database" dialog: unique name, optional template or empty
  - Inspired by Notion: cards, quick actions, clean typography
  - Pure Frontend: service calls are mocked here; wire up to your API later

  Integration sketch (appcopio-frontend2):
  - Route: /centers/:centerId/activations/:activationId/datasets
  - Place this component under that route. It reads activationId from params.
  - Replace the MockService with real API in src/services/datasets.service.ts

  Theme: uses custom DS variants (titlePage, bodySmall, etc.) already defined
  on your theme (see ExampleFrontPage.tsx).
*/

// ——— Types (align with your backend later) ———
export type DatasetSummary = {
  dataset_id: string;
  activation_id: number;
  center_id: string;
  name: string;      // unique per activation
  key: string;       // slug per activation
  record_count: number;
  created_at: string;
  updated_at: string;
};

export type DatasetTemplateKey = "blank" | "daily_people" | "resource_deliveries" | "relocations";

export type DatasetTemplate = {
  key: DatasetTemplateKey;
  name: string;
  description: string;
  // optionally, a starter schema preview the UI can show
  previewColumns?: string[];
};

// ---- Plantillas --- 
const TEMPLATES: DatasetTemplate[] = [
  {
    key: "blank",
    name: "Base de datos en blanco", //Quízas poner niguna o poner como un botón de utilizar alguna plantilla sería lo
    description: "Comienza sin columnas predefinidas. Podrás agregarlas luego.",
  },
  {
    key: "daily_people",
    name: "Registro diario de personas",
    description: "Asistencia diaria por persona (fecha, presente/ausente, observaciones).",
    previewColumns: ["Fecha", "Persona", "Presente", "Observaciones"],
  },
  {
    key: "resource_deliveries",
    name: "Entregas de recursos",
    description: "¿Qué recurso se entregó, a quién, cuándo y en qué cantidad?",
    previewColumns: ["Fecha", "Persona", "Recurso", "Cantidad", "Observaciones"],
  },
  {
    key: "relocations",
    name: "Reubicaciones",
    description: "Movimiento de personas entre albergues/centros, con motivo y destino.",
    previewColumns: ["Fecha", "Persona", "Desde", "Hacia", "Motivo"],
  },
];

// ——— Mock Service (replace with real API) ———
const MockService = {
  async listByActivation(activationId: number): Promise<DatasetSummary[]> {
    await delay(400);
    const seed = window.localStorage.getItem(`datasets_${activationId}`);
    return seed ? JSON.parse(seed) : [];
  },
  async create(
    activationId: number,
    payload: { name: string; template: DatasetTemplateKey }
  ): Promise<DatasetSummary> {
    await delay(600);
    const list = await this.listByActivation(activationId);
    if (list.some((d) => d.name.trim().toLowerCase() === payload.name.trim().toLowerCase())) {
      throw new Error("El nombre ya existe para esta activación.");
    }
    const now = new Date().toISOString();
    const key = slugify(payload.name);
    const newItem: DatasetSummary = {
      dataset_id: cryptoRandomId(),
      activation_id: activationId,
      center_id: "C000",
      name: payload.name.trim(),
      key,
      record_count: 0,
      created_at: now,
      updated_at: now,
    };
    const updated = [newItem, ...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
    window.localStorage.setItem(`datasets_${activationId}`, JSON.stringify(updated));
    return newItem;
  },
  async remove(activationId: number, datasetId: string) {
    await delay(400);
    const list = await this.listByActivation(activationId);
    const updated = list.filter((d) => d.dataset_id !== datasetId);
    window.localStorage.setItem(`datasets_${activationId}`, JSON.stringify(updated));
  },
};

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cryptoRandomId() {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => x.toString(16).padStart(2, "0")).join("");
}

// ——— Page Component ———
export default function ActivationDatasetsPage() {
  const { activationId: activationIdParam } = useParams();
  const activationId = Number(activationIdParam);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DatasetSummary[]>([]);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await MockService.listByActivation(activationId);
        if (mounted) setItems(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activationId]);

  const onDelete = async (datasetId: string) => {
    if (!window.confirm("¿Eliminar esta base de datos? Esta acción no se puede deshacer.")) return;
    await MockService.remove(activationId, datasetId);
    setItems((prev) => prev.filter((d) => d.dataset_id !== datasetId));
  };

  return (
    <Container sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="titlePage">Registros de Activación</Typography>
          <Typography variant="bodyBase" sx={{ mt: 0.5, color: "text.secondary" }}>
            Crea bases flexibles por activación para registrar asistencia, entregas, reubicaciones y más.
          </Typography>
        </Box>
        <Button startIcon={<AddRounded />} variant="contained" onClick={() => setOpenNew(true)}>
          Nueva base de datos
        </Button>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {loading ? (
        <Box sx={{ py: 6 }}>
          <LinearProgress />
        </Box>
      ) : items.length === 0 ? (
        <EmptyState onCreate={() => setOpenNew(true)} />
      ) : (
        <DatasetGrid
          items={items}
          onOpen={(it) => navigate(`./${encodeURIComponent(it.key)}`)}
          onDelete={(it) => onDelete(it.dataset_id)}
        />
      )}

      <CreateDatasetDialog
        open={openNew}
        onClose={() => setOpenNew(false)}
        activationId={activationId}
        existingNames={items.map((i) => i.name)}
        onCreated={(created) => {
          setItems((prev) => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name, "es")));
          setOpenNew(false);
          // navigate immediately into the new dataset (optional)
          navigate(`./${encodeURIComponent(created.key)}`);
        }}
      />
    </Container>
  );
}

// ——— Grid of Datasets (Notion-like cards) ———
function DatasetGrid({
  items,
  onOpen,
  onDelete,
}: {
  items: DatasetSummary[];
  onOpen: (it: DatasetSummary) => void;
  onDelete: (it: DatasetSummary) => void;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: 2.5,
      }}
    >
      {items.map((it) => (
        <Card key={it.dataset_id} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardActionArea onClick={() => onOpen(it)}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                  <Typography variant="subheading" noWrap title={it.name}>
                    {it.name}
                  </Typography>
                  <Chip label={`${it.record_count} registros`} size="small" />
                </Stack>

                <Typography variant="bodySmall" sx={{ color: "text.secondary" }}>
                  clave: <code>{it.key}</code>
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Tooltip title="Duplicar (próximamente)">
                    <span>
                      <IconButton size="small" disabled>
                        <ContentCopyOutlined fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={(e) => { e.preventDefault(); onDelete(it); }}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}

// ——— Empty State ———
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 3,
        p: 4,
        textAlign: "center",
        bgcolor: "background.paper",
      }}
    >
      <TableRowsOutlined sx={{ fontSize: 40, opacity: 0.5 }} />
      <Typography variant="heading" sx={{ mt: 1 }}>Aún no hay bases de datos</Typography>
      <Typography variant="bodyBase" sx={{ color: "text.secondary", mt: 0.5 }}>
        Crea una base nueva desde una plantilla o en blanco.
      </Typography>
      <Button variant="contained" startIcon={<AddRounded />} sx={{ mt: 2 }} onClick={onCreate}>
        Nueva base de datos
      </Button>
    </Box>
  );
}

// ——— Create Dialog ———
function CreateDatasetDialog({
  open,
  onClose,
  activationId,
  existingNames,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  activationId: number;
  existingNames: string[];
  onCreated: (ds: DatasetSummary) => void;
}) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<DatasetTemplateKey>("blank");
  const [submitting, setSubmitting] = useState(false);

  const nameError = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return "Ingresa un nombre";
    const exists = existingNames.some((n) => n.trim().toLowerCase() === trimmed.toLowerCase());
    return exists ? "Ya existe una base con este nombre en la activación" : "";
  }, [name, existingNames]);

  const selectedTemplate = TEMPLATES.find((t) => t.key === template)!;

  const handleSubmit = async () => {
    if (nameError) return;
    try {
      setSubmitting(true);
      const created = await MockService.create(activationId, { name, template });
      onCreated(created);
    } catch (e: any) {
      alert(e?.message || "No se pudo crear la base de datos");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
    setName("");
    setTemplate("blank");
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography variant="subheading">Nueva base de datos</Typography>
        <Typography variant="bodyBase" sx={{ color: "text.secondary" }}>
          El nombre debe ser único dentro de la activación.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormControl fullWidth>
            <TextField
              label="Nombre de la base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Registro diario de personas"
              disabled={submitting}
              error={!!nameError}
              helperText={nameError || ""}
              autoFocus
            />
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="tpl-label">Plantilla</InputLabel>
            <Select
              labelId="tpl-label"
              label="Plantilla"
              value={template}
              onChange={(e) => setTemplate(e.target.value as DatasetTemplateKey)}
              disabled={submitting}
            >
              {TEMPLATES.map((t) => (
                <MenuItem key={t.key} value={t.key}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {selectedTemplate.description}
            </FormHelperText>
          </FormControl>

          {selectedTemplate.previewColumns && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="bodySmallStrong">Vista previa de columnas</Typography>
              <List dense>
                {selectedTemplate.previewColumns.map((c) => (
                  <ListItem key={c} sx={{ py: 0 }}>
                    <ListItemText primary={c} primaryTypographyProps={{ variant: "bodySmall" }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="textBare" onClick={handleClose} disabled={submitting}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!!nameError || submitting}>Crear</Button>
      </DialogActions>
    </Dialog>
  );
}

/* Optional: lightweight placeholder for the dataset detail page
   When routing to ./:key, you can render a simple table shell like below. */
export function DatasetDetailPlaceholder() {
  const { key } = useParams<{ key: string }>();
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="titlePage">{key}</Typography>
      <Typography variant="bodyBase" sx={{ color: "text.secondary", mt: 1 }}>
        Aquí irá el editor de registros estilo Notion (agregar columnas, filtrar, etc.).
      </Typography>
      <Box sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        mt: 3,
        p: 2,
        bgcolor: "background.paper",
      }}>
        <Typography variant="bodySmallStrong">Tabla (placeholder)</Typography>
        <Box sx={{ height: 200, mt: 1, bgcolor: "action.hover", borderRadius: 1 }} />
      </Box>
    </Container>
  );
}
