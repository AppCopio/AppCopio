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
import { useActivation } from "@/contexts/ActivationContext";
import { datasetsService } from "@/services/datasets.service";
import type { DatasetSummary, DatasetTemplateKey } from "@/types/dataset";
import { msgFromError } from "@/lib/errors";

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

export type DatasetTemplate = {
  key: DatasetTemplateKey;
  name: string;
  description: string;
  // optionally, a starter schema preview the UI can show
  previewColumns?: string[];
};

// ——— Templates visible in the UI ———
const TEMPLATES: DatasetTemplate[] = [
  {
    key: "blank",
    name: "Base de datos en blanco",
    description: "Comienza sin columnas predefinidas. Podrás agregarlas luego.",
  },
  {
    key: "personas_albergadas",
    name: "Personas Albergadas",
    description: "Registro de interacciones con las habitaciones del albergue. ",
    previewColumns: ["Nombre", "Rut", "Día 1", "Día 2"],
    //Esta base de datos se le deben ir agregando columnas con nombres editables. 
  },
  {
    key: "reubicaciones",
    name: "Reubicaciones",
    description: "Movimiento de personas entre albergues/centros, con motivo y destino.",
    //Descripción hay que cambiarla
    previewColumns: ["Nombre", "Rut", "Reubicación", "Situación", "Caracterización", "Condiciones de salud"],
  },
  {
    key: "red_apoyo",
    name: "Redes de apoyo",
    description:"Redes de apoyo de personas ingresadas",
    previewColumns: ["Número de folio", "Nombre", "Edad", "Rut", "Observaciones", "Contactos"],
  },
  {
    key: "familias_integradas",
    name: "Familias Integradas",
    description: "descripción",
    previewColumns: ["Fecha", "Persona", "Presente", "Observaciones"],
  },
  {
    key: "personas_ingresadas",
    name: "Personas Ingresadas",
    description: "descripción",
    previewColumns: ["Fecha", "Persona", "Presente", "Observaciones"],
  },
  {
    key: "ayudas_entregadas",
    name: "Apoyos Entregados",
    description: "¿Qué recurso se entregó, a quién, cuándo y en qué cantidad?",
    previewColumns: ["Nombre", "Primer Apellido", "Segundo Apellido", "Rut/Pasaporte", "Número de Folio", "Colchones", "Frazadas", "Alimento", "Gas"],
  },
  /*
  {
    key: "registro_p_persona",
    name: "Registro diario por persona",
    description: "descripción",
    previewColumns: ["Fecha", "Persona", "Presente", "Observaciones"],
  },
  */
];

type DatasetData = {
  columns: string[];             // nombres de columnas visibles en la tabla
  rows: Array<{ id: string; [k: string]: any }>; // filas (id + valores)
};

function datasetDataKey(activationId: number, datasetKey: string) {
  return `dataset_data_${activationId}_${datasetKey}`;
}
// ——— Mock Service (replace with real API) ———
const MockService = {


  async getOrInitDatasetData(
    activationId: number,
    datasetKey: string,
    templateKey?: DatasetTemplateKey
  ): Promise<DatasetData> {
    const k = datasetDataKey(activationId, datasetKey);
    const raw = window.localStorage.getItem(k);
    if (raw) return JSON.parse(raw);

    // Si no había nada, inicializamos columnas en base a la plantilla
    // (si no hay plantilla, parte vacío)
    const tpl = templateKey && TEMPLATES.find(t => t.key === templateKey);
    const columns = tpl?.previewColumns?.length ? tpl.previewColumns : [];

    const initial: DatasetData = {
      columns,
      rows: [], // sin filas por defecto
    };
    window.localStorage.setItem(k, JSON.stringify(initial));
    return initial;
  },

  async addRow(activationId: number, datasetKey: string): Promise<DatasetData> {
    const k = datasetDataKey(activationId, datasetKey);
    const raw = window.localStorage.getItem(k);
    const data: DatasetData = raw ? JSON.parse(raw) : { columns: [], rows: [] };
    data.rows = [...data.rows, { id: cryptoRandomId() }];
    window.localStorage.setItem(k, JSON.stringify(data));
    return data;
  },

  async updateCell(
    activationId: number,
    datasetKey: string,
    rowId: string,
    column: string,
    value: any
  ): Promise<DatasetData> {
    const k = datasetDataKey(activationId, datasetKey);
    const raw = window.localStorage.getItem(k);
    const data: DatasetData = raw ? JSON.parse(raw) : { columns: [], rows: [] };
    data.rows = data.rows.map(r => r.id === rowId ? { ...r, [column]: value } : r);
    window.localStorage.setItem(k, JSON.stringify(data));
    return data;
  },

  async addColumn(
    activationId: number,
    datasetKey: string,
    columnName: string
  ): Promise<DatasetData> {
    const k = datasetDataKey(activationId, datasetKey);
    const raw = window.localStorage.getItem(k);
    const data: DatasetData = raw ? JSON.parse(raw) : { columns: [], rows: [] };
    if (!data.columns.includes(columnName)) {
      data.columns = [...data.columns, columnName];
      window.localStorage.setItem(k, JSON.stringify(data));
    }
    return data;
  },

  async deleteRow(activationId: number, datasetKey: string, rowId: string): Promise<DatasetData> {
    const k = datasetDataKey(activationId, datasetKey);
    const raw = window.localStorage.getItem(k);
    const data: DatasetData = raw ? JSON.parse(raw) : { columns: [], rows: [] };
    data.rows = data.rows.filter(r => r.id !== rowId);
    window.localStorage.setItem(k, JSON.stringify(data));
    return data;
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
  /*const { activationId: activationIdParam } = useParams();
  const activationId = Number(activationIdParam);*/
  const { activation } = useActivation();
  const activationId = activation?.activation_id;
  if (!activationId) {
    // renderiza un placeholder / spinner si falta activación
    return <LinearProgress />;
  }
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DatasetSummary[]>([]);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await datasetsService.listByActivation(activationId);
        if (mounted) setItems(data);
        } catch (e) {
        console.error(e);
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
    await datasetsService.remove(datasetId);
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
        activationId={activationId!}
        existingNames={items.map((i) => i.name)}
        usedTemplateKeys={[...new Set(items.map(i => i.template_key).filter(Boolean))] as DatasetTemplateKey[]}
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
  usedTemplateKeys,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  activationId: number;
  existingNames: string[];
  usedTemplateKeys: DatasetTemplateKey[];
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
  const isTemplateUsed = template !== 'blank' && usedTemplateKeys?.includes(template);

  const handleSubmit = async () => {
    if (nameError || isTemplateUsed) return;
    try {
        setSubmitting(true);
        const created = await datasetsService.create(activationId, { name, template });
      //hayq eu revisar si el backend recibe template. 
      /*Si tu API ya devuelve template_key en cada DatasetSummary, tu UI mostrará y bloqueará plantillas repetidas (tal como tienes).
      Si no lo devuelve aún, el combo seguirá operativo; cuando backend lo agregue, la UI tomará ese dato y el bloqueo quedará firme. */
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
              {TEMPLATES.map((t) => {
                    const disabled = t.key !== 'blank' && usedTemplateKeys?.includes(t.key);
                    return (
                    <MenuItem key={t.key} value={t.key} disabled={disabled}>
                        {t.name} {disabled ? '— ya usada' : ''}
                    </MenuItem>
                    );
                })}
            </Select>
            <FormHelperText>
                {isTemplateUsed ? 'Esta plantilla ya fue usada en este centro.' : selectedTemplate.description}
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
export function DatasetDetail() {
  const { key = "" } = useParams<{ key: string }>();
  const { activation } = useActivation();
  const activationId = activation?.activation_id;
  const [loading, setLoading] = useState(true);
  const [ds, setDs] = useState<DatasetSummary | null>(null);
  const [data, setData] = useState<DatasetData>({ columns: [], rows: [] });
  const [newColName, setNewColName] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!activationId || !key) return;
      try {
        setLoading(true);
        const summary = await datasetsService.getByKey(activationId, key);
        if (!summary) {
          setDs(null);
          setData({ columns: [], rows: [] });
          return;
        }
        if (mounted) setDs(summary);
        const persisted = await MockService.getOrInitDatasetData(
          activationId,
          key,
          summary.template_key
        );
        if (mounted) setData(persisted);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activationId, key]);

  const handleAddRow = async () => {
    if (!activationId || !key) return;
    const updated = await MockService.addRow(activationId, key);
    setData(updated);
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!activationId || !key) return;
    const updated = await MockService.deleteRow(activationId, key, rowId);
    setData(updated);
  };

  const handleCellChange = async (rowId: string, col: string, value: any) => {
    if (!activationId || !key) return;
    const updated = await MockService.updateCell(activationId, key, rowId, col, value);
    setData(updated);
  };

  const handleAddColumn = async () => {
    if (!newColName.trim() || !activationId || !key) return;
    const updated = await MockService.addColumn(activationId, key, newColName.trim());
    setData(updated);
    setNewColName("");
  };

  if (!activationId) return <LinearProgress />;
  if (loading) return <Container sx={{ py: 4 }}><LinearProgress /></Container>;

  return (
    <Container sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="titlePage">{ds?.name ?? key}</Typography>
          <Typography variant="bodyBase" sx={{ color: 'text.secondary' }}>
            {ds?.template_key ? `Plantilla: ${ds.template_key}` : 'Sin plantilla'}
          </Typography>
        </Box>

        <Stack direction="row" gap={1}>
          <TextField
            size="small"
            placeholder="Nombre de columna"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
          />
          <Button variant="outlined" onClick={handleAddColumn}>Agregar columna</Button>
          <Button variant="contained" onClick={handleAddRow}>Agregar fila</Button>
        </Stack>
      </Stack>

      <Box sx={{ mt: 3, overflowX: 'auto' }}>
        {data.columns.length === 0 ? (
          <Box sx={{ p: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="bodyBase" sx={{ color: 'text.secondary' }}>
              Esta base aún no tiene columnas. Agrégalas con el campo de arriba o usando una plantilla.
            </Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <Box component="thead" sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <Box component="tr">
                <Box component="th" sx={{ textAlign: 'left', p: 1, bgcolor: 'action.hover' }}>#</Box>
                {data.columns.map((c) => (
                  <Box key={c} component="th" sx={{ textAlign: 'left', p: 1, bgcolor: 'action.hover' }}>
                    {c}
                  </Box>
                ))}
                <Box component="th" sx={{ p: 1, bgcolor: 'action.hover' }} />
              </Box>
            </Box>
            <Box component="tbody">
              {data.rows.map((r, idx) => (
                <Box key={r.id} component="tr" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Box component="td" sx={{ p: 1, color: 'text.secondary', width: 48 }}>{idx + 1}</Box>
                  {data.columns.map((c) => (
                    <Box key={`${r.id}-${c}`} component="td" sx={{ p: 1, minWidth: 180 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={r[c] ?? ''}
                        onChange={(e) => handleCellChange(r.id, c, e.target.value)}
                      />
                    </Box>
                  ))}
                  <Box component="td" sx={{ p: 1, width: 56 }}>
                    <Tooltip title="Eliminar fila">
                      <IconButton size="small" onClick={() => handleDeleteRow(r.id)}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
}
