import React from 'react';
import { Typography, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CenterData } from '@/types/center';

// Definimos un tipo para las claves numéricas del mapa Likert
type LikertKey = 1 | 2 | 3 | 4 | 5;

const likertMap: Record<LikertKey, string> = {
    1: 'No existe',
    2: 'Existe, pero precario',
    3: 'Estado regular',
    4: 'Estado bueno',
    5: 'Excelente',
};

// Definimos un tipo para las claves de los booleanos
type BooleanLabelKey = keyof typeof booleanLabels;

const booleanLabels = {
    muro_hormigon: 'Hormigón armado',
    muro_albaneria: 'Albañilería',
    muro_tabique: 'Tabique forrado',
    muro_adobe: 'Adobe, barro, quincha',
    muro_mat_precario: 'Materiales precarios',
    piso_parquet: 'Parquet, madera, flotante',
    piso_ceramico: 'Cerámico, flexit o similar',
    piso_alfombra: 'Alfombra o cubrepiso',
    piso_baldosa: 'Baldosa de cemento',
    piso_radier: 'Radier',
    piso_enchapado: 'Enchapado de cemento',
    piso_tierra: 'Tierra',
    techo_tejas: 'Tejas o tejuelas',
    techo_losa: 'Losa hormigón',
    techo_planchas: 'Planchas metálicas',
    techo_fonolita: 'Fonolita o plancha de fieltro',
    techo_mat_precario: 'Materiales precarios',
    techo_sin_cubierta: 'Sin cubierta',
    existen_cascos: 'Cascos de seguridad',
    existen_gorros_cabello: 'Gorros o redes para el cabello',
    existen_gafas: 'Gafas de seguridad',
    existen_caretas: 'Careta facial',
    existen_mascarillas: 'Mascarillas desechables',
    existen_respiradores: 'Respiradores',
    existen_mascaras_gas: 'Máscaras de gas',
    existen_guantes_latex: 'Guantes (látex, nitrilo, cuero, etc.)',
    existen_mangas_protectoras: 'Mangas protectoras',
    existen_calzados_seguridad: 'Calzado de seguridad',
    existen_botas_impermeables: 'Botas impermeables',
    existen_chalecos_reflectantes: 'Chalecos reflectantes',
    existen_overoles_trajes: 'Overoles o trajes de protección',
    existen_camillas_catre: 'Camilla o catre clínico',
    existen_alarmas_incendios: 'Sistemas de alarmas contra incendios',
    existen_hidrantes_mangueras: 'Hidrantes o mangueras',
    existen_senaleticas: 'Señaléticas de rutas de evacuación',
    existen_luces_emergencias: 'Luces de emergencia',
    existen_extintores: 'Extintores',
    existen_generadores: 'Generadores eléctricos',
    existen_baterias_externas: 'Baterías externas recargables',
    existen_altavoces: 'Altavoces o sistemas de megafonía',
    existen_botones_alarmas: 'Botones de pánico o alarmas manuales',
    existen_sistemas_monitoreo: 'Sistemas de monitoreo (cámaras)',
    existen_radio_recargable: 'Radio recargable',
    existen_barandillas_escaleras: 'Barandillas/pasamanos en escaleras y rampas',
    existen_puertas_emergencia_rapida: 'Puertas de emergencia con salida rápida',
    existen_rampas: 'Rampas de acceso',
    existen_ascensores_emergencia: 'Ascensores de emergencia',
    existen_botiquines: 'Botiquines de primeros auxilios',
    existen_camilla_emergencia: 'Camilla de emergencia',
    existen_sillas_ruedas: 'Sillas de ruedas',
    existen_muletas: 'Muletas de apoyo',
    existen_desfibriladores: 'Desfibriladores externos (DEA)',
    existen_senales_advertencia: 'Señales de advertencia',
    existen_senales_informativas: 'Señales informativas',
    existen_senales_exclusivas: 'Señales exclusivas para personas con discapacidad',
    existe_jaula_mascota: 'Existe jaula/bolso/porta mascota',
    existe_recipientes_mascota: 'Existe recipientes para agua y comida',
    existe_correa_bozal: 'Existe correa, arnés o bozal animal',
    reconoce_personas_dentro_de_su_comunidad: 'Reconoce personas dentro de su comunidad',
    no_reconoce_personas_dentro_de_su_comunidad: 'No reconoce personas dentro de su comunidad',
    importa_elementos_seguridad: 'Considera importante adquirir elementos de seguridad',
    importa_conocimientos_capacitaciones: 'Considera importante adquirir conocimientos y capacitaciones'
};

const isTrue = (value: any) => value === true || value === 1;

interface CenterCatastroDetailsProps {
    centerData: Partial<CenterData> | null;
}

const CenterCatastroDetails: React.FC<CenterCatastroDetailsProps> = ({ centerData }) => {
    if (!centerData) return null;

    const getLikertValue = (key: keyof CenterData) => {
        const value = centerData[key];
        // Validamos si el valor es un número y si es una clave válida para likertMap
        if (typeof value === 'number' && (value as LikertKey) in likertMap) {
            return likertMap[value as LikertKey];
        }
        return 'N/A';
    };

    const getBooleanValues = (keys: BooleanLabelKey[]) => {
        // Aseguramos que las claves a iterar sean del tipo correcto
        return keys.filter(key => isTrue(centerData[key])).map(key => booleanLabels[key]);
    };

    // Categorización de campos con las claves tipadas
    const muros = getBooleanValues(['muro_hormigon', 'muro_albaneria', 'muro_tabique', 'muro_adobe', 'muro_mat_precario']);
    const pisos = getBooleanValues(['piso_parquet', 'piso_ceramico', 'piso_alfombra', 'piso_baldosa', 'piso_radier', 'piso_enchapado', 'piso_tierra']);
    const techos = getBooleanValues(['techo_tejas', 'techo_losa', 'techo_planchas', 'techo_fonolita', 'techo_mat_precario', 'techo_sin_cubierta']);
    const epp = getBooleanValues(['existen_cascos', 'existen_gorros_cabello', 'existen_gafas', 'existen_caretas', 'existen_mascarillas', 'existen_respiradores', 'existen_mascaras_gas', 'existen_guantes_latex', 'existen_mangas_protectoras', 'existen_calzados_seguridad', 'existen_botas_impermeables', 'existen_chalecos_reflectantes', 'existen_overoles_trajes', 'existen_camillas_catre']);
    const seguridadComunitaria = getBooleanValues(['existen_alarmas_incendios', 'existen_hidrantes_mangueras', 'existen_senaleticas', 'existen_luces_emergencias', 'existen_extintores', 'existen_generadores', 'existen_baterias_externas', 'existen_altavoces', 'existen_botones_alarmas', 'existen_sistemas_monitoreo', 'existen_radio_recargable', 'existen_barandillas_escaleras', 'existen_puertas_emergencia_rapida', 'existen_rampas', 'existen_ascensores_emergencia', 'existen_botiquines', 'existen_camilla_emergencia', 'existen_sillas_ruedas', 'existen_muletas', 'existen_desfibriladores', 'existen_senales_advertencia', 'existen_senales_informativas', 'existen_senales_exclusivas']);
    const dimensionAnimal = getBooleanValues(['existe_jaula_mascota', 'existe_recipientes_mascota', 'existe_correa_bozal', 'reconoce_personas_dentro_de_su_comunidad', 'no_reconoce_personas_dentro_de_su_comunidad']);
    const necesidadesAdicionales = getBooleanValues(['importa_elementos_seguridad', 'importa_conocimientos_capacitaciones']);

    const renderChips = (items: string[]) => items.length > 0 ? items.map(item => <Chip key={item} label={item} size="small" variant="filled" />) : <Chip label="N/A" size="small" variant="outlined" />;

    return (
        <div className="catastro-details-section">
            <h3>Detalles del Catastro</h3>
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Información de contacto y del inmueble</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <div className="info-grid-catastro">
                        <div className="info-item"><label>Organización:</label><span>{centerData.name || 'N/A'}</span></div>
                        <div className="info-item"><label>Dirigente:</label><span>{centerData.nombre_dirigente || 'N/A'}</span></div>
                        <div className="info-item"><label>Cargo Dirigente:</label><span>{centerData.cargo_dirigente || 'N/A'}</span></div>
                        <div className="info-item"><label>Teléfono:</label><span>{centerData.telefono_contacto || 'N/A'}</span></div>
                        <div className="info-item"><label>Tipo Inmueble:</label><span>{centerData.tipo_inmueble || 'N/A'}</span></div>
                        <div className="info-item"><label>Nº Habitaciones:</label><span>{centerData.numero_habitaciones || 'N/A'}</span></div>
                        <div className="info-item"><label>Estado Conservación:</label><span>{getLikertValue('estado_conservacion')}</span></div>
                    </div>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Materialidad</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <div className="info-grid-catastro">
                        <div className="info-item"><label>Muros:</label><div className="chips-container">{renderChips(muros)}</div></div>
                        <div className="info-item"><label>Pisos:</label><div className="chips-container">{renderChips(pisos)}</div></div>
                        <div className="info-item"><label>Techo:</label><div className="chips-container">{renderChips(techos)}</div></div>
                    </div>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Evaluación del Centro</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <div className="info-grid-catastro">
                        <div className="info-item"><label>Espacio amplio (10+):</label><span>{getLikertValue('espacio_10_afectados')}</span></div>
                        <div className="info-item"><label>Discapacidad:</label><span>{getLikertValue('diversidad_funcional')}</span></div>
                        <div className="info-item"><label>Áreas comunes accesibles:</label><span>{getLikertValue('areas_comunes_accesibles')}</span></div>
                        <div className="info-item"><label>Espacio recreación:</label><span>{getLikertValue('espacio_recreacion')}</span></div>
                        <div className="info-item"><label>Agua potable:</label><span>{getLikertValue('agua_potable')}</span></div>
                        <div className="info-item"><label>Agua estanques:</label><span>{getLikertValue('agua_estanques')}</span></div>
                        <div className="info-item"><label>Electricidad:</label><span>{getLikertValue('electricidad')}</span></div>
                        <div className="info-item"><label>Calefacción:</label><span>{getLikertValue('calefaccion')}</span></div>
                        <div className="info-item"><label>Alcantarillado:</label><span>{getLikertValue('alcantarillado')}</span></div>
                        <div className="info-item"><label>Baños estado:</label><span>{getLikertValue('estado_banos')}</span></div>
                        <div className="info-item"><label>WC por persona:</label><span>{getLikertValue('wc_proporcion_personas')}</span></div>
                        <div className="info-item"><label>Baños género:</label><span>{getLikertValue('banos_genero')}</span></div>
                        <div className="info-item"><label>Baños grupos prioritarios:</label><span>{getLikertValue('banos_grupos_prioritarios')}</span></div>
                        <div className="info-item"><label>Cierre baños emergencia:</label><span>{getLikertValue('cierre_banos_emergencia')}</span></div>
                        <div className="info-item"><label>Lavamanos por persona:</label><span>{getLikertValue('lavamanos_proporcion_personas')}</span></div>
                        <div className="info-item"><label>Duchas por persona:</label><span>{getLikertValue('duchas_proporcion_personas')}</span></div>
                        <div className="info-item"><label>Lavadoras por persona:</label><span>{getLikertValue('lavadoras_proporcion_personas')}</span></div>
                        <div className="info-item"><label>Habitaciones:</label><span>{getLikertValue('posee_habitaciones')}</span></div>
                        <div className="info-item"><label>Separación familias:</label><span>{getLikertValue('separacion_familias')}</span></div>
                        <div className="info-item"><label>Sala de lactancia:</label><span>{getLikertValue('sala_lactancia')}</span></div>
                        <div className="info-item"><label>Mesas y sillas:</label><span>{getLikertValue('cuenta_con_mesas_sillas')}</span></div>
                        <div className="info-item"><label>Cocina/comedor:</label><span>{getLikertValue('cocina_comedor_adecuados')}</span></div>
                        <div className="info-item"><label>Equipamiento cocina:</label><span>{getLikertValue('cuenta_equipamiento_basico_cocina')}</span></div>
                        <div className="info-item"><label>Refrigerador:</label><span>{getLikertValue('cuenta_con_refrigerador')}</span></div>
                        <div className="info-item"><label>Set de extracción de leche:</label><span>{getLikertValue('cuenta_set_extraccion')}</span></div>
                        <div className="info-item"><label>Sistema de evacuación:</label><span>{getLikertValue('sistema_evacuacion_definido')}</span></div>
                        <div className="info-item"><label>Señaléticas:</label><span>{getLikertValue('cuenta_con_senaleticas_adecuadas')}</span></div>
                        <div className="info-item"><label>Lugar para animales dentro:</label><span>{getLikertValue('existe_lugar_animales_dentro')}</span></div>
                        <div className="info-item"><label>Lugar para animales fuera:</label><span>{getLikertValue('existe_lugar_animales_fuera')}</span></div>
                    </div>
                    {(centerData.observaciones_espacios_comunes || centerData.observaciones_servicios_basicos || centerData.observaciones_banos_y_servicios_higienicos || centerData.observaciones_distribucion_habitaciones || centerData.observaciones_herramientas_mobiliario || centerData.observaciones_condiciones_seguridad_proteccion_generales || centerData.observaciones_dimension_animal) && (
                        <div className="observation-box">
                            {centerData.observaciones_espacios_comunes && <p><strong>Espacios Comunes:</strong> {centerData.observaciones_espacios_comunes}</p>}
                            {centerData.observaciones_servicios_basicos && <p><strong>Servicios Básicos:</strong> {centerData.observaciones_servicios_basicos}</p>}
                            {centerData.observaciones_banos_y_servicios_higienicos && <p><strong>Baños y Servicios Higiénicos:</strong> {centerData.observaciones_banos_y_servicios_higienicos}</p>}
                            {centerData.observaciones_distribucion_habitaciones && <p><strong>Distribución de Habitaciones:</strong> {centerData.observaciones_distribucion_habitaciones}</p>}
                            {centerData.observaciones_herramientas_mobiliario && <p><strong>Herramientas y Mobiliario:</strong> {centerData.observaciones_herramientas_mobiliario}</p>}
                            {centerData.observaciones_condiciones_seguridad_proteccion_generales && <p><strong>Seguridad y Protección:</strong> {centerData.observaciones_condiciones_seguridad_proteccion_generales}</p>}
                            {centerData.observaciones_dimension_animal && <p><strong>Dimensión Animal:</strong> {centerData.observaciones_dimension_animal}</p>}
                        </div>
                    )}
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Elementos de Seguridad y Protección</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <div className="info-grid-catastro">
                        <div className="info-item"><label>EPP:</label><div className="chips-container">{renderChips(epp)}</div></div>
                        <div className="info-item"><label>Seguridad Comunitaria:</label><div className="chips-container">{renderChips(seguridadComunitaria)}</div></div>
                        <div className="info-item"><label>Dimensión Animal:</label><div className="chips-container">{renderChips(dimensionAnimal)}</div></div>
                        <div className="info-item"><label>Necesidades Adicionales:</label><div className="chips-container">{renderChips(necesidadesAdicionales)}</div></div>
                    </div>
                    {(centerData.observaciones_seguridad_comunitaria || centerData.observaciones_importa_elementos_seguridad || centerData.observaciones_importa_conocimientos_capacitaciones) && (
                        <div className="observation-box">
                            {centerData.observaciones_seguridad_comunitaria && <p><strong>Seguridad Comunitaria:</strong> {centerData.observaciones_seguridad_comunitaria}</p>}
                            {centerData.observaciones_importa_elementos_seguridad && <p><strong>Elementos de Seguridad:</strong> {centerData.observaciones_importa_elementos_seguridad}</p>}
                            {centerData.observaciones_importa_conocimientos_capacitaciones && <p><strong>Conocimientos y Capacitaciones:</strong> {centerData.observaciones_importa_conocimientos_capacitaciones}</p>}
                        </div>
                    )}
                </AccordionDetails>
            </Accordion>
        </div>
    );
};

export default CenterCatastroDetails;