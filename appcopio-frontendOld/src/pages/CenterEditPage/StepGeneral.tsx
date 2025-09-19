import React from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, FormHelperText } from '@mui/material';
import { CenterData } from '../../types/center';

interface StepGeneralProps {
    value: CenterData;
    onChange: (name: keyof CenterData, value: any) => void;
}

const StepGeneral = React.forwardRef<any, StepGeneralProps>(({ value, onChange }, ref) => {
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
        const { name, value: newValue } = event.target;
        onChange(name as keyof CenterData, newValue);
        // Limpiamos el error al empezar a escribir en el campo
        if (fieldErrors[name as string]) {
            setFieldErrors(prev => ({ ...prev, [name as string]: '' }));
        }
    };

    const validate = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!value.nombre_dirigente || value.nombre_dirigente.trim() === '') {
            errors.nombre_dirigente = 'El nombre del dirigente es obligatorio.';
            isValid = false;
        }

        if (!value.cargo_dirigente || value.cargo_dirigente.trim() === '') {
            errors.cargo_dirigente = 'El cargo del dirigente es obligatorio.';
            isValid = false;
        }

        if (!value.telefono_contacto || value.telefono_contacto.trim() === '') {
            errors.telefono_contacto = 'El teléfono de contacto es obligatorio.';
            isValid = false;
        }

        if (value.folio !== null && value.folio !== undefined && typeof value.folio === 'string' && value.folio.trim() !== '' && isNaN(Number(value.folio))) {
            errors.folio = 'El folio debe ser un número.';
            isValid = false;
        }
        
        setFieldErrors(errors);
        return isValid;
    };

    React.useImperativeHandle(ref, () => ({ validate }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Información General del Centro</Typography>
            <TextField fullWidth label="Nombre de la organización" name="name" value={value.name} onChange={(e) => onChange('name', e.target.value)} required disabled />
            <TextField fullWidth label="Dirección" name="address" value={value.address} onChange={(e) => onChange('address', e.target.value)} required disabled />
            <TextField
                fullWidth
                label="Nombre Directiva o Dirigenta"
                name="nombre_dirigente"
                value={value.nombre_dirigente}
                onChange={handleChange}
                required
                error={!!fieldErrors.nombre_dirigente}
                helperText={fieldErrors.nombre_dirigente }
            />
            <TextField
                fullWidth
                label="Cargo Directiva o Dirigente"
                name="cargo_dirigente"
                value={value.cargo_dirigente}
                onChange={handleChange}
                required
                error={!!fieldErrors.cargo_dirigente}
                helperText={fieldErrors.cargo_dirigente }
            />
            <TextField
                fullWidth
                label="Teléfono de contacto"
                name="telefono_contacto"
                value={value.telefono_contacto}
                onChange={handleChange}
                required
                error={!!fieldErrors.telefono_contacto}
                helperText={fieldErrors.telefono_contacto }
            />
            
            <FormControl fullWidth required disabled>
                <InputLabel>Tipo de Centro</InputLabel>
                <Select name="type" value={value.type} label="Tipo de Centro" onChange={(e) => onChange('type', e.target.value)}>
                    <MenuItem value="albergue">Albergue</MenuItem>
                    <MenuItem value="acopio">Albergue comunitario</MenuItem>
                </Select>
            </FormControl>
            <TextField fullWidth label="Capacidad" name="capacity" type="number" inputProps={{ min: 0 }} value={value.capacity} onChange={(e) => onChange('capacity', Number(e.target.value))} />
            <TextField fullWidth label="Latitud" name="latitude" type="number" inputProps={{ step: "any" }} inputMode="decimal" value={value.latitude ?? ""} onChange={(e) => onChange('latitude', e.target.value === "" ? null : Number(e.target.value))} required disabled />
            <TextField fullWidth label="Longitud" name="longitude" type="number" inputProps={{ step: "any" }} inputMode="decimal" value={value.longitude ?? ""} onChange={(e) => onChange('longitude', e.target.value === "" ? null : Number(e.target.value))} required disabled />
        </Box>
    );
});

export default StepGeneral;