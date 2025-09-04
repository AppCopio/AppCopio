import React from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
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
        if (fieldErrors[name as string]) {
            setFieldErrors(prev => ({ ...prev, [name as string]: '' }));
        }
    };

    const validate = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!value.name || value.name.trim() === '') {
            errors.name = 'El nombre del centro es obligatorio.';
            isValid = false;
        }

        if (!value.address || value.address.trim() === '') {
            errors.address = 'La dirección es obligatoria.';
            isValid = false;
        }
        
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

        if (!value.type) {
            errors.type = 'El tipo de centro es obligatorio.';
            isValid = false;
        }

        if (value.capacity === null || isNaN(value.capacity) || value.capacity < 0) {
            errors.capacity = 'La capacidad debe ser un número positivo.';
            isValid = false;
        }
        
        if (value.latitude === null || isNaN(value.latitude)) {
            errors.latitude = 'La latitud es obligatoria.';
            isValid = false;
        }
        
        if (value.longitude === null || isNaN(value.longitude)) {
            errors.longitude = 'La longitud es obligatoria.';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    React.useImperativeHandle(ref, () => ({ validate }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="h6">Información General del Centro</Typography>
            <TextField
                fullWidth
                label="Nombre de la organización"
                name="name"
                value={value.name}
                onChange={handleChange}
                required
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
            />
            <TextField
                fullWidth
                label="Dirección"
                name="address"
                value={value.address}
                onChange={handleChange}
                required
                error={!!fieldErrors.address}
                helperText={fieldErrors.address}
            />
            <TextField
                fullWidth
                label="Nombre Directiva o Dirigenta"
                name="nombre_dirigente"
                value={value.nombre_dirigente}
                onChange={handleChange}
                required
                error={!!fieldErrors.nombre_dirigente}
                helperText={fieldErrors.nombre_dirigente}
            />
            <TextField
                fullWidth
                label="Cargo Directiva o Dirigente"
                name="cargo_dirigente"
                value={value.cargo_dirigente}
                onChange={handleChange}
                required
                error={!!fieldErrors.cargo_dirigente}
                helperText={fieldErrors.cargo_dirigente}
            />
            <TextField
                fullWidth
                label="Teléfono de contacto"
                name="telefono_contacto"
                value={value.telefono_contacto}
                onChange={handleChange}
                required
                error={!!fieldErrors.telefono_contacto}
                helperText={fieldErrors.telefono_contacto}
            />
            
            <FormControl fullWidth required error={!!fieldErrors.type}>
                <InputLabel>Tipo de Centro</InputLabel>
                <Select
                    name="type"
                    value={value.type}
                    label="Tipo de Centro"
                    onChange={handleChange as any}
                >
                    <MenuItem value="albergue">Albergue</MenuItem>
                    <MenuItem value="acopio">Acopio</MenuItem>
                </Select>
                {!!fieldErrors.type && <p style={{color: 'red', fontSize: '0.75rem', marginLeft: '14px', marginTop: '3px'}}>{fieldErrors.type}</p>}
            </FormControl>
        
            <TextField
                fullWidth
                label="Latitud"
                name="latitude"
                type="number"
                inputProps={{ step: "any" }}
                inputMode="decimal"
                value={value.latitude ?? ""}
                onChange={handleChange}
                required
                error={!!fieldErrors.latitude}
                helperText={fieldErrors.latitude}
            />
            <TextField
                fullWidth
                label="Longitud"
                name="longitude"
                type="number"
                inputProps={{ step: "any" }}
                inputMode="decimal"
                value={value.longitude ?? ""}
                onChange={handleChange}
                required
                error={!!fieldErrors.longitude}
                helperText={fieldErrors.longitude}
            />
            {/*falta folio*/}
        </Box>
    );
});

export default StepGeneral;