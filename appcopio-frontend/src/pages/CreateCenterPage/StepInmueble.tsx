import React from 'react';
import { Box, Typography, TextField, FormGroup, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox } from '@mui/material';
import { CenterData } from '../../types/center';
import LikertScaleInput from '../../components/center/LikertScaleInput';
import './MultiStepCenterForm.css'

interface StepInmuebleProps {
    value: CenterData;
    onChange: (name: keyof CenterData, value: any) => void;
}

const StepInmueble = React.forwardRef<any, StepInmuebleProps>(({ value, onChange }, ref) => {
    const validate = () => {
        const requiredFields: (keyof CenterData)[] = [
            'tipo_inmueble', 'numero_habitaciones', 'estado_conservacion'
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
            <Typography variant="h6">Caracterización del Inmueble</Typography>
            <TextField fullWidth label="Tipo de Inmueble" name="tipo_inmueble" value={value.tipo_inmueble} onChange={(e) => onChange('tipo_inmueble', e.target.value)} required />
            <TextField fullWidth label="Número de habitaciones" name="numero_habitaciones" type="number" value={value.numero_habitaciones || ''} onChange={(e) => onChange('numero_habitaciones', Number(e.target.value))} required />
            
            <LikertScaleInput label="Estado de conservación" name="estado_conservacion" value={value.estado_conservacion} onChange={(name, val) => onChange(name, val)} />
            {/* === NUEVO BLOQUE: Materialidad === */}
            <Box className="materialidad">
                {/* Muros */}
                <Box>
                    <Typography variant="subtitle2">Muros</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.muro_hormigon} onChange={(e) => onChange("muro_hormigon", e.target.checked)} />} label="Hormigón armado" />
                    <FormControlLabel control={<Checkbox checked={value.muro_albaneria} onChange={(e) => onChange("muro_albaneria", e.target.checked)} />} label="Albañilería (bloque, piedra, ladrillo)" />
                    <FormControlLabel control={<Checkbox checked={value.muro_tabique} onChange={(e) => onChange("muro_tabique", e.target.checked)} />} label="Tabique forrado" />
                    <FormControlLabel control={<Checkbox checked={value.muro_adobe} onChange={(e) => onChange("muro_adobe", e.target.checked)} />} label="Adobe, barro, quincha, pirca" />
                    <FormControlLabel control={<Checkbox checked={value.muro_mat_precario} onChange={(e) => onChange("muro_mat_precario", e.target.checked)} />} label="Materiales precarios o de desecho" />
                    </FormGroup>
                </Box>

                {/* Pisos */}
                <Box>
                    <Typography variant="subtitle2">Pisos</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.piso_parquet} onChange={(e) => onChange("piso_parquet", e.target.checked)} />} label="Parquet, madera, flotante" />
                    <FormControlLabel control={<Checkbox checked={value.piso_ceramico} onChange={(e) => onChange("piso_ceramico", e.target.checked)} />} label="Cerámico, flexit o similar" />
                    <FormControlLabel control={<Checkbox checked={value.piso_alfombra} onChange={(e) => onChange("piso_alfombra", e.target.checked)} />} label="Alfombra o cubrepiso" />
                    <FormControlLabel control={<Checkbox checked={value.piso_baldosa} onChange={(e) => onChange("piso_baldosa", e.target.checked)} />} label="Baldosa de cemento" />
                    <FormControlLabel control={<Checkbox checked={value.piso_radier} onChange={(e) => onChange("piso_radier", e.target.checked)} />} label="Radier" />
                    <FormControlLabel control={<Checkbox checked={value.piso_enchapado} onChange={(e) => onChange("piso_enchapado", e.target.checked)} />} label="Enchapado de cemento" />
                    <FormControlLabel control={<Checkbox checked={value.piso_tierra} onChange={(e) => onChange("piso_tierra", e.target.checked)} />} label="Tierra" />
                    </FormGroup>
                </Box>

                {/* Techo */}
                <Box>
                    <Typography variant="subtitle2">Techo</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.techo_tejas} onChange={(e) => onChange("techo_tejas", e.target.checked)} />} label="Tejas o tejuelas (arcilla, metálica, cemento, madera, asfáltica)" />
                    <FormControlLabel control={<Checkbox checked={value.techo_losa} onChange={(e) => onChange("techo_losa", e.target.checked)} />} label="Losa hormigón" />
                    <FormControlLabel control={<Checkbox checked={value.techo_planchas} onChange={(e) => onChange("techo_planchas", e.target.checked)} />} label="Planchas metálicas, zinc, cobre, etc." />
                    <FormControlLabel control={<Checkbox checked={value.techo_fonolita} onChange={(e) => onChange("techo_fonolita", e.target.checked)} />} label="Fonolita o plancha de fieltro" />
                    <FormControlLabel control={<Checkbox checked={value.techo_mat_precario} onChange={(e) => onChange("techo_mat_precario", e.target.checked)} />} label="Materiales precarios o de desecho" />
                    <FormControlLabel control={<Checkbox checked={value.techo_sin_cubierta} onChange={(e) => onChange("techo_sin_cubierta", e.target.checked)} />} label="Sin cubierta en el techo" />
                    </FormGroup>
                </Box>
            </Box>
        </Box>
    );
});

export default StepInmueble;