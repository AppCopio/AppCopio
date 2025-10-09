//llamada para obtener la activacion de un centro ahora ta consistente con backend GET /centers/:id/activation
// añadido una nueva función, listActiveCenters, lista centros activos con: GET /centers/status/active 
// le puse trycatchs tambien :)
// IMPORTANTE: meti getCenterCapacity y getCenterInventory, usenlos tan utiles segun yo.


// src/services/centers.service.ts (o centerApi.ts)
import { api } from "@/lib/api";
import type { Center, ActiveActivation, CenterData} from "@/types/center"; 
import type { InventoryItem } from "@/types/inventory"; 
import type { User } from "@/types/user"; 
// =================================================================
// 1. HELPERS: Normalización y Mapeo de Datos
// (Estos helpers son útiles para asegurar que la UI siempre reciba datos consistentes)
// =================================================================

/* --- Normalización a valores de UI (según brief) --- */
type CenterTypeUI = Center["type"]; // "Acopio" | "Albergue"

function toUIType(raw: any): CenterTypeUI {
  const v = String(raw ?? "").toLowerCase();
  if (v === "acopio") return "Acopio";
  if (v === "albergue") return "Albergue";
  // fallback conservador
  return "Acopio";
}

function toUIOperationalStatus(raw: any): Center["operational_status"] {
  if (raw == null) return undefined;
  const v = String(raw).toLowerCase();
  if (v.includes("cerrado")) return "cerrado temporalmente";
  if (v.includes("capacidad")) return "capacidad maxima";
  return "abierto";
}

function normalizeCenter(raw: any): Center {
  return {
    center_id: String(raw.center_id ?? ""),
    name: String(raw.name ?? ""),
    address: raw.address ?? null,
    type: toUIType(raw.type),
    is_active: Boolean(raw.is_active),
    operational_status: toUIOperationalStatus(raw.operational_status),
    public_note: raw.public_note ?? null,
    capacity: raw.capacity ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    fullnessPercentage: typeof raw.fullnessPercentage === "number" ? raw.fullnessPercentage : 0,
  };
};

function normalizeCenterData(raw: any): CenterData {
  return {
    center_id: String(raw.center_id ?? ""),
    name: String(raw.name ?? ""),
    address: raw.address ?? null,
    type: toUIType(raw.type),
    is_active: Boolean(raw.is_active),
    operational_status: toUIOperationalStatus(raw.operational_status),
    public_note: raw.public_note ?? null,
    capacity: raw.capacity ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    fullnessPercentage: typeof raw.fullnessPercentage === "number" ? raw.fullnessPercentage : 0,
    folio: raw.folio ?? "",
    should_be_active: raw.should_be_active ?? false,
    comunity_charge_id: raw.comunity_charge_id ?? null,
    municipal_manager_id: raw.municipal_manager_id ?? null,

    // TODO: Revisar que esté bien puesto todo esto
    // CentersDescription — strings
    nombre_dirigente: raw.nombre_dirigente ?? "",
    cargo_dirigente: raw.cargo_dirigente ?? "",
    telefono_contacto: raw.telefono_contacto ?? "",
    tipo_inmueble: raw.tipo_inmueble ?? "",
    observaciones_espacios_comunes: raw.observaciones_espacios_comunes ?? "",
    observaciones_servicios_basicos: raw.observaciones_servicios_basicos ?? "",
    observaciones_banos_y_servicios_higienicos: raw.observaciones_banos_y_servicios_higienicos ?? "",
    observaciones_distribucion_habitaciones: raw.observaciones_distribucion_habitaciones ?? "",
    observaciones_herramientas_mobiliario: raw.observaciones_herramientas_mobiliario ?? "",
    observaciones_condiciones_seguridad_proteccion_generales: raw.observaciones_condiciones_seguridad_proteccion_generales ?? "",
    observaciones_dimension_animal: raw.observaciones_dimension_animal ?? "",
    observaciones_seguridad_comunitaria: raw.observaciones_seguridad_comunitaria ?? "",
    observaciones_importa_elementos_seguridad: raw.observaciones_importa_elementos_seguridad ?? "",
    observaciones_importa_conocimientos_capacitaciones: raw.observaciones_importa_conocimientos_capacitaciones ?? "",

    // CentersDescription — number | null
    numero_habitaciones: raw.numero_habitaciones ?? null,
    estado_conservacion: raw.estado_conservacion ?? null,
    espacio_10_afectados: raw.espacio_10_afectados ?? null,
    diversidad_funcional: raw.diversidad_funcional ?? null,
    areas_comunes_accesibles: raw.areas_comunes_accesibles ?? null,
    espacio_recreacion: raw.espacio_recreacion ?? null,
    agua_potable: raw.agua_potable ?? null,
    agua_estanques: raw.agua_estanques ?? null,
    electricidad: raw.electricidad ?? null,
    calefaccion: raw.calefaccion ?? null,
    alcantarillado: raw.alcantarillado ?? null,
    estado_banos: raw.estado_banos ?? null,
    wc_proporcion_personas: raw.wc_proporcion_personas ?? null,
    banos_genero: raw.banos_genero ?? null,
    banos_grupos_prioritarios: raw.banos_grupos_prioritarios ?? null,
    cierre_banos_emergencia: raw.cierre_banos_emergencia ?? null,
    lavamanos_proporcion_personas: raw.lavamanos_proporcion_personas ?? null,
    dispensadores_jabon: raw.dispensadores_jabon ?? null,
    dispensadores_alcohol_gel: raw.dispensadores_alcohol_gel ?? null,
    papeleros_banos: raw.papeleros_banos ?? null,
    papeleros_cocina: raw.papeleros_cocina ?? null,
    duchas_proporcion_personas: raw.duchas_proporcion_personas ?? null,
    lavadoras_proporcion_personas: raw.lavadoras_proporcion_personas ?? null,
    posee_habitaciones: raw.posee_habitaciones ?? null,
    separacion_familias: raw.separacion_familias ?? null,
    sala_lactancia: raw.sala_lactancia ?? null,
    cuenta_con_mesas_sillas: raw.cuenta_con_mesas_sillas ?? null,
    cocina_comedor_adecuados: raw.cocina_comedor_adecuados ?? null,
    cuenta_equipamiento_basico_cocina: raw.cuenta_equipamiento_basico_cocina ?? null,
    cuenta_con_refrigerador: raw.cuenta_con_refrigerador ?? null,
    cuenta_set_extraccion: raw.cuenta_set_extraccion ?? null,
    sistema_evacuacion_definido: raw.sistema_evacuacion_definido ?? null,
    cuenta_con_senaleticas_adecuadas: raw.cuenta_con_senaleticas_adecuadas ?? null,
    existe_lugar_animales_dentro: raw.existe_lugar_animales_dentro ?? null,
    existe_lugar_animales_fuera: raw.existe_lugar_animales_fuera ?? null,

    // CentersDescription — booleans
    muro_hormigon: raw.muro_hormigon ?? false,
    muro_albaneria: raw.muro_albaneria ?? false,
    muro_tabique: raw.muro_tabique ?? false,
    muro_adobe: raw.muro_adobe ?? false,
    muro_mat_precario: raw.muro_mat_precario ?? false,
    piso_parquet: raw.piso_parquet ?? false,
    piso_ceramico: raw.piso_ceramico ?? false,
    piso_alfombra: raw.piso_alfombra ?? false,
    piso_baldosa: raw.piso_baldosa ?? false,
    piso_radier: raw.piso_radier ?? false,
    piso_enchapado: raw.piso_enchapado ?? false,
    piso_tierra: raw.piso_tierra ?? false,
    techo_tejas: raw.techo_tejas ?? false,
    techo_losa: raw.techo_losa ?? false,
    techo_planchas: raw.techo_planchas ?? false,
    techo_fonolita: raw.techo_fonolita ?? false,
    techo_mat_precario: raw.techo_mat_precario ?? false,
    techo_sin_cubierta: raw.techo_sin_cubierta ?? false,

    existen_cascos: raw.existen_cascos ?? false,
    existen_gorros_cabello: raw.existen_gorros_cabello ?? false,
    existen_gafas: raw.existen_gafas ?? false,
    existen_caretas: raw.existen_caretas ?? false,
    existen_mascarillas: raw.existen_mascarillas ?? false,
    existen_respiradores: raw.existen_respiradores ?? false,
    existen_mascaras_gas: raw.existen_mascaras_gas ?? false,
    existen_guantes_latex: raw.existen_guantes_latex ?? false,
    existen_mangas_protectoras: raw.existen_mangas_protectoras ?? false,
    existen_calzados_seguridad: raw.existen_calzados_seguridad ?? false,
    existen_botas_impermeables: raw.existen_botas_impermeables ?? false,
    existen_chalecos_reflectantes: raw.existen_chalecos_reflectantes ?? false,
    existen_overoles_trajes: raw.existen_overoles_trajes ?? false,
    existen_camillas_catre: raw.existen_camillas_catre ?? false,
    existen_alarmas_incendios: raw.existen_alarmas_incendios ?? false,
    existen_hidrantes_mangueras: raw.existen_hidrantes_mangueras ?? false,
    existen_senaleticas: raw.existen_senaleticas ?? false,
    existen_luces_emergencias: raw.existen_luces_emergencias ?? false,
    existen_extintores: raw.existen_extintores ?? false,
    existen_generadores: raw.existen_generadores ?? false,
    existen_baterias_externas: raw.existen_baterias_externas ?? false,
    existen_altavoces: raw.existen_altavoces ?? false,
    existen_botones_alarmas: raw.existen_botones_alarmas ?? false,
    existen_sistemas_monitoreo: raw.existen_sistemas_monitoreo ?? false,
    existen_radio_recargable: raw.existen_radio_recargable ?? false,
    existen_barandillas_escaleras: raw.existen_barandillas_escaleras ?? false,
    existen_puertas_emergencia_rapida: raw.existen_puertas_emergencia_rapida ?? false,
    existen_rampas: raw.existen_rampas ?? false,
    existen_ascensores_emergencia: raw.existen_ascensores_emergencia ?? false,
    existen_botiquines: raw.existen_botiquines ?? false,
    existen_camilla_emergencia: raw.existen_camilla_emergencia ?? false,
    existen_sillas_ruedas: raw.existen_sillas_ruedas ?? false,
    existen_muletas: raw.existen_muletas ?? false,
    existen_desfibriladores: raw.existen_desfibriladores ?? false,
    existen_senales_advertencia: raw.existen_senales_advertencia ?? false,
    existen_senales_informativas: raw.existen_senales_informativas ?? false,
    existen_senales_exclusivas: raw.existen_senales_exclusivas ?? false,

    existe_jaula_mascota: raw.existe_jaula_mascota ?? false,
    existe_recipientes_mascota: raw.existe_recipientes_mascota ?? false,
    existe_correa_bozal: raw.existe_correa_bozal ?? false,
    reconoce_personas_dentro_de_su_comunidad: raw.reconoce_personas_dentro_de_su_comunidad ?? false,
    no_reconoce_personas_dentro_de_su_comunidad: raw.no_reconoce_personas_dentro_de_su_comunidad ?? false,

    importa_elementos_seguridad: raw.importa_elementos_seguridad ?? false,
    importa_conocimientos_capacitaciones: raw.importa_conocimientos_capacitaciones ?? false,
  };
};

export type OperationalStatusUI = "Abierto" | "Cerrado Temporalmente" | "Capacidad Máxima";

// Función para mapear estados del backend al frontend  
export function mapStatusToBackend(status: OperationalStatusUI): string | undefined {
  switch (status) {
    case "Abierto": return "abierto";
    case "Cerrado Temporalmente": return "cerrado temporalmente";
    case "Capacidad Máxima": return "capacidad maxima";
    default: return undefined;
  }
}

// Función para mapear estados del backend al frontend  
export function mapStatusToFrontend(status?: string): OperationalStatusUI | undefined {
  if (!status) return;

  switch (status) {
    case 'abierto': return 'Abierto';
    case 'cerrado temporalmente': return 'Cerrado Temporalmente';
    case 'capacidad maxima': return 'Capacidad Máxima';
  }
  return undefined;
};

// =================================================================
// 2. SERVICIOS: Endpoints de la API
// =================================================================

/**
 * Obtiene la lista completa de centros.
 */
export async function listCenters(signal?: AbortSignal): Promise<Center[]> {
  try {
    const { data } = await api.get<any[]>("/centers");
    return Array.isArray(data) ? data.map(normalizeCenter) : [];
  } catch (error) {
    console.error("Error fetching centers:", error);
    return [];
  }
}

/**
 * Obtiene los detalles de un único centro por su ID. El detalle completo de los centros.
 */
export async function getOneCenter(centerId: string, signal?: AbortSignal): Promise<CenterData | null> {
  try {
    const { data } = await api.get<any>(`/centers/${centerId}`, { signal });
    return normalizeCenterData(data);
  } catch (error) {
    console.error(`Error fetching center ${centerId}:`, error);
    return null;
  }
}

/**
 * Obtiene la activación abierta (si existe) para un centro.
 */
export async function getActiveActivation(centerId: string, opts?: { signal?: AbortSignal }): Promise<ActiveActivation | null> {
  try {
    // CAMBIO: Se actualizó la ruta según la refactorización del backend.
    const res = await api.get<ActiveActivation | null>(`/centers/${centerId}/activation`,
      {
        signal: opts?.signal,
        // evitar que tome la respuesta de caché
        params: { t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
        validateStatus: (s) => (s >= 200 && s < 300) || s=== 404|| s === 204,
      }
    );
    if (res.status === 204 || res.status ===404) return null;

    const data = res.data as any;

    if (!data || !data.activation_id) return null;
    return data as ActiveActivation;  
  } catch (e: any) {
    if (e?.code === "ERR_CANCELED") return null;
    console.error(`Error fetching active activation for center ${centerId}:`, e);
    return null;
  }
} //Pdría ser un error por el signal

/**
 * NUEVO: Obtiene una lista de solo los centros que están activos.
 */
export async function listActiveCenters(signal?: AbortSignal): Promise<Center[]> {
    try {
        // CAMBIO: Se actualizó la ruta según la refactorización del backend.
        const { data } = await api.get<any[]>("/centers/status/active", { signal });
        return Array.isArray(data) ? data.map(normalizeCenter) : [];
    } catch (error) {
        console.error("Error fetching active centers:", error);
        return [];
    }
}

/**
 * Crea un nuevo centro de acopio/albergue.
 */
export async function createCenter(payload: CenterData, signal?: AbortSignal) {
  try {
    const { data } = await api.post("/centers", payload, { signal });
    return data;
  } catch (error) {
    console.error("Error creating center:", error);
    throw error;
  }
}

/**
 * Actualiza los datos de un centro.
 */
export async function updateCenter(centerId: string, payload: CenterData, signal?: AbortSignal) {
  try {
    const { data } = await api.put(`/centers/${centerId}`, payload, { signal });
    return data;
  } catch (error) {
    console.error(`Error updating center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Elimina un centro por su ID.
 */
export async function deleteCenter(centerId: string, signal?: AbortSignal): Promise<void> {
  try {
    await api.delete(`/centers/${centerId}`, { signal });
  } catch (error) {
    console.error(`Error deleting center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Activa o desactiva un centro.
 */
export async function updateCenterStatus(centerId: string, isActive: boolean, userId: number, signal?: AbortSignal): Promise<void> {
  try {
    await api.patch(`/centers/${centerId}/status`, { isActive, userId }, { signal });
  } catch (error) {
    console.error(`Error updating status for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Actualiza el estado operativo de un centro.
 */
export async function updateOperationalStatus(centerId: string, newStatusUi: OperationalStatusUI, publicNote?: string, signal?: AbortSignal) {
  try {
    const operationalStatus = mapStatusToBackend(newStatusUi);
    const { data } = await api.patch(`/centers/${centerId}/operational-status`, {
      operationalStatus,
      publicNote: publicNote || "",
    }, { signal });
    return data;
  } catch (error) {
    console.error(`Error updating operational status for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * NUEVO: Obtiene la capacidad de un centro.
 */
export async function getCenterCapacity(
    centerId: string, 
    signal?: AbortSignal
): Promise<{ 
    total_capacity: number;
    current_capacity: number;
    available_capacity: number; 
} | null> { // <-- CAMBIO: Usamos un tipo anónimo aquí
    try {
        // La llamada a la API no necesita cambiar, solo el tipo de retorno de la función.
        const { data } = await api.get(`/centers/${centerId}/capacity`, { signal });
        return data;
    } catch (error) {
        console.error(`Error fetching capacity for center ${centerId}:`, error);
        return null;
    }
}

/**
 * NUEVO: Obtiene el inventario de un centro.
 */
export async function getCenterInventory(centerId: string, signal?: AbortSignal): Promise<InventoryItem[]> {
    try {
        const { data } = await api.get<InventoryItem[]>(`/centers/${centerId}/inventory`, { signal });
        return data ?? [];
    } catch (error) {
        console.error(`Error fetching inventory for center ${centerId}:`, error);
        return [];
    }
}

/**
 * NUEVO: Obtiene la lista de usuarios asignados a un centro específico.
 * Asume la existencia del endpoint en el backend: GET /centers/:centerId/assigned-users
 */
export async function listAssignedUsersToCenter(centerId: string, signal?: AbortSignal): Promise<User[]> {
    try {
        // La API debe devolver un objeto { users: [...] }
        const { data } = await api.get<{ users: User[] }>(`/centers/${centerId}/assigned-users`, { signal });
        
        // Retornamos el array de usuarios.
        return data?.users ?? [];
    } catch (error) {
        console.error(`Error fetching assigned users for center ${centerId}:`, error);
        // Lanzamos el error para que el componente que exporta pueda manejarlo (e.g., mostrar mensaje).
        throw error; 
    }
}