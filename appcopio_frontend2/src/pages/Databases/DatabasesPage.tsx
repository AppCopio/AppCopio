import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Card, CardActionArea, CardContent, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormHelperText, InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Tooltip, Typography, IconButton, Divider } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import TableRowsOutlined from "@mui/icons-material/TableRowsOutlined";
import { useActivation } from "@/contexts/ActivationContext";
import { databasesService } from "@/services/databases.service";
import type { DatabaseSummary } from "@/types/database";
import { templatesService } from "@/services/template.service"; 
import { fieldsService } from "@/services/fields.service";
import { TEMPLATES, TemplateItem } from "@/types/template";

export default function DatabasesPage() {
  const { centerId = "" } = useParams<{ centerId: string }>();
  const { loading: actLoading, activation} = useActivation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]); // Usamos 'any' para simplificar el tipo en la corrección
  const [openNew, setOpenNew] = useState(false);

 useEffect(() => {
    let mounted = true;
    (async () => {
        if (!activation?.activation_id) return;
        try {
        setLoading(true);
        const data = await databasesService.listByActivation(activation.activation_id);
        if (mounted) setItems(data);
        } finally {
        if (mounted) setLoading(false);
        }
    })();
    return () => { mounted = false; };
    }, [activation?.activation_id]);

  if (actLoading) return <LinearProgress />;
  if (!activation) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h6">Este centro no tiene una activación abierta.</Typography>
      </Container>
    );
  }

  const onDelete = async (databaseId: string) => {
    if (!window.confirm("¿Eliminar esta base de datos?")) return;
    await databasesService.remove(databaseId);
    setItems(prev => prev.filter(d => d.dataset_id !== databaseId));
  };

  return (
    <Container sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Bases de datos por activación</Typography>
          <Typography variant="body2" color="text.secondary">Registra asistencia, entregas, reubicaciones y más.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => setOpenNew(true)}>
          Nueva base de datos
        </Button>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {loading ? (
        <Box sx={{ py: 6 }}><LinearProgress /></Box>
      ) : items.length === 0 ? (
        <EmptyState onCreate={() => setOpenNew(true)} />
      ) : (
        <Grid items={items} onOpen={(it) => navigate(`./${encodeURIComponent(it.dataset_id)}`)} onDelete={(id) => onDelete(id)} />
      )}

      <CreateDialog
        open={openNew}
        onClose={() => setOpenNew(false)}
        centerId={centerId}
        existingNames={items.map(i => i.name)}
        usedTemplateKeys={[...new Set(items.map(i => i.template_key).filter(Boolean))] as string[]}
        onCreated={(created) => {
          setItems(prev => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name, "es")));
          setOpenNew(false);
          navigate(`./${encodeURIComponent(created.dataset_id)}`);
        }}
      />
    </Container>
  );
}

function Grid({ items, onOpen, onDelete }: { items: DatabaseSummary[]; onOpen: (d: DatabaseSummary)=>void; onDelete: (id: string)=>void }) {
  return (
    <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", md:"repeat(3,1fr)", lg:"repeat(4,1fr)" } }}>
      {items.map(it => (
        <Card key={it.dataset_id} variant="outlined" sx={{ borderRadius: 3 }}>
          <Box 
            onClick={() => onOpen(it)}
            sx={{
              p: 2, // Padding for content
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'action.hover', // Hover state from Mui
              },
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1" noWrap title={it.name}>{it.name}</Typography>
                <Chip size="small" label={`${it.record_count} registros`} />
              </Stack>
              <Typography variant="body2" color="text.secondary">clave: <code>{it.key}</code></Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Tooltip title="Duplicar (próximamente)">
                <span>
                  {/* These IconButtons are now safely nested */}
                  <IconButton size="small" disabled onClick={(e) => e.stopPropagation()}> 
                    <ContentCopyOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Eliminar">
                <IconButton 
                  size="small" 
                  onClick={(e)=>{ 
                    e.stopPropagation(); // Still critical to prevent Box onClick
                    onDelete(it.dataset_id);
                  }}>
                  <DeleteOutline fontSize="small"/>
                </IconButton>
              </Tooltip>
            </Stack>
            </Stack>
          </Box>
        </Card>
      ))}
    </Box>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 3, p: 4, textAlign: "center", bgcolor: "background.paper" }}>
      <TableRowsOutlined sx={{ fontSize: 40, opacity: 0.5 }} />
      <Typography variant="h6" sx={{ mt: 1 }}>Aún no hay bases de datos</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Crea una base nueva desde una plantilla o en blanco.</Typography>
      <Button variant="contained" startIcon={<AddRounded />} sx={{ mt: 2 }} onClick={onCreate}>Nueva base de datos</Button>
    </Box>
  );
}

function CreateDialog({
  open, onClose, centerId, existingNames, usedTemplateKeys, onCreated
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  existingNames: string[];
  usedTemplateKeys: string[];
  onCreated: (d: any) => void; // Usamos 'any' para simplificar el tipo en la corrección
}) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<string>("blank");
  const [submitting, setSubmitting] = useState(false);
  const {activation } = useActivation();

const selectedTemplate = useMemo(() => {
    return (TEMPLATES as TemplateItem[]).find(t => t.key === template);
  }, [template]);


  const nameError = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return "Ingresa un nombre";
    const exists = existingNames.some(n => n.trim().toLowerCase() === trimmed.toLowerCase());
    return exists ? "Ya existe una base con este nombre" : "";
  }, [name, existingNames]);

  const isTemplateUsed = template !== "blank" && usedTemplateKeys?.includes(template); 
  function slugify(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
  const handleSubmit = async () => {
    if (nameError || isTemplateUsed) return;
    try {
      setSubmitting(true);
      const uniqueKey = slugify(name) + "-" + Date.now();
      
      // 1. Crear la base de datos (se omite el campo 'config' con template_key)
      const created = await databasesService.create({
        activation_id: activation!.activation_id,
        center_id: centerId,
        name,
        key: uniqueKey,
      });

      const datasetId = created.dataset_id;
      
      // 2. Aplicar la plantilla: Obtener campos y crearlos uno a uno
      if (template !== "blank") {
          const fieldsToAdd = await templatesService.getTemplateFields(template);
          
          for (const fieldTemplate of fieldsToAdd) {
              await fieldsService.create({
                  dataset_id: datasetId,
                  
                  // Propiedades principales (nombre del DTO de FE)
                  name: fieldTemplate.name,
                  key: fieldTemplate.key,
                  field_type: fieldTemplate.field_type, 
                  position: fieldTemplate.position,
                  is_required: fieldTemplate.is_required,
                  is_multi: fieldTemplate.is_multi,
                  
                  // Mapeo de relación (relation_target_template_id es correcto para template_field)
                  relation_target_kind: fieldTemplate.relation_target_kind,
                  relation_target_template_id: fieldTemplate.relation_target_template_id, 
                  relation_target_core: fieldTemplate.relation_target_core,
                  
                  is_active: true,
                  
                  // === CORRECCIONES DE ALIAS PARA EL BACKEND ===
                  // ALIAS 1: Mapear 'field_type' a 'type' (requerido por la consulta SQL del BE)
                  type: fieldTemplate.field_type,
                  
                  // ALIAS 2: Mapear 'settings' a 'config' (requerido por la consulta SQL del BE)
                  settings: fieldTemplate.settings, 
                  config: fieldTemplate.settings, 
              });
          }
          
          
          // Opcional: Actualizar la configuración del dataset para registrar la plantilla usada
          await databasesService.updateDataset(datasetId, { config: { template_key: template } });
      }

      // 3. Notificar éxito y navegar
      onCreated(created);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "No se pudo crear la base");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setName(""); setTemplate("blank"); onClose();
  };
// ... (cuerpo del componente Dialog)
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Nueva base de datos</DialogTitle>
        <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
                <FormControl fullWidth>
                    <TextField label="Nombre" value={name} onChange={(e)=>setName(e.target.value)} error={!!nameError} helperText={nameError || "El nombre debe ser único en la activación"} autoFocus disabled={submitting} />
                </FormControl>
                
                <FormControl fullWidth>
                    <InputLabel id="tpl">Plantilla</InputLabel>
                    <Select labelId="tpl" label="Plantilla" value={template} onChange={(e)=>setTemplate(String(e.target.value))} disabled={submitting}>
                    {TEMPLATES.map(t => {
                        const disabled = t.key !== "blank" && usedTemplateKeys?.includes(t.key);
                        return (
                        <MenuItem key={t.key} value={t.key} disabled={disabled}>
                            {t.name}{disabled ? " — ya usada" : ""}
                        </MenuItem>
                        );
                    })}
                    </Select>
                    <FormHelperText>{isTemplateUsed ? "Esta plantilla ya fue usada en este centro" : selectedTemplate?.description}</FormHelperText>
                </FormControl>
                
                {/* Muestra las columnas de vista previa */}
                {selectedTemplate?.previewColumns && selectedTemplate.previewColumns.length > 0 && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>Columnas de vista previa:</Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {selectedTemplate.previewColumns.map(col => (
                                <Chip key={col} label={col} size="small" variant="outlined" />
                            ))}
                        </Stack>
                    </Box>
                )}

            </Stack>
        </DialogContent>
        <DialogActions>
            <Button variant="text" onClick={handleClose} disabled={submitting}>Cancelar</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={!!nameError || isTemplateUsed || submitting}>Crear</Button>
        </DialogActions>
    </Dialog>
  );
}