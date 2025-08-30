// src/pages/CreateCenterPage/steps/StepEvaluacion.tsx
import React from 'react';
import { Box, Typography, TextField, Checkbox, FormControlLabel, FormGroup,Accordion,
  AccordionSummary,
  AccordionDetails } from '@mui/material';
import { CenterData } from '../../types/center';
import LikertScaleInput from '../../components/center/LikertScaleInput';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface StepEvaluacionProps {
    value: CenterData;
    onChange: (name: keyof CenterData, value: any) => void;
}

const StepEvaluacion = React.forwardRef<any, StepEvaluacionProps>(({ value, onChange }, ref) => {
    const validate = () => {
        const requiredFields: (keyof CenterData)[] = [
            // Incluye todos los campos requeridos de esta sección
            'agua_potable', 'estado_banos'
        ];
        
        const errors = requiredFields.some(field => 
            (value[field] === '' || value[field] === null || (typeof value[field] === 'number' && isNaN(value[field] as number)))
        );

       
        if (errors) {
            alert('Por favor, complete todos los campos obligatorios del Paso 3.');
        }
        return !(errors);
    };

    React.useImperativeHandle(ref, () => ({ validate }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Evaluación del Centro</Typography>

            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">I. Accesos y espacios comunes</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <LikertScaleInput label="Espacio amplio para al menos 10 afectados/as" name="espacio_10_afectados" value={value.espacio_10_afectados} onChange={onChange} />
                    <LikertScaleInput label="Infraestructura para personas con discapacidad/diversidad funcional" name="diversidad_funcional" value={value.diversidad_funcional} onChange={onChange} />
                    <LikertScaleInput label="Áreas comunes accesibles y seguras para todas las personas" name="areas_comunes_accesibles" value={value.areas_comunes_accesibles} onChange={onChange} />
                    <LikertScaleInput label="Espacios potenciales para el uso exclusivo de recreación" name="espacio_recreacion" value={value.espacio_recreacion} onChange={onChange} />
                    <TextField fullWidth label="Observaciones de espacios comunes" name="observaciones_espacios_comunes" value={value.observaciones_espacios_comunes} onChange={(e) => onChange("observaciones_espacios_comunes", e.target.value)} multiline rows={2} />
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">II. Servicios básicos</Typography>
                </AccordionSummary>
                <AccordionDetails>
                <LikertScaleInput label="Acceso a agua potable" name="agua_potable" value={value.agua_potable} onChange={onChange} />
                <LikertScaleInput label="Espacio para estanques de agua" name="agua_estanques" value={value.agua_estanques} onChange={onChange} />
                <LikertScaleInput label="Acceso a energía eléctrica" name="electricidad" value={value.electricidad} onChange={onChange} />
                <LikertScaleInput label="Acceso a calefacción" name="calefaccion" value={value.calefaccion} onChange={onChange} />
                <LikertScaleInput label="Sistema de alcantarillado" name="alcantarillado" value={value.alcantarillado} onChange={onChange} />
                <TextField fullWidth label="Observaciones de servicios básicos" name="observaciones_servicios_basicos" value={value.observaciones_servicios_basicos} onChange={(e) => onChange('observaciones_servicios_basicos', e.target.value)} multiline rows={2} />
                </AccordionDetails>
            </Accordion>
            <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">III. Baños y servicios higiénicos</Typography>
                </AccordionSummary>
                <AccordionDetails>
                <LikertScaleInput label="Baños en buen estado y funcionales" name="estado_banos" value={value.estado_banos} onChange={onChange} />
                <LikertScaleInput label="Proporción de WC por persona" name="wc_proporcion_personas" value={value.wc_proporcion_personas} onChange={onChange} />
                <LikertScaleInput label="Baños separados por género" name="banos_genero" value={value.banos_genero} onChange={onChange} />
                <LikertScaleInput label="Baños para grupos prioritarios" name="banos_grupos_prioritarios" value={value.banos_grupos_prioritarios} onChange={onChange} />
                <LikertScaleInput label="Baño con cierre desactivable desde el exterior" name="cierre_banos_emergencia" value={value.cierre_banos_emergencia} onChange={onChange} />
                <LikertScaleInput label="Proporción de lavamanos por persona" name="lavamanos_proporcion_personas" value={value.lavamanos_proporcion_personas} onChange={onChange} />
                <LikertScaleInput label="Dispensadores de jabón" name="dispensadores_jabon" value={value.dispensadores_jabon} onChange={onChange} />
                <LikertScaleInput label="Dispensadores de alcohol gel" name="dispensadores_alcohol_gel" value={value.dispensadores_alcohol_gel} onChange={onChange} />
                <LikertScaleInput label="Papeleros en baños" name="papeleros_banos" value={value.papeleros_banos} onChange={onChange} />
                <LikertScaleInput label="Papeleros en cocina" name="papeleros_cocina" value={value.papeleros_cocina} onChange={onChange} />
                <LikertScaleInput label="Proporción de duchas por persona" name="duchas_proporcion_personas" value={value.duchas_proporcion_personas} onChange={onChange} />
                <LikertScaleInput label="Proporción de lavadoras por persona" name="lavadoras_proporcion_personas" value={value.lavadoras_proporcion_personas} onChange={onChange} />
                <TextField fullWidth label="Observaciones de baños y servicios" name="observaciones_banos_y_servicios_higienicos" value={value.observaciones_banos_y_servicios_higienicos} onChange={(e) => onChange('observaciones_banos_y_servicios_higienicos', e.target.value)} multiline rows={2} />
                </AccordionDetails>
            </Accordion>
                <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">IV. Distribución de Habitaciones</Typography>
            </AccordionSummary>
            <AccordionDetails>
            <LikertScaleInput label="Posee espacios para ser dispuestos como habitaciones" name="posee_habitaciones" value={value.posee_habitaciones} onChange={onChange} />
            <LikertScaleInput label="Separación de espacios por familias, género, etc" name="separacion_familias" value={value.separacion_familias} onChange={onChange} />
            <LikertScaleInput label="Cuenta con sala de lactancia" name="sala_lactancia" value={value.sala_lactancia} onChange={onChange} />
            <TextField fullWidth label="Observaciones de distribución de habitaciones" name="observaciones_distribucion_habitaciones" value={value.observaciones_distribucion_habitaciones} onChange={(e) => onChange('observaciones_distribucion_habitaciones', e.target.value)} multiline rows={2} />
            </AccordionDetails>
        </Accordion>

        {/* V. Herramientas */}
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">V. Herramientas y Mobiliario</Typography>
            </AccordionSummary>
            <AccordionDetails>
            <LikertScaleInput label="Cuenta con mesas y sillas" name="cuenta_con_mesas_sillas" value={value.cuenta_con_mesas_sillas} onChange={onChange} />
            <LikertScaleInput label="Áreas de cocina y comedor adecuadas" name="cocina_comedor_adecuados" value={value.cocina_comedor_adecuados} onChange={onChange} />
            <LikertScaleInput label="Equipamiento básico de cocina" name="cuenta_equipamiento_basico_cocina" value={value.cuenta_equipamiento_basico_cocina} onChange={onChange} />
            <LikertScaleInput label="Cuenta con refrigerador" name="cuenta_con_refrigerador" value={value.cuenta_con_refrigerador} onChange={onChange} />
            <LikertScaleInput label="Cuenta con set de extracción de leche" name="cuenta_set_extraccion" value={value.cuenta_set_extraccion} onChange={onChange} />
            <TextField fullWidth label="Observaciones de herramientas y mobiliario" name="observaciones_herramientas_mobiliario" value={value.observaciones_herramientas_mobiliario} onChange={(e) => onChange('observaciones_herramientas_mobiliario', e.target.value)} multiline rows={2} />
            </AccordionDetails>
        </Accordion>

        {/* VI. Seguridad */}
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">VI. Seguridad y Protección</Typography>
            </AccordionSummary>
            <AccordionDetails>
            <LikertScaleInput label="Sistema de evacuación definido" name="sistema_evacuacion_definido" value={value.sistema_evacuacion_definido} onChange={onChange} />
            <LikertScaleInput label="Señaléticas adecuadas" name="cuenta_con_senaleticas_adecuadas" value={value.cuenta_con_senaleticas_adecuadas} onChange={onChange} />
            <TextField fullWidth label="Observaciones de seguridad" name="observaciones_condiciones_seguridad_proteccion_generales" value={value.observaciones_condiciones_seguridad_proteccion_generales} onChange={(e) => onChange('observaciones_condiciones_seguridad_proteccion_generales', e.target.value)} multiline rows={2} />
            </AccordionDetails>
        </Accordion>
        {/* VII. Dimensión Animal */}
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">VII. Dimensión Animal</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <LikertScaleInput label="Existe lugar para animales dentro" name="existe_lugar_animales_dentro" value={value.existe_lugar_animales_dentro} onChange={onChange} />
                <LikertScaleInput label="Existe lugar para animales fuera" name="existe_lugar_animales_fuera" value={value.existe_lugar_animales_fuera} onChange={onChange} />
            </AccordionDetails>
        </Accordion>
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">VIII. Elementos de Seguridad y Protección Personal</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 3 }}>
                
                {/* Protección para la cabeza */}
                <Box>
                    <Typography variant="subtitle2">Protección para la cabeza</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.existen_cascos} onChange={(e) => onChange('existen_cascos', e.target.checked)} />} label="Cascos de seguridad" />
                    <FormControlLabel control={<Checkbox checked={value.existen_gorros_cabello} onChange={(e) => onChange('existen_gorros_cabello', e.target.checked)} />} label="Gorros o redes para el cabello" />
                    </FormGroup>
                </Box>

                {/* Protección ojos y cara */}
                <Box>
                    <Typography variant="subtitle2">Protección para ojos y cara</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.existen_gafas} onChange={(e) => onChange('existen_gafas', e.target.checked)} />} label="Gafas de seguridad" />
                    <FormControlLabel control={<Checkbox checked={value.existen_caretas} onChange={(e) => onChange('existen_caretas', e.target.checked)} />} label="Careta facial" />
                    </FormGroup>
                </Box>

                {/* Protección respiratoria */}
                <Box>
                    <Typography variant="subtitle2">Protección respiratoria</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.existen_mascarillas} onChange={(e) => onChange('existen_mascarillas', e.target.checked)} />} label="Mascarillas desechables" />
                    <FormControlLabel control={<Checkbox checked={value.existen_respiradores} onChange={(e) => onChange('existen_respiradores', e.target.checked)} />} label="Respiradores" />
                    <FormControlLabel control={<Checkbox checked={value.existen_mascaras_gas} onChange={(e) => onChange('existen_mascaras_gas', e.target.checked)} />} label="Máscaras de gas" />
                    </FormGroup>
                </Box>

                {/* Protección manos y brazos */}
                <Box>
                    <Typography variant="subtitle2">Protección para manos y brazos</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.existen_guantes_latex} onChange={(e) => onChange('existen_guantes_latex', e.target.checked)} />} label="Guantes (látex, nitrilo, cuero, etc.)" />
                    <FormControlLabel control={<Checkbox checked={value.existen_mangas_protectoras} onChange={(e) => onChange('existen_mangas_protectoras', e.target.checked)} />} label="Mangas protectoras" />
                    </FormGroup>
                </Box>

                {/* Protección pies y piernas */}
                <Box>
                    <Typography variant="subtitle2">Protección para pies y piernas</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.existen_calzados_seguridad} onChange={(e) => onChange('existen_calzados_seguridad', e.target.checked)} />} label="Calzado de seguridad" />
                    <FormControlLabel control={<Checkbox checked={value.existen_botas_impermeables} onChange={(e) => onChange('existen_botas_impermeables', e.target.checked)} />} label="Botas impermeables" />
                    </FormGroup>
                </Box>

                {/* Protección corporal */}
                <Box>
                    <Typography variant="subtitle2">Protección corporal</Typography>
                    <FormGroup>
                    <FormControlLabel control={<Checkbox checked={value.existen_chalecos_reflectantes} onChange={(e) => onChange('existen_chalecos_reflectantes', e.target.checked)} />} label="Chalecos reflectantes" />
                    <FormControlLabel control={<Checkbox checked={value.existen_overoles_trajes} onChange={(e) => onChange('existen_overoles_trajes', e.target.checked)} />} label="Overoles o trajes de protección" />
                    <FormControlLabel control={<Checkbox checked={value.existen_camillas_catre} onChange={(e) => onChange('existen_camillas_catre', e.target.checked)} />} label="Camilla o catre clínico" />
                    </FormGroup>
                </Box>

                </Box>
            </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">IX. Elementos de Seguridad Comunitaria</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 3 }}>
                    
                    {/* Prevención y respuesta ante incendios */}
                    <Box>
                        <Typography variant="subtitle2">Prevención y respuesta ante incendios</Typography>
                        <FormGroup>
                        <FormControlLabel control={<Checkbox checked={value.existen_alarmas_incendios} onChange={(e) => onChange('existen_alarmas_incendios', e.target.checked)} />} label="Sistemas de alarmas contra incendios" />
                        <FormControlLabel control={<Checkbox checked={value.existen_hidrantes_mangueras} onChange={(e) => onChange('existen_hidrantes_mangueras', e.target.checked)} />} label="Hidrantes o mangueras" />
                        <FormControlLabel control={<Checkbox checked={value.existen_senaleticas} onChange={(e) => onChange('existen_senaleticas', e.target.checked)} />} label="Señaléticas de rutas de evacuación" />
                        <FormControlLabel control={<Checkbox checked={value.existen_luces_emergencias} onChange={(e) => onChange('existen_luces_emergencias', e.target.checked)} />} label="Luces de emergencia" />
                        <FormControlLabel control={<Checkbox checked={value.existen_extintores} onChange={(e) => onChange('existen_extintores', e.target.checked)} />} label="Extintores (agua, CO2, polvo químico, etc.)" />
                        </FormGroup>
                    </Box>

                    {/* Energía de emergencia */}
                    <Box>
                        <Typography variant="subtitle2">Suministro de energía de emergencia</Typography>
                        <FormGroup>
                        <FormControlLabel control={<Checkbox checked={value.existen_generadores} onChange={(e) => onChange('existen_generadores', e.target.checked)} />} label="Generadores eléctricos" />
                        <FormControlLabel control={<Checkbox checked={value.existen_baterias_externas} onChange={(e) => onChange('existen_baterias_externas', e.target.checked)} />} label="Baterías externas recargables" />
                        </FormGroup>
                    </Box>

                    {/* Comunicación y alerta temprana */}
                    <Box>
                        <Typography variant="subtitle2">Comunicación y alerta temprana</Typography>
                        <FormGroup>
                        <FormControlLabel control={<Checkbox checked={value.existen_altavoces} onChange={(e) => onChange('existen_altavoces', e.target.checked)} />} label="Altavoces o sistemas de megafonía" />
                        <FormControlLabel control={<Checkbox checked={value.existen_botones_alarmas} onChange={(e) => onChange('existen_botones_alarmas', e.target.checked)} />} label="Botones de pánico o alarmas manuales" />
                        <FormControlLabel control={<Checkbox checked={value.existen_sistemas_monitoreo} onChange={(e) => onChange('existen_sistemas_monitoreo', e.target.checked)} />} label="Sistemas de monitoreo (cámaras)" />
                        <FormControlLabel control={<Checkbox checked={value.existen_radio_recargable} onChange={(e) => onChange('existen_radio_recargable', e.target.checked)} />} label="Radio recargable, batería o pila" />
                        </FormGroup>
                    </Box>

                    {/* Seguridad estructural y accesibilidad */}
                    <Box>
                        <Typography variant="subtitle2">Seguridad estructural y accesibilidad</Typography>
                        <FormGroup>
                        <FormControlLabel control={<Checkbox checked={value.existen_barandillas_escaleras} onChange={(e) => onChange('existen_barandillas_escaleras', e.target.checked)} />} label="Barandillas/pasamanos en escaleras y rampas" />
                        <FormControlLabel control={<Checkbox checked={value.existen_puertas_emergencia_rapida} onChange={(e) => onChange('existen_puertas_emergencia_rapida', e.target.checked)} />} label="Puertas de emergencia con salida rápida" />
                        <FormControlLabel control={<Checkbox checked={value.existen_rampas} onChange={(e) => onChange('existen_rampas', e.target.checked)} />} label="Rampas de acceso" />
                        <FormControlLabel control={<Checkbox checked={value.existen_ascensores_emergencia} onChange={(e) => onChange('existen_ascensores_emergencia', e.target.checked)} />} label="Ascensores de emergencia" />
                        </FormGroup>
                    </Box>

                    {/* Primeros auxilios */}
                    <Box>
                        <Typography variant="subtitle2">Primeros auxilios</Typography>
                        <FormGroup>
                        <FormControlLabel control={<Checkbox checked={value.existen_botiquines} onChange={(e) => onChange('existen_botiquines', e.target.checked)} />} label="Botiquines de primeros auxilios" />
                        <FormControlLabel control={<Checkbox checked={value.existen_camilla_emergencia} onChange={(e) => onChange('existen_camilla_emergencia', e.target.checked)} />} label="Camilla de emergencia" />
                        <FormControlLabel control={<Checkbox checked={value.existen_sillas_ruedas} onChange={(e) => onChange('existen_sillas_ruedas', e.target.checked)} />} label="Sillas de ruedas" />
                        <FormControlLabel control={<Checkbox checked={value.existen_muletas} onChange={(e) => onChange('existen_muletas', e.target.checked)} />} label="Muletas de apoyo" />
                        <FormControlLabel control={<Checkbox checked={value.existen_desfibriladores} onChange={(e) => onChange('existen_desfibriladores', e.target.checked)} />} label="Desfibriladores externos (DEA)" />
                        </FormGroup>
                    </Box>

                    {/* Señaléticas de seguridad */}
                    <Box>
                        <Typography variant="subtitle2">Señaléticas de seguridad</Typography>
                        <FormGroup>
                        <FormControlLabel control={<Checkbox checked={value.existen_senales_advertencia} onChange={(e) => onChange('existen_senales_advertencia', e.target.checked)} />} label="Señales de advertencia (ej. Peligro)" />
                        <FormControlLabel control={<Checkbox checked={value.existen_senales_informativas} onChange={(e) => onChange('existen_senales_informativas', e.target.checked)} />} label="Señales informativas (ej. Salida)" />
                        <FormControlLabel control={<Checkbox checked={value.existen_senales_exclusivas} onChange={(e) => onChange('existen_senales_exclusivas', e.target.checked)} />} label="Señales exclusivas para personas con discapacidad" />
                        </FormGroup>
                    </Box>

                    </Box>

                    <TextField
                    fullWidth
                    label="Observaciones de seguridad comunitaria"
                    name="observaciones_seguridad_comunitaria"
                    value={value.observaciones_seguridad_comunitaria}
                    onChange={(e) => onChange('observaciones_seguridad_comunitaria', e.target.value)}
                    multiline
                    rows={2}
                    />
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">X. Dimensión Animal</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 3 }}></Box>
                    <FormGroup>
                        <FormControlLabel control={<Checkbox checked={value.existe_jaula_mascota} onChange={(e) => onChange('existe_jaula_mascota', e.target.checked)} name="existe_jaula_mascota" />} label="Existe jaula/bolso/porta mascota" />
                        <FormControlLabel control={<Checkbox checked={value.existe_recipientes_mascota} onChange={(e) => onChange('existe_recipientes_mascota', e.target.checked)} name="existe_recipientes_mascota" />} label="Existe recipientes para agua y comida" />
                        <FormControlLabel control={<Checkbox checked={value.existe_correa_bozal} onChange={(e) => onChange('existe_correa_bozal', e.target.checked)} name="existe_correa_bozal" />} label="Existe correa, arnés o bozal animal" />
                    </FormGroup>
                    <TextField fullWidth label="Observaciones de la dimensión animal" name="observaciones_dimension_animal" value={value.observaciones_dimension_animal} onChange={(e) => onChange('observaciones_dimension_animal', e.target.value)} multiline rows={2} />

                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">XI. Necesidades Adicionales</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <FormControlLabel
                        control={<Checkbox checked={value.importa_elementos_seguridad} onChange={(e) => onChange('importa_elementos_seguridad', e.target.checked)} name="importa_elementos_seguridad" />}
                        label=" ¿Considera que es importante para su organización adquirir los elementos de seguridad anteriormente mencionados en caso de emergencias y/o desastres?"
                    />
                    <TextField fullWidth label="Observaciones de elementos de seguridad" name="observaciones_importa_elementos_seguridad" value={value.observaciones_importa_elementos_seguridad} onChange={(e) => onChange('observaciones_importa_elementos_seguridad', e.target.value)} multiline rows={2} />
                    <FormControlLabel
                        control={<Checkbox checked={value.importa_conocimientos_capacitaciones} onChange={(e) => onChange('importa_conocimientos_capacitaciones', e.target.checked)} name="importa_conocimientos_capacitaciones" />}
                        label="Considera importante para su organización adquirir conocimientos y capacitaciones en torno a la respuesta a emergencias y reducción del riesgo de desastres (RRD)"
                    />
                    <TextField fullWidth label="Observaciones de conocimientos y capacitaciones" name="observaciones_importa_conocimientos_capacitaciones" value={value.observaciones_importa_conocimientos_capacitaciones} onChange={(e) => onChange('observaciones_importa_conocimientos_capacitaciones', e.target.value)} multiline rows={2} />
                </AccordionDetails>
            </Accordion>
        </Box>
    );
});

export default StepEvaluacion;