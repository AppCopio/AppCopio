import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { 
  Box, Button, Container, IconButton, LinearProgress, Stack, TextField, Tooltip, Typography,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Checkbox, InputLabel, Select, MenuItem, FormHelperText
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
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";



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
    { key: "time", name: "Hora", icon: "🕐", desc: "Hora del día (HH:MM).", placeholder: "" },
    { key: "datetime", name: "Fecha y Hora", icon: "📅🕐", desc: "Fecha con hora específica.", placeholder: "" },
    { key: "select", name: "Selección única", icon: "▼", desc: "Elige una opción de una lista.", placeholder: "Seleccionar..." },
    { key: "multi_select", name: "Selección múltiple", icon: "☑", desc: "Elige múltiples opciones de una lista.", placeholder: "Seleccionar..." },
    { key: "relation", name: "Relación", icon: "🔗", desc: "Relaciona con otra entidad (Personas, Familias).", placeholder: "" },
];
/** Entidades CORE disponibles para relacionar */
const CORE_ENTITIES = [
    { key: "persons", name: "Personas", desc: "Relacionar con personas registradas" },
    { key: "family_groups", name: "Grupos Familiares", desc: "Relacionar con familias" },
    // { key: "products", name: "Productos", desc: "Relacionar con inventario" }, // Descomentar cuando sea necesario
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
  const [relationTargetCore, setRelationTargetCore] = useState<string>("");
  //Para los drop de columnas
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    (async () => {
      if (!id) { setDb(null); setFields([]); setRecords([]); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        // Usar el endpoint "general-view" que trae TODO (incluyendo relaciones)
        const normalizeField = (f: any) => ({
          ...f,
          is_required: f.is_required ?? f.required ?? false,
        });
        const snapshot = await databasesService.getSnapshot(id);
        
        if (alive) {
          setDb(snapshot.dataset);
          setFields(snapshot.columns.map(normalizeField).sort((a: any, b: any) => a.position - b.position));          
          // Convertir los registros del snapshot a nuestro formato
          // El snapshot ya incluye las relaciones en cada record.cells
          const enrichedRecords = snapshot.records.map((rec:any ) => {
            // Reconstruir el objeto data con los valores de las celdas
            const reconstructedData: Record<string, any> = {};
            snapshot.columns.forEach((col: DatabaseField, idx: number) => {
              const cellValue = rec.cells[idx];
              
              // Para relaciones CORE, extraer solo el target_id
              if (col.type === 'relation' && Array.isArray(cellValue) && cellValue.length > 0) {
                // Las relaciones CORE vienen como [{ target_core, target_id }]
                reconstructedData[col.key] = cellValue[0]?.target_id ?? null;
              } else {
                reconstructedData[col.key] = cellValue;
              }
            });
            
            return {
              ...rec,
              data: reconstructedData
            };
          });
          
          setRecords(enrichedRecords);
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
    
    // ✅ Validar que si es tipo select O multi_select tenga opciones
    if ((newFieldType === "select" || newFieldType === "multi_select") && selectOptions.length === 0) {
        alert("Debes agregar al menos una opción para el campo de selección.");
        return;
    }

    // Validar que si es tipo relation tenga entidad core seleccionada
    if (newFieldType === "relation" && !relationTargetCore) {
        alert("Debes seleccionar una entidad para relacionar.");
        return;
    }
    
    const nextPosition = getNextPosition(fields);

    try {
      // Preparar la configuración según el tipo de campo
      let fieldConfig: any = {};
      let relationConfig: any = {};

      if (newFieldType === "select" || newFieldType === "multi_select") {
        fieldConfig = { options: selectOptions };
      } else if (newFieldType === "relation") {
        relationConfig = {
          relation_target_kind: "core",
          relation_target_core: relationTargetCore,
          relation_target_dataset_id: undefined,
        };
        fieldConfig = { relation_target_core: relationTargetCore };
      }

      const newField = await fieldsService.create({
        dataset_id: db.dataset_id,
        name: colName,
        key: slugify(colName) + Date.now(),
        field_type: newFieldType, 
        type: newFieldType, 
        position: nextPosition,
        required: newFieldRequired,
        is_required: newFieldRequired,
        is_active: true,
        is_multi: newFieldType === "multi_select", // ✅ Importante para multi_select
        config: fieldConfig,
        settings: fieldConfig,
        ...relationConfig,
        ...( { type: newFieldType } as any ),
      });

      setFields(prev => [...prev, newField].sort((a, b) => a.position - b.position));
      
      // Limpiar el formulario
      setNewFieldRequired(false);
      setNewFieldName("");
      setNewFieldType("text");
      setSelectOptions([]);
      setCurrentOption("");
      setRelationTargetCore("");
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
  // Buscar el campo a eliminar
  const field = fields.find(f => f.field_id === field_id);
  
  if (!field) {
    alert("No se encontró la columna a eliminar.");
    return;
  }

  console.log("🔍 Intentando eliminar columna:", {
    name: field.name,
    field_id: field.field_id,
    is_required: (field as any).is_required,
    required: (field as any).required,
  });
  
  // ✅ VALIDACIÓN 1: Verificar si es columna obligatoria
  const isRequired = Boolean((field as any).is_required || (field as any).required);
  
  console.log("✅ ¿Es columna obligatoria?", isRequired);
  
  if (isRequired) {
    alert(
      "❌ No se puede eliminar una columna obligatoria.\n\n" +
      "Las columnas marcadas como obligatorias no pueden ser eliminadas " +
      "para mantener la integridad de los datos."
    );
    return;
  }
  
  // ✅ VALIDACIÓN 2: Verificar si la columna tiene datos
  const hasData = records.some(r => {
    const value = r.data[field.key];
    return value !== undefined && value !== null && value !== "";
  });
  
  // Contar registros con datos en esta columna
  const recordsWithData = records.filter(r => {
    const value = r.data[field.key];
    return value !== undefined && value !== null && value !== "";
  }).length;
  
  console.log("📊 Tiene datos:", hasData, "- Registros con datos:", recordsWithData);
  
  // ✅ CONFIRMACIÓN: Mensaje diferente según si tiene datos o no
  let confirmMsg = "";
  
  if (hasData) {
    confirmMsg = 
      `⚠️ ADVERTENCIA: Esta columna contiene datos\n\n` +
      `Columna: "${field.name}"\n` +
      `Registros con datos: ${recordsWithData} de ${records.length}\n\n` +
      `Si eliminas esta columna, se perderán TODOS los datos asociados de forma permanente.\n\n` +
      `¿Estás seguro de que deseas continuar?`;
  } else {
    confirmMsg = 
      `¿Eliminar la columna "${field.name}"?\n\n` +
      `Esta columna está vacía (no contiene datos en ningún registro).\n\n` +
      `¿Deseas eliminarla?`;
  }
  
  // Solicitar confirmación
  if (!window.confirm(confirmMsg)) {
    console.log("❌ Usuario canceló la eliminación en primera confirmación");
    return;
  }
  
  // Si la columna tiene datos, solicitar una segunda confirmación
  if (hasData) {
    const doubleConfirm = window.confirm(
      `⚠️ ÚLTIMA CONFIRMACIÓN\n\n` +
      `Estás a punto de eliminar la columna "${field.name}" y ${recordsWithData} registro(s) con datos.\n\n` +
      `Esta acción NO se puede deshacer.\n\n` +
      `Escribe "ELIMINAR" mentalmente y confirma para proceder.`
    );
    
    if (!doubleConfirm) {
      console.log("❌ Usuario canceló la eliminación en segunda confirmación");
      return;
    }
  }
  
  // Proceder con la eliminación
  console.log("🗑️ Procediendo a eliminar columna...");
  try {
    // 🔧 PRIMERA PETICIÓN: Intentar eliminar sin confirmación
    let response;
    try {
      response = await fieldsService.remove(field_id);
      console.log("✅ Eliminación exitosa sin confirmación:", response);
    } catch (firstError: any) {
      console.log("📊 Primera respuesta:", firstError);
      
      // Si el error es 409 (needs_confirmation), hacer segunda petición con confirm=true
      if (firstError?.status === 409 && firstError?.data?.status === 'needs_confirmation') {
        console.log("⚠️ Backend requiere confirmación, enviando confirm=true...");
        
        // Segunda petición con confirmación
        response = await fieldsService.removeWithConfirmation(field_id);
        console.log("✅ Eliminación exitosa con confirmación:", response);
      } else {
        // Si es otro error (403 blocked_required, etc), lanzarlo
        throw firstError;
      }
    }
    
    // Verificar que se eliminó correctamente recargando la lista
    const refreshed = await fieldsService.list(db!.dataset_id);
    const stillExists = refreshed.some(f => f.field_id === field_id);

    if (stillExists) {
      console.error("❌ El backend rechazó la eliminación");
      alert(
        "❌ El backend rechazó la eliminación. No se realizaron cambios."
      );
      return;
    }
    
    // Actualizar el estado local
    setFields(refreshed.sort((a, b) => a.position - b.position));
    
    console.log("✅ Columna eliminada exitosamente");
    
    // Notificación de éxito
    if (hasData) {
      alert(
        `✅ Columna "${field.name}" eliminada exitosamente.\n\n` +
        `Se eliminaron los datos de ${recordsWithData} registro(s).`
      );
    } else {
      alert(`✅ Columna "${field.name}" eliminada exitosamente.`);
    }
  } catch (e: any) {
    console.error("❌ Error al eliminar columna:", e);
    
    // Manejar error de columna obligatoria
    if (e?.status === 403 || e?.data?.status === 'blocked_required') {
      alert(
        "❌ No se puede eliminar una columna obligatoria.\n\n" +
        "Las columnas marcadas como obligatorias no pueden ser eliminadas."
      );
      return;
    }
    
    // Error genérico
    const errorMsg = e?.data?.error || e?.message || "Error desconocido";
    alert(
      `❌ Error al eliminar la columna:\n\n${errorMsg}\n\n` +
      `Por favor, intenta nuevamente o contacta al administrador.`
    );
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

    // Encontrar el campo para determinar si es una relación
    const field = fields.find(f => f.key === fieldKey);
    console.log("📝 Campo encontrado:", field);
    console.log("💾 Guardando valor:", { recordId, fieldKey, value, fieldType: field?.type });

    // Optimistic Update
    setRecords(prev => prev.map(r => r.record_id === recordId ? { 
        ...r, 
        data: { ...r.data, [fieldKey]: value },
        version: r.version + 1 
    } : r));

    try {
        console.log("🚀 Enviando actualización:", { 
          recordId, 
          fieldKey, 
          value, 
          version: currentRecord.version,
          hasFields: !!fields.length 
        });
        
        await recordsService.patch(recordId, { 
            dataset_id: db.dataset_id, 
            data: { [fieldKey]: value },
            version: currentRecord.version,
            fields: fields // <- IMPORTANTE: Pasar los campos para detectar relaciones
        });
        
        console.log("✅ Celda actualizada correctamente");
    } catch (e: any) {
        console.error("❌ Error al guardar celda:", e);
        console.error("📄 Respuesta del servidor:", e?.response?.data);
        
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
  const reorderColumn = async (field_id: string, direction: 'up' | 'down') => {
  const currentIndex = fields.findIndex(f => f.field_id === field_id);
  
  if (currentIndex === -1) return;
  
  // Determinar el índice destino
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  
  // Validar que no se salga de los límites
  if (targetIndex < 0 || targetIndex >= fields.length) return;
  
  // Obtener la posición del campo destino
  const targetPosition = fields[targetIndex].position;
  
  try {
    // Actualizar la posición en el backend
    await fieldsService.update(field_id, { position: targetPosition });
    
    // Recargar los campos desde el servidor para obtener el orden actualizado
    const updatedFields = await fieldsService.list(db.dataset_id);
    setFields(updatedFields.sort((a, b) => a.position - b.position));
  } catch (e: any) {
    console.error("Error al reordenar columna:", e);
    alert("Error al reordenar la columna: " + (e?.response?.data?.error || e?.message));
  }
};
const handleDragStart = (e: React.DragEvent, fieldId: string) => {
  setDraggedFieldId(fieldId);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', fieldId);
  
  // Opcional: Cambiar el cursor
  if (e.currentTarget instanceof HTMLElement) {
    e.currentTarget.style.opacity = '0.5';
  }
};

const handleDragEnd = (e: React.DragEvent) => {
  setDraggedFieldId(null);
  setDragOverFieldId(null);
  
  // Restaurar opacidad
  if (e.currentTarget instanceof HTMLElement) {
    e.currentTarget.style.opacity = '1';
  }
};

const handleDragOver = (e: React.DragEvent, fieldId: string) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (draggedFieldId && draggedFieldId !== fieldId) {
    setDragOverFieldId(fieldId);
  }
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  setDragOverFieldId(null);
};

const handleDrop = async (e: React.DragEvent, targetFieldId: string) => {
  e.preventDefault();
  
  if (!draggedFieldId || draggedFieldId === targetFieldId) {
    setDraggedFieldId(null);
    setDragOverFieldId(null);
    return;
  }

  // Encontrar índices
  const draggedIndex = fields.findIndex(f => f.field_id === draggedFieldId);
  const targetIndex = fields.findIndex(f => f.field_id === targetFieldId);

  if (draggedIndex === -1 || targetIndex === -1) {
    setDraggedFieldId(null);
    setDragOverFieldId(null);
    return;
  }

  try {
    // Obtener la posición del campo destino
    const targetPosition = fields[targetIndex].position;
    
    // Actualizar en el backend
    await fieldsService.update(draggedFieldId, { position: targetPosition });
    
    // Recargar campos
    const updatedFields = await fieldsService.list(db.dataset_id);
    setFields(updatedFields.sort((a, b) => a.position - b.position));
    
  } catch (e: any) {
    console.error("Error al reordenar columna:", e);
    alert("Error al reordenar la columna: " + (e?.response?.data?.error || e?.message));
  } finally {
    setDraggedFieldId(null);
    setDragOverFieldId(null);
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
            <Button 
              variant="textBare" 
              onClick={() => window.location.reload()}
            >
              🔄 Recargar
            </Button>
            <Button variant="outlineGray" onClick={() => {
                setNewFieldName("");
                setNewFieldType("text");
                setSelectOptions([]);
                setCurrentOption("");
                setRelationTargetCore("");
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
              {fields.map((f, index) => (
                <Box 
                  key={f.field_id} 
                  component="th" 
                  draggable
                  onDragStart={(e) => handleDragStart(e, f.field_id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, f.field_id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, f.field_id)}
                  sx={{ 
                    textAlign:"left", 
                    p:1, 
                    bgcolor: dragOverFieldId === f.field_id 
                      ? "primary.light" 
                      : draggedFieldId === f.field_id 
                        ? "action.selected"
                        : "action.hover",
                    minWidth: 180,
                    cursor: draggedFieldId === f.field_id ? 'grabbing' : 'grab',
                    transition: 'background-color 0.2s, opacity 0.2s',
                    opacity: draggedFieldId === f.field_id ? 0.5 : 1,
                    borderLeft: dragOverFieldId === f.field_id ? '3px solid' : 'none',
                    borderColor: 'primary.main',
                    userSelect: 'none',
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    
                    {/* Indicador visual de drag */}
                    <DragIndicatorRounded 
                      sx={{ 
                        fontSize: 18, 
                        color: draggedFieldId === f.field_id ? "primary.main" : "text.disabled",
                        cursor: 'grab',
                        '&:active': {
                          cursor: 'grabbing'
                        }
                      }} 
                    />
                                  
                    {/* TextField para renombrar */}
                    <TextField
                    size="small"
                    variant="standard"
                    fullWidth
                    value={f.name}
                    onChange={(e) => editColName(f.field_id, e.target.value)}
                    onBlur={(e) => editColName(f.field_id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    sx={{
                      ".MuiInput-input": {
                        padding: '4px 0',
                        fontSize: '0.875rem',
                        fontWeight: 500,  // ← Hace el texto más visible
                        cursor: 'text',
                      },
                      ".MuiInput-underline:before": { 
                        borderBottom: '1px solid transparent'
                      },
                      ".MuiInput-underline:hover:before": { 
                        borderBottom: '1px solid rgba(0, 0, 0, 0.42)'  // ← Borde al hover
                      },
                      ".MuiInput-underline:after": { 
                        borderBottom: '2px solid'  // ← Borde al editar
                      },
                    }}
                  />
                    
                    {/* Botón de eliminar */}
                    <Tooltip title={`Eliminar columna "${f.name}"`} placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => delCol(f.field_id)}
                        onMouseDown={(e) => e.stopPropagation()} // Evitar drag cuando elimina
                      >
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

            {/* Campo para seleccionar entidad CORE si es tipo relation */}
            {newFieldType === "relation" && (
              <FormControl fullWidth>
                <InputLabel>Relacionar con</InputLabel>
                <Select
                  value={relationTargetCore}
                  label="Relacionar con"
                  onChange={(e) => setRelationTargetCore(e.target.value)}
                >
                  {CORE_ENTITIES.map(entity => (
                    <MenuItem key={entity.key} value={entity.key}>
                      {entity.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Selecciona la entidad con la que deseas relacionar este campo
                </FormHelperText>
              </FormControl>
            )}
            <FormControlLabel
            control={
              <Checkbox
                checked={newFieldRequired}
                onChange={(e) => setNewFieldRequired(e.target.checked)}
              />
            }
            label="Obligatoria (requerida)"
          />
          <FormHelperText>
            Si está activa, no podrá eliminarse y no aceptará valores vacíos.
          </FormHelperText>
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
              ((newFieldType === "select" || newFieldType === "multi_select") && selectOptions.length === 0) ||
              (newFieldType === "relation" && !relationTargetCore)
            }
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}