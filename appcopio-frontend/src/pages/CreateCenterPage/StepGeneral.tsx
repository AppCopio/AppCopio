import React from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
import { CenterData } from '../../types/center';

interface StepGeneralProps {
    value: CenterData;
    onChange: (name: keyof CenterData, value: any) => void;
}

const StepGeneral = React.forwardRef<any, StepGeneralProps>(({ value, onChange }, ref) => {
    const validate = () => {
        const requiredFields: (keyof CenterData)[] = ['center_id', 'name', 'address', 'type', 'capacity', 'latitude', 'longitude'];
        const errors = requiredFields.some(field => value[field] === '' || value[field] === null || (typeof value[field] === 'number' && isNaN(value[field] as number)));
        if (errors) {
            alert('Por favor, complete todos los campos obligatorios del Paso 1.');
        }
        return !errors;
    };

    React.useImperativeHandle(ref, () => ({ validate }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Paso 1: Información General del Centro</Typography>
            <TextField fullWidth label="ID del Centro" name="center_id" value={value.center_id} onChange={(e) => onChange('center_id', e.target.value)} required />
            <TextField fullWidth label="Nombre del Centro" name="name" value={value.name} onChange={(e) => onChange('name', e.target.value)} required />
            <TextField fullWidth label="Dirección" name="address" value={value.address} onChange={(e) => onChange('address', e.target.value)} required />
            <FormControl fullWidth required>
                <InputLabel>Tipo de Centro</InputLabel>
                <Select name="type" value={value.type} label="Tipo de Centro" onChange={(e) => onChange('type', e.target.value)}>
                    <MenuItem value="albergue">Albergue</MenuItem>
                    <MenuItem value="acopio">Acopio</MenuItem>
                </Select>
            </FormControl>
            <TextField fullWidth label="Capacidad" name="capacity" type="number" value={value.capacity} onChange={(e) => onChange('capacity', Number(e.target.value))} required />
            <TextField fullWidth label="Latitud" name="latitude" type="number" value={value.latitude} onChange={(e) => onChange('latitude', Number(e.target.value))} required />
            <TextField fullWidth label="Longitud" name="longitude" type="number" value={value.longitude} onChange={(e) => onChange('longitude', Number(e.target.value))} required />
            <FormControlLabel
                control={<Checkbox checked={value.should_be_active} onChange={(e) => onChange('should_be_active', e.target.checked)} name="should_be_active" />}
                label="Debería estar activo"
            />
        </Box>
    );
});

export default StepGeneral;