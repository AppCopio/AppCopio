import React from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { CenterData } from '../../types/center';
import LikertScaleInput from '../../components/center/LikertScaleInput';

interface StepInmuebleProps {
    value: CenterData;
    onChange: (name: keyof CenterData, value: any) => void;
}

const StepInmueble = React.forwardRef<any, StepInmuebleProps>(({ value, onChange }, ref) => {
    const validate = () => {
        const requiredFields: (keyof CenterData)[] = [
            'tipo_inmueble', 'numero_habitaciones', 'estado_conservacion', 'material_muros', 'material_pisos', 'material_techo',
        ];
        const errors = requiredFields.some(field => value[field] === '' || value[field] === null || (typeof value[field] === 'number' && isNaN(value[field] as number)));
        if (errors) {
            alert('Por favor, complete todos los campos obligatorios del Paso 2.');
        }
        return !errors;
    };

    React.useImperativeHandle(ref, () => ({ validate }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Paso 2: Caracterización del Inmueble</Typography>
            <TextField fullWidth label="Tipo de Inmueble" name="tipo_inmueble" value={value.tipo_inmueble} onChange={(e) => onChange('tipo_inmueble', e.target.value)} required />
            <TextField fullWidth label="Número de habitaciones" name="numero_habitaciones" type="number" value={value.numero_habitaciones || ''} onChange={(e) => onChange('numero_habitaciones', Number(e.target.value))} required />
            
            <LikertScaleInput label="Estado de conservación" name="estado_conservacion" value={value.estado_conservacion} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Material de muros" name="material_muros" value={value.material_muros} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Material de pisos" name="material_pisos" value={value.material_pisos} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Material de techo" name="material_techo" value={value.material_techo} onChange={(name, val) => onChange(name, val)} />

            <TextField fullWidth label="Observaciones de acceso y espacios comunes" name="observaciones_acceso_y_espacios_comunes" value={value.observaciones_acceso_y_espacios_comunes} onChange={(e) => onChange('observaciones_acceso_y_espacios_comunes', e.target.value)} multiline rows={2} />
        </Box>
    );
});

export default StepInmueble;