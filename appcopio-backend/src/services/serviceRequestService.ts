// src/services/serviceRequestService.ts
import type { Db } from "../types/db";
import { createDatasetDB } from "./databaseService";
import { createFieldDB } from "./fieldService";
import { createOptionDB } from "./fieldService";
import { createRecordDB, updateRecordDB, getRecordDB } from "./recordService";
import type {
  ServiceRequestCreateData,
  ServiceRequestUpdateData,
  ServiceRequestInfo,
  ServiceRequestCreateResponse,
  ServiceRequestStatus,
  ServiceRequestFilters,
  ServiceRequestPublicFilters,
  ServiceRequestPublicInfo,
} from "../types/serviceRequest";

const SERVICE_REQUEST_DATASET_KEY = "service-requests";
const SERVICE_REQUEST_DATASET_NAME = "Avisos de Servicios Necesarios";

// =================================================================
// HELPERS PRIVADOS
// =================================================================

/**
 * Busca el ID del dataset de avisos de servicios si ya existe
 */
async function findServiceRequestDatasetId(
  db: Db,
  activation_id: number
): Promise<string | null> {
  const query = `
    SELECT dataset_id 
    FROM Datasets 
    WHERE activation_id = $1 
      AND key = $2 
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const { rows } = await db.query(query, [
    activation_id,
    SERVICE_REQUEST_DATASET_KEY,
  ]);

  return rows.length > 0 ? rows[0].dataset_id : null;
}

/**
 * Crea el dataset de avisos de servicios con todos sus campos
 */
async function createServiceRequestDataset(
  db: Db,
  activation_id: number,
  center_id: string,
  userId: number
): Promise<string> {
  // Crear el dataset
  const dataset = await createDatasetDB(db, userId, {
    activation_id,
    center_id,
    name: SERVICE_REQUEST_DATASET_NAME,
    key: SERVICE_REQUEST_DATASET_KEY,
    config: {
      service_requests: true,
      created_by_system: true,
    },
  });

  const datasetId = dataset.dataset_id;

  // Definir campos
  const fields = [
    { name: "Título", key: "titulo", type: "text", required: true,  position: 1, },
    { name: "Descripción", key: "descripcion", type: "text", required: true, position: 2, config: { multiline: true }, },
    { name: "Categoría", key: "categoria", type: "select", required: true, position: 3,
      config: {
        options: [
          { value: "salud", label: "Salud" },
          { value: "educacion", label: "Educación" },
          { value: "construccion", label: "Construcción" },
          { value: "limpieza", label: "Limpieza" },
          { value: "alimentacion", label: "Alimentación" },
          { value: "transporte", label: "Transporte" },
          { value: "logistica", label: "Logística" },
          { value: "tecnologia", label: "Tecnología" },
          { value: "legal", label: "Legal" },
          { value: "psicologia", label: "Psicología" },
          { value: "otro", label: "Otro" },
        ],
      },
    },
    { name: "Urgencia", key: "urgencia", type: "select", position: 4,
      config: {
        options: [
          { value: "baja", label: "Baja" },
          { value: "media", label: "Media" },
          { value: "alta", label: "Alta" },
          { value: "critica", label: "Crítica" },
        ],
      },
    },
    { name: "Duración Estimada", key: "duracion_estimada", type: "select", required: true, position: 5,
      config: {
        options: [
          { value: "horas", label: "Horas" },
          { value: "dias", label: "Días" },
          { value: "semanas", label: "Semanas" },
          { value: "indefinido", label: "Indefinido" },
        ],
      },
    },
    { name: "Estado", key: "status", type: "select", required: true, position: 6,
      config: {
        options: [
          { value: "pendiente", label: "Pendiente" },
          { value: "en_progreso", label: "En Progreso" },
          { value: "completado", label: "Completado" },
          { value: "cancelado", label: "Cancelado" },
        ],
      },
    },
    { name: "Notas Internas", key: "notas_internas", type: "text", required: false, position: 7, config: { multiline: true }, },
    { name: "Fecha de Completado", key: "completed_at", type: "datetime", required: false, position: 8, },
  ];

  // Crear campos y sus opciones
  for (const field of fields) {
    const newField = await createFieldDB(db, {
      dataset_id: datasetId,
      name: field.name,
      key: field.key,
      type: field.type as any,
      required: field.required,
      position: field.position,
      is_active: true,
      config: field.config || {},
    });

    // Crear opciones para campos select
    if (field.type === "select" && field.config?.options) {
      let optPos = 0;
      for (const opt of field.config.options) {
        await createOptionDB(db, {
          field_id: newField.field_id,
          label: opt.label,
          value: opt.value,
          position: optPos++,
        });
      }
    }
  }

  return datasetId;
}

/**
 * Obtiene o crea el dataset de avisos de servicios
 */
async function ensureServiceRequestDataset(
  db: Db,
  activation_id: number,
  center_id: string,
  userId: number
): Promise<string> {
  const existingId = await findServiceRequestDatasetId(db, activation_id);
  if (existingId) {
    return existingId;
  }
  return createServiceRequestDataset(db, activation_id, center_id, userId);
}

/**
 * Busca el field_id y option_id para un campo select dado su key y value
 */
async function findSelectFieldOption(
  db: Db,
  datasetId: string,
  fieldKey: string,
  optionValue: string
): Promise<{ fieldId: string; optionId: string }> {
  const fieldQuery = await db.query(
    `SELECT field_id FROM DatasetFields 
     WHERE dataset_id = $1 AND key = $2 AND is_active = TRUE`,
    [datasetId, fieldKey]
  );
  const fieldId = fieldQuery.rows[0]?.field_id;

  if (!fieldId) {
    throw new Error(`Campo '${fieldKey}' no encontrado en el dataset.`);
  }

  const optionQuery = await db.query(
    `SELECT option_id FROM DatasetFieldOptions
     WHERE field_id = $1 AND value = $2 AND is_active = TRUE`,
    [fieldId, optionValue]
  );
  const optionId = optionQuery.rows[0]?.option_id;

  if (!optionId) {
    throw new Error(`Opción '${optionValue}' no válida para el campo '${fieldKey}'.`);
  }

  return { fieldId, optionId };
}

/**
 * Mapea una fila de DB a ServiceRequestInfo
 */
function mapRowToServiceRequestInfo(row: any): ServiceRequestInfo {
  const data = row.data || {};
  const selectValues = row.select_values || {};

  // Extraer valores de selects
  const extractSelectValue = (key: string, fallback: string) => {
    if (selectValues[key]) {
      const arr = Array.isArray(selectValues[key])
        ? selectValues[key]
        : [selectValues[key]];
      return arr[0] || fallback;
    }
    return fallback;
  };

  return {
    service_request_id: row.record_id,
    center_id: row.center_id,
    activation_id: row.activation_id,
    created_by: row.created_by,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),

    titulo: data.titulo || "",
    descripcion: data.descripcion || "",
    categoria: extractSelectValue("categoria", "otro") as any,
    urgencia: extractSelectValue("urgencia", "media") as any,
    duracion_estimada: extractSelectValue("duracion_estimada", "indefinido") as any,
    status: extractSelectValue("status", "pendiente") as ServiceRequestStatus,

    notas_internas: data.notas_internas || null,
    completed_at: data.completed_at || null,

    center_name: row.center_name || undefined,
    created_by_name: row.created_by_name || undefined,
  };
}

// =================================================================
// FUNCIONES PÚBLICAS
// =================================================================

/**
 * Crea un nuevo aviso de servicio
 */
export async function createServiceRequest(
  db: Db,
  input: {
    activation_id: number;
    center_id: string;
    created_by: number;
    requestData: ServiceRequestCreateData;
  }
): Promise<ServiceRequestCreateResponse> {
  const { activation_id, center_id, created_by, requestData } = input;

  try {
    await db.query("BEGIN");

    // Validaciones
    if (!requestData.titulo?.trim()) {
      throw new Error("El título es obligatorio.");
    }
    if (!requestData.descripcion?.trim()) {
      throw new Error("La descripción es obligatoria.");
    }

    // Asegurar dataset
    const datasetId = await ensureServiceRequestDataset(
      db,
      activation_id,
      center_id,
      created_by
    );

    // Preparar datos atómicos
    const recordData = {
      titulo: requestData.titulo.trim(),
      descripcion: requestData.descripcion.trim(),
    };

    // Preparar select_values
    const selectValues: Record<string, string[]> = {};

    // Categoría
    const categoria = await findSelectFieldOption(
      db,
      datasetId,
      "categoria",
      requestData.categoria
    );
    selectValues[categoria.fieldId] = [categoria.optionId];

    // Urgencia
    const urgencia = await findSelectFieldOption(
      db,
      datasetId,
      "urgencia",
      requestData.urgencia
    );
    selectValues[urgencia.fieldId] = [urgencia.optionId];

    // Duración
    const duracion = await findSelectFieldOption(
      db,
      datasetId,
      "duracion_estimada",
      requestData.duracion_estimada
    );
    selectValues[duracion.fieldId] = [duracion.optionId];

    // Status inicial: pendiente
    const status = await findSelectFieldOption(
      db,
      datasetId,
      "status",
      "pendiente"
    );
    selectValues[status.fieldId] = [status.optionId];

    // Crear registro
    const record = await createRecordDB(db, created_by, {
      dataset_id: datasetId,
      activation_id,
      data: recordData,
      select_values: selectValues,
      relations_dynamic: [],
      relations_core: [],
    });

    await db.query("COMMIT");

    return {
      success: true,
      message: "Aviso de servicio publicado exitosamente.",
      service_request_id: record.record_id,
      created_at: new Date(record.created_at).toISOString(),
    };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

/**
 * Lista avisos de servicios con filtros opcionales
 */
export async function listServiceRequests(
  db: Db,
  filters: ServiceRequestFilters = {}
): Promise<ServiceRequestInfo[]> {
  const conditions: string[] = ["dr.deleted_at IS NULL"];
  const params: any[] = [];
  let paramCount = 1;

  if (filters.activation_id) {
    conditions.push(`ds.activation_id = $${paramCount++}`);
    params.push(filters.activation_id);
  }

  if (filters.center_id) {
    conditions.push(`ds.center_id = $${paramCount++}`);
    params.push(filters.center_id);
  }

  // Para filtrar por status/categoria/urgencia necesitarías JOINs complejos
  // Por simplicidad, filtramos en memoria si es necesario

  const query = `
    SELECT 
      dr.record_id,
      dr.data,
      dr.created_at,
      dr.updated_at,
      dr.created_by,
      ds.center_id,
      ds.activation_id,
      c.name as center_name,
      u.nombre as created_by_name,
      COALESCE(
        (
          SELECT jsonb_object_agg(df.key, 
            COALESCE(
              (SELECT jsonb_agg(dfo.value) 
               FROM DatasetRecordOptionValues drov
               JOIN DatasetFieldOptions dfo ON dfo.option_id = drov.option_id
               WHERE drov.record_id = dr.record_id AND drov.field_id = df.field_id
              ), 
              '[]'::jsonb
            )
          )
          FROM DatasetFields df
          WHERE df.dataset_id = dr.dataset_id AND df.type IN ('select', 'multi_select')
        ),
        '{}'::jsonb
      ) as select_values
    FROM DatasetRecords dr
    JOIN Datasets ds ON ds.dataset_id = dr.dataset_id
    LEFT JOIN Centers c ON c.center_id = ds.center_id
    LEFT JOIN Users u ON u.user_id = dr.created_by
    WHERE ds.key = $${paramCount++}
      AND ${conditions.join(" AND ")}
    ORDER BY dr.created_at DESC
  `;

  params.push(SERVICE_REQUEST_DATASET_KEY);

  const { rows } = await db.query(query, params);
  let results = rows.map(mapRowToServiceRequestInfo);

  // Filtros post-query (en memoria)
  if (filters.status) {
    results = results.filter((r) => r.status === filters.status);
  }
  if (filters.categoria) {
    results = results.filter((r) => r.categoria === filters.categoria);
  }
  if (filters.urgencia) {
    results = results.filter((r) => r.urgencia === filters.urgencia);
  }

  return results;
}

/**
 * Obtiene un aviso específico por ID
 */
export async function getServiceRequestById(
  db: Db,
  service_request_id: string
): Promise<ServiceRequestInfo | null> {
  const query = `
    SELECT 
      dr.record_id,
      dr.data,
      dr.created_at,
      dr.updated_at,
      dr.created_by,
      ds.center_id,
      ds.activation_id,
      c.name as center_name,
      u.nombre as created_by_name,
      COALESCE(
        (
          SELECT jsonb_object_agg(df.key, 
            COALESCE(
              (SELECT jsonb_agg(dfo.value) 
               FROM DatasetRecordOptionValues drov
               JOIN DatasetFieldOptions dfo ON dfo.option_id = drov.option_id
               WHERE drov.record_id = dr.record_id AND drov.field_id = df.field_id
              ), 
              '[]'::jsonb
            )
          )
          FROM DatasetFields df
          WHERE df.dataset_id = dr.dataset_id AND df.type IN ('select', 'multi_select')
        ),
        '{}'::jsonb
      ) as select_values
    FROM DatasetRecords dr
    JOIN Datasets ds ON ds.dataset_id = dr.dataset_id
    LEFT JOIN Centers c ON c.center_id = ds.center_id
    LEFT JOIN Users u ON u.user_id = dr.created_by
    WHERE dr.record_id = $1
      AND dr.deleted_at IS NULL
    LIMIT 1
  `;

  const { rows } = await db.query(query, [service_request_id]);

  return rows.length > 0 ? mapRowToServiceRequestInfo(rows[0]) : null;
}

/**
 * Actualiza un aviso de servicio
 */
export async function updateServiceRequest(
  db: Db,
  service_request_id: string,
  updateData: ServiceRequestUpdateData,
  userId: number
): Promise<ServiceRequestInfo> {

  try {
    await db.query("BEGIN");

    const currentRecord = await getRecordDB(db, service_request_id);
    if (!currentRecord) {
      throw new Error("Aviso de servicio no encontrado.");
    }

    const dataToUpdate: any = {};
    const selectValuesToUpdate: Record<string, string[]> = {};

    // Actualizar campos atómicos
    if (updateData.titulo !== undefined) {
      dataToUpdate.titulo = updateData.titulo.trim();
    }
    if (updateData.descripcion !== undefined) {
      dataToUpdate.descripcion = updateData.descripcion.trim();
    }
    if (updateData.notas_internas !== undefined) {
      dataToUpdate.notas_internas = updateData.notas_internas;
    }

    // Actualizar selects
    if (updateData.categoria) {
      const cat = await findSelectFieldOption(
        db,
        currentRecord.dataset_id,
        "categoria",
        updateData.categoria
      );
      selectValuesToUpdate[cat.fieldId] = [cat.optionId];
    }

    if (updateData.urgencia) {
      const urg = await findSelectFieldOption(
        db,
        currentRecord.dataset_id,
        "urgencia",
        updateData.urgencia
      );
      selectValuesToUpdate[urg.fieldId] = [urg.optionId];
    }

    if (updateData.duracion_estimada) {
      const dur = await findSelectFieldOption(
        db,
        currentRecord.dataset_id,
        "duracion_estimada",
        updateData.duracion_estimada
      );
      selectValuesToUpdate[dur.fieldId] = [dur.optionId];
    }

    if (updateData.status) {
      const st = await findSelectFieldOption(
        db,
        currentRecord.dataset_id,
        "status",
        updateData.status
      );
      selectValuesToUpdate[st.fieldId] = [st.optionId];

      // Si se completa, registrar fecha
      if (updateData.status === "completado" && !currentRecord.data.completed_at) {
        dataToUpdate.completed_at = new Date().toISOString();
      }
    }

    // Verificar si hay cambios
    if (
      Object.keys(dataToUpdate).length === 0 &&
      Object.keys(selectValuesToUpdate).length === 0
    ) {
      await db.query("ROLLBACK");
      const current = await getServiceRequestById(db, service_request_id);
      if (!current) throw new Error("Error al obtener el aviso.");
      return current;
    }

    // Actualizar
    const updatedRecord = await updateRecordDB(db, userId, {
      record_id: service_request_id,
      version: currentRecord.version,
      data: Object.keys(dataToUpdate).length > 0 ? dataToUpdate : undefined,
      select_values:
        Object.keys(selectValuesToUpdate).length > 0
          ? selectValuesToUpdate
          : undefined,
      relations_dynamic: [],
      relations_core: [],
    });

    if (!updatedRecord) {
      throw new Error(
        "Conflicto de versión. Los datos fueron modificados por otro usuario."
      );
    }

    await db.query("COMMIT");

    const updated = await getServiceRequestById(db, service_request_id);
    if (!updated) throw new Error("Error al recuperar el aviso actualizado.");

    return updated;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

/**
 * Elimina (soft delete) un aviso de servicio
 */
export async function deleteServiceRequest(
  db: Db,
  service_request_id: string
): Promise<void> {
  const query = `
    UPDATE DatasetRecords
    SET deleted_at = NOW()
    WHERE record_id = $1 AND deleted_at IS NULL
  `;

  const { rowCount } = await db.query(query, [service_request_id]);

  if (rowCount === 0) {
    throw new Error("Aviso de servicio no encontrado o ya eliminado.");
  }
}

// src/services/serviceRequestService.ts

/**
 * Mapea una fila de DB a ServiceRequestPublicInfo (versión pública)
 */
function mapRowToServiceRequestPublicInfo(row: any): ServiceRequestPublicInfo {
  const data = row.data || {};
  const selectValues = row.select_values || {};

  // Extraer valores de selects
  const extractSelectValue = (key: string, fallback: string) => {
    if (selectValues[key]) {
      const arr = Array.isArray(selectValues[key])
        ? selectValues[key]
        : [selectValues[key]];
      return arr[0] || fallback;
    }
    return fallback;
  };

  return {
    service_request_id: row.record_id,
    center_id: row.center_id,
    titulo: data.titulo || "",
    descripcion: data.descripcion || "",
    categoria: extractSelectValue("categoria", "otro") as any,
    urgencia: extractSelectValue("urgencia", "media") as any,
    duracion_estimada: extractSelectValue("duracion_estimada", "indefinido") as any,
    status: extractSelectValue("status", "pendiente") as ServiceRequestStatus,
    created_at: new Date(row.created_at).toISOString(),
    center_name: row.center_name || undefined,
  };
}

/**
 * Lista avisos de servicios para vista pública
 * Solo devuelve información no sensible y solo avisos activos por defecto
 */
export async function listPublicServiceRequests(
  db: Db,
  filters: ServiceRequestPublicFilters = {}
): Promise<ServiceRequestPublicInfo[]> {
  const conditions: string[] = [
    "dr.deleted_at IS NULL",
    "ds.key = $1",
  ];
  const params: any[] = [SERVICE_REQUEST_DATASET_KEY];
  let paramCount = 2;

  // Filtro por activación
  if (filters.activation_id) {
    conditions.push(`ds.activation_id = $${paramCount++}`);
    params.push(filters.activation_id);
  }

  // Filtro por centro
  if (filters.center_id) {
    conditions.push(`ds.center_id = $${paramCount++}`);
    params.push(filters.center_id);
  }

  // Solo avisos activos (pendiente o en_progreso) por defecto
  const onlyActive = filters.only_active !== false; // true por defecto

  const query = `
    SELECT 
      dr.record_id,
      dr.data,
      dr.created_at,
      ds.center_id,
      c.name as center_name,
      COALESCE(
        (
          SELECT jsonb_object_agg(df.key, 
            COALESCE(
              (SELECT jsonb_agg(dfo.value) 
               FROM DatasetRecordOptionValues drov
               JOIN DatasetFieldOptions dfo ON dfo.option_id = drov.option_id
               WHERE drov.record_id = dr.record_id AND drov.field_id = df.field_id
              ), 
              '[]'::jsonb
            )
          )
          FROM DatasetFields df
          WHERE df.dataset_id = dr.dataset_id AND df.type IN ('select', 'multi_select')
        ),
        '{}'::jsonb
      ) as select_values
    FROM DatasetRecords dr
    JOIN Datasets ds ON ds.dataset_id = dr.dataset_id
    LEFT JOIN Centers c ON c.center_id = ds.center_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY 
      CASE 
        WHEN (select_values->>'urgencia')::jsonb->>0 = 'critica' THEN 1
        WHEN (select_values->>'urgencia')::jsonb->>0 = 'alta' THEN 2
        WHEN (select_values->>'urgencia')::jsonb->>0 = 'media' THEN 3
        ELSE 4
      END,
      dr.created_at DESC
  `;

  const { rows } = await db.query(query, params);
  let results = rows.map(mapRowToServiceRequestPublicInfo);

  // Filtros post-query (en memoria)
  
  // Solo avisos activos
  if (onlyActive) {
    results = results.filter(
      (r) => r.status === "pendiente" || r.status === "en_progreso"
    );
  }

  // Filtro por categoría
  if (filters.categoria) {
    results = results.filter((r) => r.categoria === filters.categoria);
  }

  // Filtro por urgencia
  if (filters.urgencia) {
    results = results.filter((r) => r.urgencia === filters.urgencia);
  }

  return results;
}

/**
 * Obtiene un aviso específico en su versión pública
 */
export async function getPublicServiceRequestById(
  db: Db,
  service_request_id: string
): Promise<ServiceRequestPublicInfo | null> {
  const query = `
    SELECT 
      dr.record_id,
      dr.data,
      dr.created_at,
      ds.center_id,
      c.name as center_name,
      COALESCE(
        (
          SELECT jsonb_object_agg(df.key, 
            COALESCE(
              (SELECT jsonb_agg(dfo.value) 
               FROM DatasetRecordOptionValues drov
               JOIN DatasetFieldOptions dfo ON dfo.option_id = drov.option_id
               WHERE drov.record_id = dr.record_id AND drov.field_id = df.field_id
              ), 
              '[]'::jsonb
            )
          )
          FROM DatasetFields df
          WHERE df.dataset_id = dr.dataset_id AND df.type IN ('select', 'multi_select')
        ),
        '{}'::jsonb
      ) as select_values
    FROM DatasetRecords dr
    JOIN Datasets ds ON ds.dataset_id = dr.dataset_id
    LEFT JOIN Centers c ON c.center_id = ds.center_id
    WHERE dr.record_id = $1
      AND dr.deleted_at IS NULL
    LIMIT 1
  `;

  const { rows } = await db.query(query, [service_request_id]);

  if (rows.length === 0) return null;

  return mapRowToServiceRequestPublicInfo(rows[0]);
}

/**
 * Cuenta avisos por categoría (para estadísticas públicas)
 */
export async function countServiceRequestsByCategory(
  db: Db,
  activation_id?: number
): Promise<Record<string, number>> {
  const conditions = ["dr.deleted_at IS NULL", "ds.key = $1"];
  const params: any[] = [SERVICE_REQUEST_DATASET_KEY];
  let paramCount = 2;

  if (activation_id) {
    conditions.push(`ds.activation_id = $${paramCount++}`);
    params.push(activation_id);
  }

  const query = `
    WITH status_filter AS (
      SELECT dr.record_id, dr.dataset_id
      FROM DatasetRecords dr
      JOIN Datasets ds ON ds.dataset_id = dr.dataset_id
      JOIN DatasetFields df ON df.dataset_id = dr.dataset_id AND df.key = 'status'
      JOIN DatasetRecordOptionValues drov ON drov.record_id = dr.record_id AND drov.field_id = df.field_id
      JOIN DatasetFieldOptions dfo ON dfo.option_id = drov.option_id
      WHERE ${conditions.join(" AND ")}
        AND dfo.value IN ('pendiente', 'en_progreso')
    )
    SELECT 
      dfo.value as categoria,
      COUNT(*) as count
    FROM status_filter sf
    JOIN DatasetFields df ON df.dataset_id = sf.dataset_id AND df.key = 'categoria'
    JOIN DatasetRecordOptionValues drov ON drov.record_id = sf.record_id AND drov.field_id = df.field_id
    JOIN DatasetFieldOptions dfo ON dfo.option_id = drov.option_id
    GROUP BY dfo.value
    ORDER BY count DESC
  `;

  const { rows } = await db.query(query, params);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.categoria] = parseInt(row.count, 10);
  }

  return counts;
}