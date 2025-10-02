import { Box, Button, TextField, Checkbox, FormControlLabel, MenuItem } from "@mui/material";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import type { DatabaseField } from "@/types/field";
import type { DatabaseRecord } from "@/types/record";
import RelationSelector from "@/components/databases/RelationSelector";

// Tipos de campo disponibles con sus configuraciones de placeholder
const FIELD_TYPE_CONFIG = {
  text: { placeholder: "Escribir..." },
  number: { placeholder: "Ej: 123" },
  bool: { placeholder: "" },
  date: { placeholder: "" },
  time: { placeholder: "" },
  datetime: { placeholder: "" },
  select: { placeholder: "Seleccionar..." },
  multi_select: { placeholder: "Seleccionar..." },
  relation: { placeholder: "Seleccionar..." },
};

interface CellEditorProps {
  record: DatabaseRecord;
  field: DatabaseField;
  onUpdate: (recordId: string, fieldKey: string, value: any) => void;
}

/**
 * Componente para editar celdas de una base de datos flexible.
 * Renderiza el control apropiado según el tipo de campo:
 * - Boolean: Botones Sí/No
 * - Date: Selector de fecha (date picker)
 * - Number: Input numérico con placeholder
 * - Text: Input de texto con placeholder
 */
export default function CellEditor({ record, field, onUpdate }: CellEditorProps) {
  const currentValue = record.data?.[field.key];
  const fieldConfig = FIELD_TYPE_CONFIG[field.type] || FIELD_TYPE_CONFIG.text;

  // ============================================
  // CAMPOS BOOLEANOS (Checkbox)
  // ============================================
  if (field.type === "bool") {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 0.5 }}>
        <Checkbox
          checked={currentValue === true}
          onChange={(e) => onUpdate(record.record_id, field.key, e.target.checked)}
          sx={{
            '&.Mui-checked': {
              color: 'primary.main',
            }
          }}
        />
      </Box>
    );
  }

  // ============================================
  // CAMPOS DE FECHA
  // ============================================
  if (field.type === "date") {
    return (
      <TextField
        type="date"
        size="small"
        fullWidth
        value={currentValue || ""}
        onChange={(e) => onUpdate(record.record_id, field.key, e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ 
          "& .MuiInputBase-root": { 
            fontFamily: 'inherit',
          }
        }}
      />
    );
  }

  // ============================================
  // CAMPOS DE TIEMPO
  // ============================================
  if (field.type === "time") {
    return (
      <TextField
        type="time"
        size="small"
        fullWidth
        value={currentValue || ""}
        onChange={(e) => onUpdate(record.record_id, field.key, e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ 
          "& .MuiInputBase-root": { 
            fontFamily: 'inherit',
          }
        }}
      />
    );
  }

  // ============================================
  // CAMPOS DE FECHA Y HORA
  // ============================================
  if (field.type === "datetime") {
    return (
      <TextField
        type="datetime-local"
        size="small"
        fullWidth
        value={currentValue || ""}
        onChange={(e) => onUpdate(record.record_id, field.key, e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ 
          "& .MuiInputBase-root": { 
            fontFamily: 'inherit',
          }
        }}
      />
    );
  }

  // ============================================
  // CAMPOS NUMÉRICOS
  // ============================================
  if (field.type === "number") {
    return (
      <TextField
        type="number"
        size="small"
        fullWidth
        value={currentValue ?? ""}
        onChange={(e) => onUpdate(record.record_id, field.key, e.target.value)}
        placeholder={fieldConfig.placeholder}
        sx={{
          "& input::placeholder": {
            color: 'text.secondary',
            opacity: 0.6
          }
        }}
      />
    );
  }

  // ============================================
  // CAMPOS DE SELECCIÓN (Select con opciones)
  // ============================================
  if (field.type === "select") {
    const options = field.config?.options  || [];
    
    return (
      <TextField
        select
        size="small"
        fullWidth
        value={currentValue ?? ""}
        onChange={(e) => onUpdate(record.record_id, field.key, e.target.value)}
        placeholder={fieldConfig.placeholder}
        SelectProps={{
          native: false,
        }}
      >
        <MenuItem value="">
          <em>Ninguno</em>
        </MenuItem>
        {options.map((option: string, idx: number) => (
          <MenuItem key={idx} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  // ============================================
  // CAMPOS DE SELECCIÓN MÚLTIPLE
  // ============================================
  if (field.type === "multi_select") {
    // TODO: Implementar selector múltiple con chips
    // Por ahora lo manejamos como texto
    return (
      <TextField
        type="text"
        size="small"
        fullWidth
        value={currentValue ?? ""}
        onChange={(e) => onUpdate(record.record_id, field.key, e.target.value)}
        placeholder={fieldConfig.placeholder}
        sx={{
          "& input::placeholder": {
            color: 'text.secondary',
            opacity: 0.6
          }
        }}
      />
    );
  }

  // ============================================
  // CAMPOS DE RELACIÓN (a tablas CORE)
  // ============================================
  if (field.type === "relation") {
    const targetCore = field.config?.relation_target_core ;
    
    if (!targetCore) {
      return (
        <TextField
          type="text"
          size="small"
          fullWidth
          value={currentValue ?? ""}
          disabled
          placeholder="Configuración de relación incompleta"
          sx={{
            "& input::placeholder": {
              color: 'error.main',
              opacity: 0.6
            }
          }}
        />
      );
    }

    return (
      <RelationSelector
        targetCore={targetCore as 'persons' | 'family_groups' | 'products'}
        value={currentValue as number | null}
        onChange={(val) => onUpdate(record.record_id, field.key, val)}
      />
    );
  }

  // ============================================
  // CAMPOS DE TEXTO (Default)
  // ============================================
  return (
    <TextField
      type="text"
      size="small"
      fullWidth
      value={currentValue ?? ""}
      onChange={(e) => onUpdate(record.record_id, field.key, e.target.value)}
      placeholder={fieldConfig.placeholder}
      sx={{
        "& input::placeholder": {
          color: 'text.secondary',
          opacity: 0.6
        }
      }}
    />
  );
}