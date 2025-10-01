import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { 
  Box, Button, Container, IconButton, LinearProgress, Stack, TextField, Tooltip, Typography,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, Select, MenuItem, FormHelperText
} from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { useActivation } from "@/contexts/ActivationContext";
import { databasesService } from "@/services/databases.service";
import { fieldsService } from "@/services/fields.service";
import { recordsService } from "@/services/records.service";
import type { DatabaseField, FieldType } from "@/types/field";
import type { DatabaseRecord } from "@/types/record";
import axios from "axios";
import CellEditor from "@/components/databases/CellEditor";

// =======================================================
// UTILS
// =======================================================

const getNextPosition = (currentFields: DatabaseField[]): number => {
    if (currentFields.length === 0) {
        // Si no hay campos, empezamos en 10 (igual que las plantillas)
        return 10; 
    }
    // Calcular la posición máxima actual y sumar 10
    const positions = currentFields.map(f => (f.position ? Number(f.position) : 0));
    const maxPosition = Math.max(...positions);
    return maxPosition + 10;
};

/** Tipos de campo disponibles para el modal. */
const AVAILABLE_FIELD_TYPES = [
    { key: "text", name: "Texto simple", icon: "T", desc: "Texto corto o largo.", placeholder: "Ej: Juan Pérez" },
    { key: "number", name: "Número", icon: "123", desc: "Moneda, edad, cantidad.", placeholder: "Ej: 25" },
    { key: "bool", name: "Interruptor (Sí/No)", icon: "✓", desc: "Sí/No, Activo/Inactivo.", placeholder: "" },
    { key: "date", name: "Fecha", icon: "📅", desc: "Fecha (sin hora).", placeholder: "" },
    { key: "select", name: "Selección única", icon: "▼", desc: "Elige una opción de una lista.", placeholder: "Seleccionar..." },
];

function slugify(s: string) { 
    return s.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

// =======================================================
// COMPONENTE PRINCIPAL
// =======================================================
export default function DatabaseDetailPage() {
  const { activation, loading: actLoading } = useActivation();
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<DatabaseField[]>([]);
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const { id = "" } = useParams<{ id: string }>();
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState(AVAILABLE_FIELD_TYPES[0].key);
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [currentOption, setCurrentOption] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    (async () => {
      if (!id) { setDb(null); setFields([]); setRecords([]); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const [summary, cols, recsResponse] = await Promise.all([
            databasesService.getById(id, ctrl.signal),
            fieldsService.list(id).then(r => Array.isArray(r) ? r : []),
            recordsService.list(id),
        ]);
        if (alive) {
          setDb(summary);
          setFields((cols || []).sort((a, b) => a.position - b.position));
          // FIX: recordsService.list devuelve { items: [], total: 0 }
          setRecords(recsResponse?.items || []);
        }
      } catch (e: any) {
        if (axios.isCancel(e)) return;
        console.error("DatabaseDetailPage load error:", e);
        if (alive) setError(e?.response?.data?.error || e.message || "Error al cargar la base de datos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; ctrl.abort(); };
  }, [id, activation?.activation_id]);

  const addColumn = async () => {
    const colName = newFieldName.trim();
    if (!colName || !newFieldType) {
        alert("El nombre y tipo de la columna son obligatorios.");
        return;
    }
    
    // Validar que si es tipo select tenga opciones
    if (newFieldType === "select" && selectOptions.length === 0) {
        alert("Debes agregar al menos una opción para el campo de selección.");
        return;
    }
    
    const nextPosition = getNextPosition(fields);

    try {
      // Preparar la configuración según el tipo de campo
      const fieldConfig = newFieldType === "select" || newFieldType === "multi_select"
        ? { options: selectOptions }
        : {};

      const newField = await fieldsService.create({
        dataset_id: db.dataset_id,
        name: colName,
        key: slugify(colName) + Date.now(),
        field_type: newFieldType, 
        position: nextPosition,
        is_required: false,
        is_active: true,
        is_multi: newFieldType === "multi_select",
        config: fieldConfig,
        settings: fieldConfig, // Alias para backend
        relation_target_kind: undefined,
        relation_target_dataset_id: undefined,
        relation_target_core: undefined,
        ...( { type: newFieldType } as any ),
      });

      setFields(prev => [...prev, newField].sort((a, b) => a.position - b.position));
      
      // Limpiar el formulario
      setNewFieldName("");
      setNewFieldType("text");
      setSelectOptions([]);
      setCurrentOption("");
      setIsFieldModalOpen(false);
      
    } catch (e: any) {
      console.error("Error al crear columna:", e);
      if (e?.response?.data?.error) {
        alert("Error al crear la columna: " + e.response.data.error);
      } else {
        alert("Error al crear la columna. Verifica la consola.");
      }
    }
  };

  const delCol = async (field_id: string) => {
    if (!confirm("¿Está seguro de eliminar esta columna? Se perderán todos los datos asociados.")) return;
    try {
        await fieldsService.remove(field_id);
        setFields(prev => prev.filter(f => f.field_id !== field_id));
    } catch (e: any) {
        alert("Error al eliminar la columna: " + (e?.response?.data?.error || e?.message));
    }
  };

  const addRow = async () => {
    try {
      const rec = await recordsService.create(db.dataset_id, activation!.activation_id, {});
      setRecords(prev => [rec, ...prev]);
    } catch (e: any) {
      alert("Error al crear la fila: " + (e?.response?.data?.error || e?.message));
    }
  };

  const delRow = async (recordId: string) => {
    if (!confirm("¿Está seguro de eliminar esta fila?")) return;
    try {
      await recordsService.remove(recordId);
      setRecords(prev => prev.filter(r => r.record_id !== recordId));
    } catch (e: any) {
      alert("Error al eliminar la fila: " + (e?.response?.data?.error || e?.message));
    }
  };

  const changeCell = async (recordId: string, fieldKey: string, value: any) => {
    const currentRecord = records.find(r => r.record_id === recordId);
    if (!currentRecord) {
        console.error("Error: Registro no encontrado", recordId);
        alert("Error de sincronización: Registro no encontrado.");
        return;
    }

    // Optimistic Update
    setRecords(prev => prev.map(r => r.record_id === recordId ? { 
        ...r, 
        data: { ...r.data, [fieldKey]: value },
        version: r.version + 1 
    } : r));

    try {
        console.log("Actualizando celda:", { recordId, fieldKey, value, version: currentRecord.version });
        
        await recordsService.patch(recordId, { 
            dataset_id: db.dataset_id, 
            data: { [fieldKey]: value },
            version: currentRecord.version
        });
        
        console.log("Celda actualizada correctamente");
    } catch (e: any) {
        console.error("Error al guardar celda:", e);
        console.error("Respuesta del servidor:", e?.response?.data);
        
        // Rollback: restaurar el valor original
        setRecords(prev => prev.map(r => r.record_id === recordId ? currentRecord : r));
        
        const errorMsg = e?.response?.data?.error || e?.response?.data?.message || "Error al guardar la celda. Recargue la página.";
        alert(errorMsg);
    }
  };

  const editColName = async (field_id: string, newName: string) => {
    if (!newName.trim()) return;
    const oldField = fields.find(f => f.field_id === field_id);
    if (!oldField || oldField.name === newName) return;

    setFields(prev => prev.map(f => f.field_id === field_id ? { ...f, name: newName } : f));

    try {
        await fieldsService.update(field_id, { name: newName });
    } catch (e) {
        alert("Error al renombrar columna.");
        setFields(prev => prev.map(f => f.field_id === field_id ? oldField : f));
    }
  }; 

  if (actLoading || loading) return <LinearProgress />;
  if (error) return <Typography color="error" sx={{m:4}}>{error}</Typography>;
  if (!db) return <Typography sx={{m:4}}>Base de datos no encontrada.</Typography>;

  return (
    <Container sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" gutterBottom>
          Base de Datos: {db.name}
        </Typography>
        <Stack direction="row" gap={1}>
            <Button variant="outlineGray" onClick={() => {
                setNewFieldName("");
                setNewFieldType("text");
                setIsFieldModalOpen(true);
            }}>
                Agregar columna
            </Button> 
            <Button variant="brand" onClick={addRow}>
                Agregar fila
            </Button>
        </Stack>
      </Stack>

      <Box sx={{ mt: 3, overflowX: "auto" }}>
        <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={{ p: 1, width: 48, bgcolor: "action.hover" }}>#</Box>
              {fields.map(f => (
                <Box key={f.field_id} component="th" sx={{ textAlign:"left", p:1, bgcolor:"action.hover", minWidth: 180 }}>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                        <TextField
                            size="small"
                            variant="standard"
                            fullWidth
                            value={f.name}
                            onChange={(e) => editColName(f.field_id, e.target.value)}
                            onBlur={(e) => editColName(f.field_id, e.target.value)}
                            sx={{
                                ".MuiInput-underline:before": { borderBottom: 'none' },
                                ".MuiInput-underline:after": { borderBottom: 'none' },
                            }}
                        />
                        <Tooltip title="Eliminar columna">
                          <IconButton size="small" onClick={() => delCol(f.field_id)}>
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>
              ))}
              <Box component="th" sx={{ p:1, bgcolor:"action.hover", width: 56 }} />
            </Box>
          </Box>
          <Box component="tbody">
            {records.map((r, idx) => (
              <Box key={r.record_id} component="tr" sx={{ borderBottom:1, borderColor:"divider" }}>
                <Box component="td" sx={{ p:1, color:"text.secondary", width:48 }}>{idx+1}</Box>
                {fields.map((f) => (
                  <Box key={`${r.record_id}-${f.field_id}`} component="td" sx={{ p:1, minWidth: 180 }}>
                    <CellEditor 
                      record={r} 
                      field={f} 
                      onUpdate={changeCell}
                    />
                  </Box>
                ))}
                <Box component="td" sx={{ p:1, width:56 }}>
                  <Tooltip title="Eliminar fila">
                    <IconButton size="small" onClick={()=>delRow(r.record_id)}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        {records.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center', border: 1, borderColor: 'divider', borderTop: 'none' }}>
            No hay filas en esta base de datos.
          </Typography>
        )}
      </Box>

      <Dialog open={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nueva Columna</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField 
              label="Nombre de la Columna" 
              value={newFieldName} 
              onChange={(e) => setNewFieldName(e.target.value)} 
              autoFocus 
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Campo</InputLabel>
              <Select 
                value={newFieldType} 
                label="Tipo de Campo" 
                onChange={(e) => {
                  setNewFieldType(e.target.value as FieldType);
                  // Limpiar opciones si cambia el tipo
                  if (e.target.value !== "select" && e.target.value !== "multi_select") {
                    setSelectOptions([]);
                    setCurrentOption("");
                  }
                }}
              >
                {AVAILABLE_FIELD_TYPES.map(t => (
                  <MenuItem key={t.key} value={t.key} title={t.desc}>
                    <Stack direction="row" alignItems="center" gap={1}>
                        <Typography sx={{ fontWeight: 'bold' }}>{t.icon}</Typography>
                        <Typography>{t.name}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Elige el tipo de datos que almacenará esta columna.</FormHelperText>
            </FormControl>

            {/* Campo para agregar opciones si es tipo select */}
            {(newFieldType === "select" || newFieldType === "multi_select") && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Opciones de selección:
                </Typography>
                
                {/* Lista de opciones agregadas */}
                {selectOptions.length > 0 && (
                  <Stack spacing={0.5} sx={{ mb: 1 }}>
                    {selectOptions.map((opt, idx) => (
                      <Box key={idx} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        p: 0.5,
                        bgcolor: 'action.hover',
                        borderRadius: 1
                      }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>{opt}</Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectOptions(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                )}

                {/* Input para agregar nueva opción */}
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Escribe una opción..."
                    value={currentOption}
                    onChange={(e) => setCurrentOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentOption.trim()) {
                        e.preventDefault();
                        setSelectOptions(prev => [...prev, currentOption.trim()]);
                        setCurrentOption("");
                      }
                    }}
                  />
                  <Button 
                    variant="softGray"
                    size="small"
                    onClick={() => {
                      if (currentOption.trim()) {
                        setSelectOptions(prev => [...prev, currentOption.trim()]);
                        setCurrentOption("");
                      }
                    }}
                    disabled={!currentOption.trim()}
                  >
                    Agregar
                  </Button>
                </Stack>
                <FormHelperText>
                  Presiona Enter o click en "Agregar" para añadir cada opción
                </FormHelperText>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="textBare" onClick={() => {
            setNewFieldName("");
            setNewFieldType("text");
            setSelectOptions([]);
            setCurrentOption("");
            setIsFieldModalOpen(false);
          }}>
            Cancelar
          </Button>
          <Button 
            variant="brand" 
            onClick={addColumn} 
            disabled={
              !newFieldName.trim() || 
              !newFieldType || 
              ((newFieldType === "select" || newFieldType === "multi_select") && selectOptions.length === 0)
            }
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}