import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Box,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    OutlinedInput,
    Alert,
    InputAdornment,
    TextField,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    FormGroup,
    RadioGroup, // Importado para los radio buttons
    Radio // Importado para los radio buttons
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../contexts/AuthContext';
import { registerForSync } from '../../utils/syncManager';
import './CreateCenterPage.css';
import { createCenter } from '../../services/centerApi';
import { CenterData } from '../../types/center'; 

// Opciones para la escala de Likert
const likertOptions = [
    { value: 1, label: 'No existe' },
    { value: 2, label: 'Existe, pero precario' },
    { value: 3, label: 'Estado regular' },
    { value: 4, label: 'Estado bueno' },
    { value: 5, label: 'Excelente' },
];

const LikertScaleInput: React.FC<{ 
    label: string; 
    name: keyof CenterData; 
    value: number | null; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, name, value, onChange }) => (
    <FormControl component="fieldset" fullWidth margin="normal">
        <Typography variant="subtitle1" component="legend">{label}</Typography>
        <RadioGroup
            row
            name={name}
            value={value !== null ? String(value) : ''}
            onChange={onChange}
        >
            {likertOptions.map(option => (
                <FormControlLabel
                    key={option.value}
                    value={String(option.value)}
                    control={<Radio required />}
                    label={`${option.value}: ${option.label}`}
                    labelPlacement="bottom"
                />
            ))}
        </RadioGroup>
    </FormControl>
);


const CreateCenterPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState<CenterData>({
        // Campos de la tabla Centers
center_id: '',
    name: '',
    address: '',
    type: 'Albergue',
    folio: '',
    capacity: 0,
    latitude: 0,
    longitude: 0,
    should_be_active: false,
    comunity_charge_id: null,
    municipal_manager_id: null,
    is_active:false,

    // Campos de CentersDescription
    nombre_dirigente: '',
    cargo_dirigente: '',
    telefono_contacto: '',

    tipo_inmueble: '',
    numero_habitaciones: null,
    estado_conservacion: null,
    muro_hormigon: false,
    muro_albaneria: false,
    muro_tabique: false,
    muro_adobe: false,
    muro_mat_precario: false,
    piso_parquet: false,
    piso_ceramico: false,
    piso_alfombra: false,
    piso_baldosa:false,
    piso_radier: false,
    piso_enchapado:false,
    piso_tierra: false,
    techo_tejas: false,
    techo_losa: false,
    techo_planchas:false,
    techo_fonolita: false,    
    techo_mat_precario: false,
    techo_sin_cubierta: false,

    espacio_10_afectados: null,
    diversidad_funcional: null,
    areas_comunes_accesibles: null,
    espacio_recreacion: null,
    observaciones_espacios_comunes: '',
    agua_potable: null,
    agua_estanques: null,
    electricidad: null,
    calefaccion: null,
    alcantarillado: null,
    observaciones_servicios_basicos: '',
    estado_banos: null,
    wc_proporcion_personas: null,
    banos_genero: null,
    banos_grupos_prioritarios: null,
    cierre_banos_emergencia: null,
    lavamanos_proporcion_personas: null,
    dispensadores_jabon: null,
    dispensadores_alcohol_gel: null,
    papeleros_banos: null,
    papeleros_cocina: null,
    duchas_proporcion_personas: null,
    lavadoras_proporcion_personas: null,
    observaciones_banos_y_servicios_higienicos: '',
    posee_habitaciones: null,
    separacion_familias: null,
    sala_lactancia: null,
    observaciones_distribucion_habitaciones: '',
    cuenta_con_mesas_sillas: null,
    cocina_comedor_adecuados: null,
    cuenta_equipamiento_basico_cocina: null,
    cuenta_con_refrigerador: null,
    cuenta_set_extraccion: null,
    observaciones_herramientas_mobiliario: '',
    sistema_evacuacion_definido: null,
    cuenta_con_senaleticas_adecuadas: null,
    observaciones_condiciones_seguridad_proteccion_generales: '',
    existe_lugar_animales_dentro: null,
    existe_lugar_animales_fuera: null,
    existe_jaula_mascota: false,
    existe_recipientes_mascota: false,
    existe_correa_bozal: false,
    reconoce_personas_dentro_de_su_comunidad: false,
    no_reconoce_personas_dentro_de_su_comunidad: false,
    observaciones_dimension_animal: '',
    existen_cascos: false,
    existen_gorros_cabello: false,
    existen_gafas: false,
    existen_caretas: false,
    existen_mascarillas: false,
    existen_respiradores: false,
    existen_mascaras_gas: false,
    existen_guantes_latex: false,
    existen_mangas_protectoras: false,
    existen_calzados_seguridad: false,
    existen_botas_impermeables: false,
    existen_chalecos_reflectantes: false,
    existen_overoles_trajes: false,
    existen_camillas_catre: false,
    existen_alarmas_incendios: false,
    existen_hidrantes_mangueras: false,
    existen_senaleticas: false,
    existen_luces_emergencias: false,
    existen_extintores: false,
    existen_generadores: false,
    existen_baterias_externas: false,
    existen_altavoces: false,
    existen_botones_alarmas: false,
    existen_sistemas_monitoreo: false,
    existen_radio_recargable: false,
    existen_barandillas_escaleras: false,
    existen_puertas_emergencia_rapida: false,
    existen_rampas: false,
    existen_ascensores_emergencia: false,
    existen_botiquines: false,
    existen_camilla_emergencia: false,
    existen_sillas_ruedas: false,
    existen_muletas : false,
    existen_desfibriladores: false,
    existen_senales_advertencia: false,
    existen_senales_informativas : false,
    existen_senales_exclusivas:false,
    observaciones_seguridad_comunitaria: '',
    importa_elementos_seguridad: false,
    observaciones_importa_elementos_seguridad: '',
    importa_conocimientos_capacitaciones: false,
    observaciones_importa_conocimientos_capacitaciones: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (value === '' ? null : (type === 'number' ? Number(value) : value)),
        }));
    };

    const validateForm = () => {
        const errors: string[] = [];
        const requiredFields: (keyof CenterData)[] = [
            'center_id', 'name', 'address', 'type', 'capacity', 'latitude', 'longitude',
            'tipo_inmueble', 'numero_habitaciones', 'estado_conservacion',
            'espacio_10_afectados', 'diversidad_funcional', 'areas_comunes_accesibles', 'espacio_recreacion',
            'agua_potable', 'agua_estanques', 'electricidad', 'calefaccion', 'alcantarillado',
            'estado_banos', 'wc_proporcion_personas', 'banos_genero', 'banos_grupos_prioritarios', 'cierre_banos_emergencia',
            'lavamanos_proporcion_personas', 'dispensadores_jabon', 'dispensadores_alcohol_gel', 'papeleros_banos', 'papeleros_cocina',
            'duchas_proporcion_personas', 'lavadoras_proporcion_personas', 'posee_habitaciones', 'separacion_familias', 'sala_lactancia',
            'cuenta_con_mesas_sillas', 'cocina_comedor_adecuados', 'cuenta_equipamiento_basico_cocina', 'cuenta_con_refrigerador', 'cuenta_set_extraccion',
            'sistema_evacuacion_definido', 'cuenta_con_senaleticas_adecuadas', 'existe_lugar_animales_dentro', 'existe_lugar_animales_fuera'
        ];
    
        requiredFields.forEach(field => {
            if (formData[field] === '' || formData[field] === null || (typeof formData[field] === 'number' && isNaN(formData[field] as number))) {
                errors.push(`El campo '${field}' es obligatorio.`);
            }
        });
        
        if (typeof formData.latitude !== 'number' || isNaN(formData.latitude)) {
            errors.push('La latitud debe ser un número válido.');
        }
        if (typeof formData.longitude !== 'number' || isNaN(formData.longitude)) {
            errors.push('La longitud debe ser un número válido.');
        }
    
        setValidationErrors(errors);
        return errors.length === 0;
    };
    

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsConfirmationOpen(true);
    };

    const handleConfirmSubmit = async () => {
        setIsSaving(true);
        if (navigator.onLine) {
            try {
                const newCenter = await createCenter(formData);
                setSuccess(`Centro "${newCenter.name}" creado con éxito.`);
                localStorage.removeItem('pendingCenterRegistrationForm');
                setTimeout(() => navigate('/admin/centers'), 2000);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
            } finally {
                setIsLoading(false);
                setIsConfirmationOpen(false);
            }
        } else {
            localStorage.setItem('pendingCenterRegistrationForm', JSON.stringify(formData));
            registerForSync('sync-centers');
            alert('Sin conexión. El formulario se guardó y se sincronizará cuando recuperes la red.');
            setIsLoading(false);
            setIsConfirmationOpen(false);
            navigate('/admin/centers');
        }
    };

    const handleCancelSubmit = () => {
        setIsConfirmationOpen(false);
        setIsSaving(false);
    };


    return (
        <Box sx={{ maxWidth: 900, margin: '2rem auto', padding: '2rem', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
            <Typography variant="h4" component="h1" align="center" gutterBottom>
                Registro de Nuevo Centro de Acopio
            </Typography>
            <form onSubmit={handleSubmit}>
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">1. Información General del Centro</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Datos básicos para la identificación y ubicación del centro.
                        </Typography>
                        <Grid container spacing={2}>

                                <TextField fullWidth label="ID del Centro" name="center_id" value={formData.center_id} onChange={handleChange} required />

                                <TextField fullWidth label="Nombre de la organización" name="name" value={formData.name} onChange={handleChange} required /> 

                                <TextField fullWidth label="Dirección" name="address" value={formData.address} onChange={handleChange} required />

                                <TextField fullWidth label="Nombre Directiva o Dirigenta" name="nombre_dirigente" value={formData.nombre_dirigente} onChange={handleChange} required />

                                <TextField fullWidth label="Cargo Directiva o Dirigente" name="cargo_dirigente" value={formData.cargo_dirigente} onChange={handleChange} required />

                                <TextField fullWidth label="Teléfono de contacto" name="telefono_contacto" value={formData.telefono_contacto} onChange={handleChange} required />


                                <FormControl fullWidth required>
                                    <InputLabel>Tipo de Centro</InputLabel>
                                    <Select name="type" value={formData.type} label="Tipo de Centro" onChange={handleChange as any}>
                                        <MenuItem value="albergue">Albergue</MenuItem>
                                        <MenuItem value="acopio">Albergue comunitario</MenuItem>
                                    </Select>
                                </FormControl>


                                <TextField fullWidth label="Capacidad" name="capacity" type="number" value={formData.capacity} onChange={handleChange} required />

                                <TextField fullWidth label="Latitud" name="latitude" type="number" value={formData.latitude} onChange={handleChange} required />

                                <TextField fullWidth label="Longitud" name="longitude" type="number" value={formData.longitude} onChange={handleChange} required />

                                <FormControlLabel
                                    control={<Checkbox checked={formData.should_be_active} onChange={handleChange} name="should_be_active" />}
                                    label="Debería estar activo"
                                />

                        </Grid>
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">2. Caracterización del Inmueble</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>

                                <TextField fullWidth label="Tipo de Inmueble" name="tipo_inmueble" value={formData.tipo_inmueble} onChange={handleChange} required />

                                <TextField fullWidth label="Número de habitaciones" name="numero_habitaciones" type="number" value={formData.numero_habitaciones || ''} onChange={handleChange} required />

                                <LikertScaleInput label="Estado de conservación" name="estado_conservacion" value={formData.estado_conservacion} onChange={handleChange} />


                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                     <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                         <Typography variant="h6">3. Accesos y espacios comunes</Typography>
                     </AccordionSummary>
                     <AccordionDetails>
                         <Grid container spacing={2}>

                                 <LikertScaleInput label="Espacio amplio para al menos 10 afectados/as" name="espacio_10_afectados" value={formData.espacio_10_afectados} onChange={handleChange} />

                                 <LikertScaleInput label="Infraestructura para personas con discapacidad/diversidad funcional" name="diversidad_funcional" value={formData.diversidad_funcional} onChange={handleChange} />

                                 <LikertScaleInput label="Áreas comunes accesibles y seguras para todas las personas" name="areas_comunes_accesibles" value={formData.areas_comunes_accesibles} onChange={handleChange} />

                                 <LikertScaleInput label="Espacios potenciales para el uso exclusivo de recreación" name="espacio_recreacion" value={formData.espacio_recreacion} onChange={handleChange} />

                                 <TextField fullWidth label="Observaciones de espacios comunes" name="observaciones_espacios_comunes" value={formData.observaciones_espacios_comunes} onChange={handleChange} multiline rows={2} />
                         </Grid>
                     </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">4. Servicios básicos</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                                <LikertScaleInput label="Acceso a agua potable" name="agua_potable" value={formData.agua_potable} onChange={handleChange} />
                                <LikertScaleInput label="Espacio para estanques de agua" name="agua_estanques" value={formData.agua_estanques} onChange={handleChange} />
                                <LikertScaleInput label="Acceso a energía eléctrica" name="electricidad" value={formData.electricidad} onChange={handleChange} />
                                <LikertScaleInput label="Acceso a calefacción" name="calefaccion" value={formData.calefaccion} onChange={handleChange} />
                                <LikertScaleInput label="Sistema de alcantarillado" name="alcantarillado" value={formData.alcantarillado} onChange={handleChange} />
                                <TextField fullWidth label="Observaciones de servicios básicos" name="observaciones_servicios_basicos" value={formData.observaciones_servicios_basicos} onChange={handleChange} multiline rows={2} />

                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">5. Baños y servicios higiénicos</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                                <LikertScaleInput label="Baños en buen estado y funcionales" name="estado_banos" value={formData.estado_banos} onChange={handleChange} />
                                <LikertScaleInput label="Proporción de WC por persona" name="wc_proporcion_personas" value={formData.wc_proporcion_personas} onChange={handleChange} />

                                <LikertScaleInput label="Baños separados por género" name="banos_genero" value={formData.banos_genero} onChange={handleChange} />

                                <LikertScaleInput label="Baños para grupos prioritarios" name="banos_grupos_prioritarios" value={formData.banos_grupos_prioritarios} onChange={handleChange} />

                                <LikertScaleInput label="Baño con cierre desactivable desde el exterior" name="cierre_banos_emergencia" value={formData.cierre_banos_emergencia} onChange={handleChange} />

                                <LikertScaleInput label="Proporción de lavamanos por persona" name="lavamanos_proporcion_personas" value={formData.lavamanos_proporcion_personas} onChange={handleChange} />

                                <LikertScaleInput label="Dispensadores de jabón" name="dispensadores_jabon" value={formData.dispensadores_jabon} onChange={handleChange} />

                                <LikertScaleInput label="Dispensadores de alcohol gel" name="dispensadores_alcohol_gel" value={formData.dispensadores_alcohol_gel} onChange={handleChange} />

                                <LikertScaleInput label="Papeleros en baños" name="papeleros_banos" value={formData.papeleros_banos} onChange={handleChange} />

                                <LikertScaleInput label="Papeleros en cocina" name="papeleros_cocina" value={formData.papeleros_cocina} onChange={handleChange} />

                                <LikertScaleInput label="Proporción de duchas por persona" name="duchas_proporcion_personas" value={formData.duchas_proporcion_personas} onChange={handleChange} />

                                <LikertScaleInput label="Proporción de lavadoras por persona" name="lavadoras_proporcion_personas" value={formData.lavadoras_proporcion_personas} onChange={handleChange} />

                                <TextField fullWidth label="Observaciones de baños y servicios" name="observaciones_banos_y_servicios_higienicos" value={formData.observaciones_banos_y_servicios_higienicos} onChange={handleChange} multiline rows={2} />

                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">6. Distribución de Habitaciones</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>

                                <LikertScaleInput label="Posee espacios para ser dispuestos como habitaciones" name="posee_habitaciones" value={formData.posee_habitaciones} onChange={handleChange} />

                                <LikertScaleInput label="Separación de espacios por familias, género, etc" name="separacion_familias" value={formData.separacion_familias} onChange={handleChange} />

                                <LikertScaleInput label="Cuenta con sala de lactancia" name="sala_lactancia" value={formData.sala_lactancia} onChange={handleChange} />

                                <TextField fullWidth label="Observaciones de distribución de habitaciones" name="observaciones_distribucion_habitaciones" value={formData.observaciones_distribucion_habitaciones} onChange={handleChange} multiline rows={2} />

                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">7. Herramientas y Mobiliario</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                                <LikertScaleInput label="Cuenta con mesas y sillas" name="cuenta_con_mesas_sillas" value={formData.cuenta_con_mesas_sillas} onChange={handleChange} />

                                <LikertScaleInput label="Áreas de cocina y comedor adecuadas" name="cocina_comedor_adecuados" value={formData.cocina_comedor_adecuados} onChange={handleChange} />

                                <LikertScaleInput label="Equipamiento básico de cocina" name="cuenta_equipamiento_basico_cocina" value={formData.cuenta_equipamiento_basico_cocina} onChange={handleChange} />

                                <LikertScaleInput label="Cuenta con refrigerador" name="cuenta_con_refrigerador" value={formData.cuenta_con_refrigerador} onChange={handleChange} />

                                <LikertScaleInput label="Cuenta con set de extracción de leche" name="cuenta_set_extraccion" value={formData.cuenta_set_extraccion} onChange={handleChange} />

                                <TextField fullWidth label="Observaciones de herramientas y mobiliario" name="observaciones_herramientas_mobiliario" value={formData.observaciones_herramientas_mobiliario} onChange={handleChange} multiline rows={2} />

                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">8. Seguridad y Protección</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>

                                <LikertScaleInput label="Sistema de evacuación definido" name="sistema_evacuacion_definido" value={formData.sistema_evacuacion_definido} onChange={handleChange} />

                                <LikertScaleInput label="Señaléticas adecuadas" name="cuenta_con_senaleticas_adecuadas" value={formData.cuenta_con_senaleticas_adecuadas} onChange={handleChange} />

                                <TextField fullWidth label="Observaciones de seguridad" name="observaciones_condiciones_seguridad_proteccion_generales" value={formData.observaciones_condiciones_seguridad_proteccion_generales} onChange={handleChange} multiline rows={2} />

                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">9. Dimensión Animal</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>

                                <LikertScaleInput label="Existe lugar para animales dentro" name="existe_lugar_animales_dentro" value={formData.existe_lugar_animales_dentro} onChange={handleChange} />

                                <LikertScaleInput label="Existe lugar para animales fuera" name="existe_lugar_animales_fuera" value={formData.existe_lugar_animales_fuera} onChange={handleChange} />
                                <FormGroup>
                                    <FormControlLabel
                                        control={<Checkbox checked={formData.existe_jaula_mascota} onChange={handleChange} name="existe_jaula_mascota" />}
                                        label="Existe jaula/bolso/porta mascota"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={formData.existe_recipientes_mascota} onChange={handleChange} name="existe_recipientes_mascota" />}
                                        label="Existe recipientes para agua y comida"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={formData.existe_correa_bozal} onChange={handleChange} name="existe_correa_bozal" />}
                                        label="Existe correa, arnés o bozal animal"
                                    />
                                </FormGroup>
                                <TextField fullWidth label="Observaciones de la dimensión animal" name="observaciones_dimension_animal" value={formData.observaciones_dimension_animal} onChange={handleChange} multiline rows={2} />
                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">10. EPP y Seguridad Comunitaria</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                                <FormGroup>
                                    <FormControlLabel control={<Checkbox checked={formData.existen_cascos} onChange={handleChange} name="existen_cascos" />} label="Existen cascos" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_gorros_cabello} onChange={handleChange} name="existen_gorros_cabello" />} label="Existen gorros para el cabello" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_gafas} onChange={handleChange} name="existen_gafas" />} label="Existen gafas de seguridad" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_caretas} onChange={handleChange} name="existen_caretas" />} label="Existen caretas faciales" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_mascarillas} onChange={handleChange} name="existen_mascarillas" />} label="Existen mascarillas" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_respiradores} onChange={handleChange} name="existen_respiradores" />} label="Existen respiradores" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_mascaras_gas} onChange={handleChange} name="existen_mascaras_gas" />} label="Existen máscaras de gas" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_guantes_latex} onChange={handleChange} name="existen_guantes_latex" />} label="Existen guantes de látex" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_mangas_protectoras} onChange={handleChange} name="existen_mangas_protectoras" />} label="Existen mangas protectoras" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_calzados_seguridad} onChange={handleChange} name="existen_calzados_seguridad" />} label="Existen calzados de seguridad" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_botas_impermeables} onChange={handleChange} name="existen_botas_impermeables" />} label="Existen botas impermeables" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_chalecos_reflectantes} onChange={handleChange} name="existen_chalecos_reflectantes" />} label="Existen chalecos reflectantes" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_overoles_trajes} onChange={handleChange} name="existen_overoles_trajes" />} label="Existen overoles o trajes" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_camillas_catre} onChange={handleChange} name="existen_camillas_catre" />} label="Existen camillas/catres" />
                                </FormGroup>
                                <FormGroup>
                                    <FormControlLabel control={<Checkbox checked={formData.existen_alarmas_incendios} onChange={handleChange} name="existen_alarmas_incendios" />} label="Existen alarmas de incendio" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_hidrantes_mangueras} onChange={handleChange} name="existen_hidrantes_mangueras" />} label="Existen hidrantes/mangueras" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_senaleticas} onChange={handleChange} name="existen_senaleticas" />} label="Existen señaléticas" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_luces_emergencias} onChange={handleChange} name="existen_luces_emergencias" />} label="Existen luces de emergencia" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_extintores} onChange={handleChange} name="existen_extintores" />} label="Existen extintores" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_generadores} onChange={handleChange} name="existen_generadores" />} label="Existen generadores" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_baterias_externas} onChange={handleChange} name="existen_baterias_externas" />} label="Existen baterías externas" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_altavoces} onChange={handleChange} name="existen_altavoces" />} label="Existen altavoces" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_botones_alarmas} onChange={handleChange} name="existen_botones_alarmas" />} label="Existen botones de alarma" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_sistemas_monitoreo} onChange={handleChange} name="existen_sistemas_monitoreo" />} label="Existen sistemas de monitoreo" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_radio_recargable} onChange={handleChange} name="existen_radio_recargable" />} label="Existen radio recargable" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_barandillas_escaleras} onChange={handleChange} name="existen_barandillas_escaleras" />} label="Existen barandillas/pasamanos" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_puertas_emergencia_rapida} onChange={handleChange} name="existen_puertas_emergencia_rapida" />} label="Existen puertas de emergencia" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_rampas} onChange={handleChange} name="existen_rampas" />} label="Existen rampas de acceso" />
                                    <FormControlLabel control={<Checkbox checked={formData.existen_ascensores_emergencia} onChange={handleChange} name="existen_ascensores_emergencia" />} label="Existen ascensores de emergencia" />
                                </FormGroup>
                                <TextField fullWidth label="Observaciones de seguridad comunitaria" name="observaciones_seguridad_comunitaria" value={formData.observaciones_seguridad_comunitaria} onChange={handleChange} multiline rows={2} />
                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">11. Necesidades Adicionales</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                                <FormControlLabel
                                    control={<Checkbox checked={formData.importa_elementos_seguridad} onChange={handleChange} name="importa_elementos_seguridad" />}
                                    label="Considera importante adquirir elementos de seguridad"
                                />
                                <TextField fullWidth label="Observaciones de elementos de seguridad" name="observaciones_importa_elementos_seguridad" value={formData.observaciones_importa_elementos_seguridad} onChange={handleChange} multiline rows={2} />

                                <FormControlLabel
                                    control={<Checkbox checked={formData.importa_conocimientos_capacitaciones} onChange={handleChange} name="importa_conocimientos_capacitaciones" />}
                                    label="Considera importante adquirir conocimientos y capacitaciones"
                                />
                                <TextField fullWidth label="Observaciones de conocimientos y capacitaciones" name="observaciones_importa_conocimientos_capacitaciones" value={formData.observaciones_importa_conocimientos_capacitaciones} onChange={handleChange} multiline rows={2} />
                        </Grid>
                    </AccordionDetails>
                </Accordion>


                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button type="submit" variant="contained" color="primary" sx={{ mr: 2 }} disabled={isLoading}>
                        {isLoading ? 'Creando...' : 'Crear Centro'}
                    </Button>
                    <Button component={NavLink} to="/admin/centers" variant="outlined" color="secondary" disabled={isLoading}>
                        Volver
                    </Button>
                </Box>
            </form>

            {isConfirmationOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>Confirmar Registro</h2>
                        <p>¿Estás seguro de que deseas enviar este formulario y registrar el nuevo centro?</p>
                        <div className="modal-actions">
                            <Button onClick={handleConfirmSubmit} variant="contained" color="primary" disabled={isLoading}>Sí, registrar</Button>
                            <Button onClick={handleCancelSubmit} variant="outlined" color="secondary" disabled={isLoading}>Cancelar</Button>
                        </div>
                    </div>
                </div>
            )}
        </Box>
    );
};

export default CreateCenterPage;