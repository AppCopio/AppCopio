// src/types/center.ts

export interface CenterData {
    center_id: string;
    name: string;
    address: string;
    type: 'Albergue' | 'Acopio' | 'albergue' | 'acopio' | '';
    capacity: number;
    latitude: number;
    longitude: number;
    should_be_active: boolean;
    comunity_charge_id: number | null;
    municipal_manager_id: number | null;

    // Campos de CentersDescription
    tipo_inmueble: string;
    numero_habitaciones: number | null;
    estado_conservacion: number | null;
    material_muros: number | null;
    material_pisos: number | null;
    material_techo: number | null;
    observaciones_acceso_y_espacios_comunes: string;
    espacio_10_afectados: number | null;
    diversidad_funcional: number | null;
    areas_comunes_accesibles: number | null;
    espacio_recreacion: number | null;
    observaciones_espacios_comunes: string;
    agua_potable: number | null;
    agua_estanques: number | null;
    electricidad: number | null;
    calefaccion: number | null;
    alcantarillado: number | null;
    observaciones_servicios_basicos: string;
    estado_banos: number | null;
    wc_proporcion_personas: number | null;
    banos_genero: number | null;
    banos_grupos_prioritarios: number | null;
    cierre_banos_emergencia: number | null;
    lavamanos_proporcion_personas: number | null;
    dispensadores_jabon: number | null;
    dispensadores_alcohol_gel: number | null;
    papeleros_banos: number | null;
    papeleros_cocina: number | null;
    duchas_proporcion_personas: number | null;
    lavadoras_proporcion_personas: number | null;
    observaciones_banos_y_servicios_higienicos: string;
    posee_habitaciones: number | null;
    separacion_familias: number | null;
    sala_lactancia: number | null;
    observaciones_distribucion_habitaciones: string;
    cuenta_con_mesas_sillas: number | null;
    cocina_comedor_adecuados: number | null;
    cuenta_equipamiento_basico_cocina: number | null;
    cuenta_con_refrigerador: number | null;
    cuenta_set_extraccion: number | null;
    observaciones_herramientas_mobiliario: string;
    sistema_evacuacion_definido: number | null;
    cuenta_con_senaleticas_adecuadas: number | null;
    observaciones_condiciones_seguridad_proteccion_generales: string;
    existe_lugar_animales_dentro: number | null;
    existe_lugar_animales_fuera: number | null;
    existe_jaula_mascota: boolean;
    existe_recipientes_mascota: boolean;
    existe_correa_bozal: boolean;
    reconoce_personas_dentro_de_su_comunidad: boolean;
    no_reconoce_personas_dentro_de_su_comunidad: boolean;
    observaciones_dimension_animal: string;
    existen_cascos: boolean;
    existen_gorros_cabello: boolean;
    existen_gafas: boolean;
    existen_caretas: boolean;
    existen_mascarillas: boolean;
    existen_respiradores: boolean;
    existen_mascaras_gas: boolean;
    existen_guantes_latex: boolean;
    existen_mangas_protectoras: boolean;
    existen_calzados_seguridad: boolean;
    existen_botas_impermeables: boolean;
    existen_chalecos_reflectantes: boolean;
    existen_overoles_trajes: boolean;
    existen_camillas_catre: boolean;
    existen_alarmas_incendios: boolean;
    existen_hidrantes_mangueras: boolean;
    existen_senaleticas: boolean;
    existen_luces_emergencias: boolean;
    existen_extintores: boolean;
    existen_generadores: boolean;
    existen_baterias_externas: boolean;
    existen_altavoces: boolean;
    existen_botones_alarmas: boolean;
    existen_sistemas_monitoreo: boolean;
    existen_radio_recargable: boolean;
    existen_barandillas_escaleras: boolean;
    existen_puertas_emergencia_rapida: boolean;
    existen_rampas: boolean;
    existen_ascensores_emergencia: boolean;
    observaciones_seguridad_comunitaria: string;
    importa_elementos_seguridad: boolean;
    observaciones_importa_elementos_seguridad: string;
    importa_conocimientos_capacitaciones: boolean;
    observaciones_importa_conocimientos_capacitaciones: string;
}

export const initialCenterData: CenterData = {
    center_id: '',
    name: '',
    address: '',
    type: 'albergue',
    capacity: 0,
    latitude: 0,
    longitude: 0,
    should_be_active: false,
    comunity_charge_id: null,
    municipal_manager_id: null,
    
    tipo_inmueble: '',
    numero_habitaciones: null,
    estado_conservacion: null,
    material_muros: null,
    material_pisos: null,
    material_techo: null,
    observaciones_acceso_y_espacios_comunes: '',
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
    observaciones_seguridad_comunitaria: '',
    importa_elementos_seguridad: false,
    observaciones_importa_elementos_seguridad: '',
    importa_conocimientos_capacitaciones: false,
    observaciones_importa_conocimientos_capacitaciones: ''
};