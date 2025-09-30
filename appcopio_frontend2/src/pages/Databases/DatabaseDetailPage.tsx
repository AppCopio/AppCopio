import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { 
  Box, Button, Container, IconButton, LinearProgress, Stack, TextField, Tooltip, Typography,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, Select, MenuItem, FormHelperText
} from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { useActivation } from "@/contexts/ActivationContext";
import { databasesService } from "@/services/databases.service";
import { fieldsService } from "@/services/fields.service";
import { recordsService } from "@/services/records.service";
import type { DatabaseField, FieldType } from "@/types/field";
import type { DatabaseRecord } from "@/types/record";
import axios from "axios";


// =======================================================
// UTILS
// =======================================================

const getNextPosition = (currentFields: DatabaseField[]): number => {
    if (currentFields.length === 0) {
        // FIX: Si el array de campos cargados está vacío, asumimos que el campo por defecto (posición 0)
        // ya existe en la BD (debido a la lógica del backend), y la próxima posición segura es 1.
        return 1; 
    }
    // Si hay campos, calculamos la posición máxima. Usamos 0 como fallback, no -1.
    const positions = currentFields.map(f => (f.position ? Number(f.position) : 0));
    return Math.max(...positions) + 1;
};

/** Tipos de campo disponibles para el modal. */
const AVAILABLE_FIELD_TYPES = [
    { key: "text", name: "Texto simple", icon: "T", desc: "Texto corto o largo." },
    { key: "number", name: "Número", icon: "123", desc: "Moneda, edad, cantidad." },
    { key: "bool", name: "Interruptor (Sí/No)", icon: "✓", desc: "Sí/No, Activo/Inactivo." },
    { key: "date", name: "Fecha", icon: "📅", desc: "Fecha (sin hora)." },
    { key: "select", name: "Selección única", icon: "▼", desc: "Elige una opción de una lista." },
    // Asegúrate de que 'field_type' en fields.service.ts tenga todos estos tipos.
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

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    (async () => {
      if (!id) { setDb(null); setFields([]); setRecords([]); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const [summary, cols, recs] = await Promise.all([
            databasesService.getById(id,ctrl.signal),
            fieldsService.list(id).then(r => Array.isArray(r) ? r : []), // <-- FIX: El service ya debe devolver el array
            recordsService.list(id).then(r => Array.isArray(r) ? r : []),
        ]);
        if (alive) {
          setDb(summary);
          // Ordenar los campos por posición
          setFields((cols || []).sort((a, b) => a.position - b.position));
          setRecords(recs || []);
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


//REVISAR
  const addColumn = async () => {
    const colName = newFieldName.trim();
    if (!colName || !newFieldType) {
        alert("El nombre y tipo de la columna son obligatorios.");
        return;
    }
    
    const nextPosition = getNextPosition(fields);

    try {
      const newField = await fieldsService.create({
        dataset_id: db.dataset_id,
        name: colName,
        key: slugify(colName) + Date.now(),
        
        field_type: newFieldType, 
        position: nextPosition, // <--- ¡POSICIÓN ROBUSTA!
        
        is_required: false,
        is_active: true,
        is_multi: false,
        config: {},
        
        // Propiedades de relación
        relation_target_kind: undefined,
        relation_target_dataset_id: undefined,
        relation_target_core: undefined,
        
        // Alias para backend validation (depende de tu backend)
        ...( { type: newFieldType } as any ),
      });

      // 2. Actualizar el estado local de los campos y ordenar
      setFields(prev => [...prev, newField].sort((a, b) => a.position - b.position));
      
      // 3. Limpiar y cerrar modal
      setNewFieldName("");
      setNewFieldType("text");
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
        // Nota: En un sistema real, esto debería disparar una recarga de los registros si el campo se usaba.
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
    // 1. Encontrar el registro actual para obtener la versión
    const currentRecord = records.find(r => r.record_id === recordId);

    if (!currentRecord) {
        // Esto solo ocurre si la lista 'records' está desincronizada, pero es la validación
        alert("Error de sincronización: Registro no encontrado.");
        return;
    }

    // 2. Optimistic Update (UI): Usamos la versión ANTES del cambio
    setRecords(prev => prev.map(r => r.record_id === recordId ? { 
        ...r, 
        data: { ...r.data, [fieldKey]: value },
        // IMPORTANTE: Incrementamos la versión local para que el próximo PATCH use la versión correcta
        version: r.version + 1 
    } : r));

    // 3. Persistencia en el backend
    try {
        await recordsService.patch(recordId, { 
            dataset_id: db.dataset_id, 
            data: { [fieldKey]: value },
            version: currentRecord.version // <<-- CRÍTICO: Enviamos la versión ORIGINAL (para validación)
        });
    } catch (e: any) {
        // En caso de error, el servidor devuelve 409 (Conflicto) o 400 (Error de Versión)
        console.error("Error al guardar celda:", e);
        alert(e?.response?.data?.error || "Error al guardar la celda. Recargue la página.");
        // Un sistema completo haría un rollback aquí
    }
  };
  /*
  const changeColumnName = async (field: DatabaseField, newName: string) => {
    if (newName.trim() === field.name) return;
    try {
      const updatedField = await fieldsService.update(field.field_id, { name: newName });
      setFields(prev => prev.map(f => f.field_id === field.field_id ? updatedField : f));
    } catch (e: any) {
      alert("Error al actualizar la columna: " + (e?.response?.data?.error || e?.message));
    }
  };*/
  const editColName = async (field_id: string, newName: string) => {
    if (!newName.trim()) return;
    const oldField = fields.find(f => f.field_id === field_id);
    if (!oldField || oldField.name === newName) return;

    // Optimistic update
    setFields(prev => prev.map(f => f.field_id === field_id ? { ...f, name: newName } : f));

    try {
        await fieldsService.update(field_id, { name: newName });
    } catch (e) {
        alert("Error al renombrar columna.");
        // Rollback manual en caso de error
        setFields(prev => prev.map(f => f.field_id === field_id ? oldField : f));
    }
  }; 
  if (actLoading || loading) return <LinearProgress />;
  if (error) return <Typography color="error" sx={{m:4}}>{error}</Typography>;
  if (!db) return <Typography sx={{m:4}}>Base de datos no encontrada.</Typography>;

  return (
    <Container sx={{ py: 4 }}>
      {/* Barra superior */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" gutterBottom>
          Base de Datos: {db.name}
        </Typography>
        <Stack direction="row" gap={1}>
            {/* Nuevo botón que abre el modal */}
            <Button variant="outlined" onClick={() => {
                setNewFieldName("");
                setNewFieldType("text");
                setIsFieldModalOpen(true);
            }}>
                Agregar columna
            </Button> 
            <Button variant="contained" onClick={addRow}>
                Agregar fila
            </Button>
        </Stack>
      </Stack>

      {/* Tabla */}
      <Box sx={{ mt: 3, overflowX: "auto" }}>
        <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={{ p: 1, width: 48, bgcolor: "action.hover" }}>#</Box>
              {/* Encabezados de Columna */}
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
                    <TextField
                      size="small"
                      fullWidth
                      value={r.data?.[f.key] ?? ""}
                      onChange={(e)=>changeCell(r.record_id, f.key, e.target.value)}
                      // TODO: Renderizar el componente de entrada correcto según f.type
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

      {/* ======================================= */}
      {/* Modal de Creación de Columna (Dialog) */}
      {/* ======================================= */}
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
                onChange={(e) => setNewFieldType(e.target.value as FieldType)}
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setIsFieldModalOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={addColumn} disabled={!newFieldName.trim() || !newFieldType}>Crear</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}