import { useState, useEffect } from "react";
import { TextField, MenuItem, CircularProgress, Typography } from "@mui/material";
import { personsService, Person } from "@/services/persons.service";
import { familyService, FamilyGroup } from "@/services/family.service";

interface RelationSelectorProps {
  targetCore: 'persons' | 'family_groups' | 'products';
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export default function RelationSelector({ 
  targetCore, 
  value, 
  onChange, 
  disabled 
}: RelationSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    
    (async () => {
      setLoading(true);
      try {
        if (targetCore === 'persons') {
          const persons = await personsService.list(controller.signal);
          setOptions(persons);
        } else if (targetCore === 'family_groups') {
          const families = await familyService.list(controller.signal);
          setOptions(families);
        }
        // TODO: Agregar productos cuando sea necesario
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error loading relation options:", error);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [targetCore]);

  const getDisplayText = (item: any): string => {
    if (targetCore === 'persons') {
      return personsService.getFullDisplay(item as Person);
    } else if (targetCore === 'family_groups') {
      return familyService.getDisplayName(item as FamilyGroup);
    }
    return String(item.id || item.name || 'Desconocido');
  };

  const getItemId = (item: any): number => {
    if (targetCore === 'persons') return item.person_id;
    if (targetCore === 'family_groups') return item.family_id;
    return item.id;
  };

  const filteredOptions = options.filter(item => {
    const display = getDisplayText(item).toLowerCase();
    return display.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Cargando...
        </Typography>
      </div>
    );
  }

  return (
    <TextField
      select
      size="small"
      fullWidth
      value={value ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === "" ? null : Number(val));
      }}
      disabled={disabled}
      placeholder="Seleccionar..."
      sx={{
        "& .MuiSelect-select": {
          paddingY: 1
        }
      }}
    >
      <MenuItem value="">
        <em>Ninguno</em>
      </MenuItem>
      
      {/* Campo de búsqueda dentro del select */}
      <MenuItem 
        value={value ?? ""} 
        onClick={(e) => e.stopPropagation()}
        sx={{ position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 1 }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => {
            e.stopPropagation();
            setSearchTerm(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          sx={{ mb: 1 }}
        />
      </MenuItem>

      {filteredOptions.map((item) => {
        const itemId = getItemId(item);
        return (
          <MenuItem key={itemId} value={itemId}>
            {getDisplayText(item)}
          </MenuItem>
        );
      })}

      {filteredOptions.length === 0 && (
        <MenuItem disabled>
          <em>No se encontraron resultados</em>
        </MenuItem>
      )}
    </TextField>
  );
}