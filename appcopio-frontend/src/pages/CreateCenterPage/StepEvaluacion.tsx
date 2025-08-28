import React from 'react';
import { Box, Typography, TextField, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import { CenterData } from '../../types/center';
import LikertScaleInput from '../../components/center/LikertScaleInput';

interface StepEvaluacionProps {
    value: CenterData;
    onChange: (name: keyof CenterData, value: any) => void;
}

const StepEvaluacion = React.forwardRef<any, StepEvaluacionProps>(({ value, onChange }, ref) => {
    const validate = () => {
        // Lógica de validación para los campos de evaluación
        const requiredFields: (keyof CenterData)[] = [
            'espacio_10_afectados', 'diversidad_funcional', 'areas_comunes_accesibles', 'espacio_recreacion',
            'agua_potable', 'agua_estanques', 'electricidad', 'calefaccion', 'alcantarillado',
            'estado_banos', 'wc_proporcion_personas', 'banos_genero', 'banos_grupos_prioritarios', 'cierre_banos_emergencia',
            'lavamanos_proporcion_personas', 'dispensadores_jabon', 'dispensadores_alcohol_gel', 'papeleros_banos', 'papeleros_cocina',
            'duchas_proporcion_personas', 'lavadoras_proporcion_personas', 'posee_habitaciones', 'separacion_familias', 'sala_lactancia',
            'cuenta_con_mesas_sillas', 'cocina_comedor_adecuados', 'cuenta_equipamiento_basico_cocina', 'cuenta_con_refrigerador', 'cuenta_set_extraccion',
            'sistema_evacuacion_definido', 'cuenta_con_senaleticas_adecuadas', 'existe_lugar_animales_dentro', 'existe_lugar_animales_fuera',
            'existe_jaula_mascota', 'existe_recipientes_mascota', 'existe_correa_bozal', 'reconoce_personas_dentro_de_su_comunidad',
            'no_reconoce_personas_dentro_de_su_comunidad', 'existen_cascos', 'existen_gorros_cabello', 'existen_gafas', 'existen_caretas',
            'existen_mascarillas', 'existen_respiradores', 'existen_mascaras_gas', 'existen_guantes_latex', 'existen_mangas_protectoras',
            'existen_calzados_seguridad', 'existen_botas_impermeables', 'existen_chalecos_reflectantes', 'existen_overoles_trajes', 'existen_camillas_catre',
            'existen_alarmas_incendios', 'existen_hidrantes_mangueras', 'existen_senaleticas', 'existen_luces_emergencias', 'existen_extintores',
            'existen_generadores', 'existen_baterias_externas', 'existen_altavoces', 'existen_botones_alarmas', 'existen_sistemas_monitoreo',
            'existen_radio_recargable', 'existen_barandillas_escaleras', 'existen_puertas_emergencia_rapida', 'existen_rampas', 'existen_ascensores_emergencia',
            'importa_elementos_seguridad', 'importa_conocimientos_capacitaciones'
        ];
        const errors = requiredFields.some(field => value[field] === '' || value[field] === null || (typeof value[field] === 'number' && isNaN(value[field] as number)) || (typeof value[field] === 'boolean' && value[field] === undefined));
        if (errors) {
            alert('Por favor, complete todos los campos obligatorios del Paso 3.');
        }
        return !errors;
    };

    React.useImperativeHandle(ref, () => ({ validate }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Paso 3: Evaluación del Centro</Typography>
            {/* Sección Accesos y espacios comunes */}
            <Typography variant="h6">3. Accesos y espacios comunes</Typography>
            <LikertScaleInput label="Espacio amplio para al menos 10 afectados/as" name="espacio_10_afectados" value={value.espacio_10_afectados} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Infraestructura para personas con discapacidad/diversidad funcional" name="diversidad_funcional" value={value.diversidad_funcional} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Áreas comunes accesibles y seguras para todas las personas" name="areas_comunes_accesibles" value={value.areas_comunes_accesibles} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Espacios potenciales para el uso exclusivo de recreación" name="espacio_recreacion" value={value.espacio_recreacion} onChange={(name, val) => onChange(name, val)} />
            <TextField fullWidth label="Observaciones de espacios comunes" name="observaciones_espacios_comunes" value={value.observaciones_espacios_comunes} onChange={(e) => onChange('observaciones_espacios_comunes', e.target.value)} multiline rows={2} />

            {/* Sección Servicios básicos */}
            <Typography variant="h6">4. Servicios básicos</Typography>
            <LikertScaleInput label="Acceso a agua potable" name="agua_potable" value={value.agua_potable} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Espacio para estanques de agua" name="agua_estanques" value={value.agua_estanques} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Acceso a energía eléctrica" name="electricidad" value={value.electricidad} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Acceso a calefacción" name="calefaccion" value={value.calefaccion} onChange={(name, val) => onChange(name, val)} />
            <LikertScaleInput label="Sistema de alcantarillado" name="alcantarillado" value={value.alcantarillado} onChange={(name, val) => onChange(name, val)} />
            <TextField fullWidth label="Observaciones de servicios básicos" name="observaciones_servicios_basicos" value={value.observaciones_servicios_basicos} onChange={(e) => onChange('observaciones_servicios_basicos', e.target.value)} multiline rows={2} />

            {/* ... (el resto de las secciones) ... */}
        </Box>
    );
});

export default StepEvaluacion;