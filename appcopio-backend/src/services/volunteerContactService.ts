import type { Db } from "../types/db";
import { createDatasetDB } from "./databaseService";
import { createFieldDB, createOptionDB } from "./fieldService";
import { createRecordDB, updateRecordDB, getRecordDB } from "./recordService";
import type {
  VolunteerContactData,
  VolunteerInfo,
  VolunteerStatus,
  VolunteerStatusUpdateData,
  VolunteerContactResponse,
} from "../types/volunteer";

const VOLUNTEER_CONTACT_DATASET_KEY = "volunteer-contacts";
const VOLUNTEER_CONTACT_DATASET_NAME = "Contactos de Voluntarios";


export async function findVolunteerDatasetId(
  db: Db,
  activation_id: number
): Promise<string | null> {
  const existingQuery = `
    SELECT dataset_id 
    FROM Datasets 
    WHERE activation_id = $1 
    AND key = $2 
    AND deleted_at IS NULL
    LIMIT 1
  `;

  const { rows: existingRows } = await db.query(existingQuery, [
    activation_id,
    VOLUNTEER_CONTACT_DATASET_KEY,
  ]);

  if (existingRows.length > 0) {
    return existingRows[0].dataset_id;
  }
  return null;
}

export async function createVolunteerDataset(
  db: Db,
  activation_id: number,
  center_id: string,
  userId: number
): Promise<string> {
  // Crear el dataset
  const dataset = await createDatasetDB(db, userId, {
    activation_id,
    center_id,
    name: VOLUNTEER_CONTACT_DATASET_NAME,
    key: VOLUNTEER_CONTACT_DATASET_KEY,
    config: {
      public_form: true,
      form_type: "volunteer_contact",
      created_by_system: true,
    },
  });

  const datasetId = dataset.dataset_id;

  // Campos/columnas necesarias
  const fields = [
    { name: "Nombre", key: "nombre", type: "text", required: true, position: 1 },
    { name: "Celular", key: "celular", type: "text", required: true, position: 2 },
    { name: "Correo Electrónico", key: "email", type: "text", required: true, position: 3 },
    { name: "Capacitaciones", key: "capacitaciones", type: "text", required: false, position: 4, config: { multiline: true } },
    { name: "Descripción Servicios", key: "descripcion_servicios", type: "text", required: false, position: 5, config: { multiline: true } },
    {
      name: "Estado",
      key: "status",
      type: "select",
      required: true,
      position: 6,
      config: {
        // Estas opciones se crean en la tabla DatasetFieldOptions
        // La función createFieldDB (que llamas abajo) debería encargarse de esto
        // si está bien implementada. Si no, habría que crear las opciones aquí.
        // Por ahora, tu `createFieldDB` parece no crear las opciones,
        // así que AÑADIRÉ la lógica para crear las opciones.
        options: [
          { value: "pendiente", label: "Pendiente" },
          { value: "contactado", label: "Contactado" },
          { value: "aceptado", label: "Aceptado" },
          { value: "rechazado", label: "Rechazado" },
        ],
      },
    },
    { name: "Notas Internas", key: "notes", type: "text", required: false, position: 7, config: { multiline: true } },
    { name: "Fecha de Contacto", key: "contacted_at", type: "datetime", required: false, position: 8 },
  ];

  for (const field of fields) {
    // Crear el campo (columna)
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

    // 2. Si el campo es 'select' y tiene opciones, crearlas
    if (field.type === 'select' && field.config?.options) {
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

export async function ensureVolunteerDataset(
  db: Db,
  activation_id: number,
  center_id: string,
  userId: number
): Promise<string> {
  const existingId = await findVolunteerDatasetId(db, activation_id);
  if (existingId) {
    return existingId;
  }
  return createVolunteerDataset(db, activation_id, center_id, userId);
}


export async function createVolunteerContact(
  db: Db,
  input: {
    activation_id: number;
    center_id: string;
    contactData: VolunteerContactData;
  }
): Promise<VolunteerContactResponse> {
  const { activation_id, center_id, contactData } = input;
  const SYSTEM_USER_ID = 1;

  // Asegurar que existe el dataset
  const datasetId = await ensureVolunteerDataset(
    db,
    activation_id,
    center_id,
    SYSTEM_USER_ID
  );

  // Preparar datos
  const recordData = {
    nombre: contactData.nombre,
    email: contactData.email,
    celular: contactData.celular,
    capacitaciones: contactData.capacitaciones || "",
    descripcion_servicios: contactData.descripcion_servicios || "",
  };

  // Buscar UUIDs para 'status' = 'pendiente'
  const fieldQuery = await db.query(
    `SELECT field_id FROM DatasetFields 
     WHERE dataset_id = $1 AND key = $2 AND is_active = TRUE`,
    [datasetId, 'status']
  );
  const fieldId = fieldQuery.rows[0]?.field_id;
  if (!fieldId) {
    throw new Error("Error de configuración: No se pudo encontrar el campo 'status'.");
  }
  
  const optionQuery = await db.query(
    `SELECT option_id FROM DatasetFieldOptions
     WHERE field_id = $1 AND value = $2 AND is_active = TRUE`,
    [fieldId, 'pendiente']
  );
  const optionId = optionQuery.rows[0]?.option_id;
  if (!optionId) {
    throw new Error("Error de configuración: El valor 'pendiente' no es una opción válida.");
  }

  const selectValues: Record<string, string[]> = {
    [fieldId]: [optionId] 
  };

  const record = await createRecordDB(db, SYSTEM_USER_ID, {
    dataset_id: datasetId,
    activation_id: activation_id,
    data: recordData,
    select_values: selectValues,
    relations_dynamic: [],
    relations_core: [],
  });

  return {
    success: true,
    message: "Solicitud de voluntario registrada exitosamente.",
    volunteer_id: record.record_id,
    created_at: record.created_at.toString(), 
  };
}

function mapRowToVolunteerInfo(row: any): VolunteerInfo {
  const data = row.data || {};
  const selectValues = row.select_values || {}; 
  const status = (selectValues.status?.[0] || 'pendiente') as VolunteerStatus;

  return {
    volunteer_id: row.record_id,
    center_id: row.center_id,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    
    nombre: data.nombre || '',
    celular: data.celular || '',
    email: data.email || '',
    capacitaciones: data.capacitaciones || '',
    descripcion_servicios: data.descripcion_servicios || '',
    notes: data.notes || null,
    contacted_at: data.contacted_at || null,
    status: status,
  };
}

export async function listVolunteerContacts(
  db: Db,
  activation_id: number
): Promise<VolunteerInfo[]> {
  
  const query = `
    SELECT 
      dr.record_id, 
      dr.data, 
      dr.created_at, 
      dr.updated_at,
      ds.center_id,
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
    WHERE ds.activation_id = $1
      AND ds.key = $2
      AND dr.deleted_at IS NULL
    ORDER BY dr.created_at DESC
  `;
  
  const { rows } = await db.query(query, [
    activation_id,
    VOLUNTEER_CONTACT_DATASET_KEY,
  ]);
  
  return rows.map(mapRowToVolunteerInfo);
}

export async function getVolunteerContactById(
  db: Db,
  volunteer_id: string
): Promise<VolunteerInfo | null> {
  
  const fullRecordQuery = `
    SELECT 
      dr.record_id, dr.data, dr.version, dr.created_at, dr.updated_at,
      ds.center_id, -- Centro del dataset
      (
         SELECT jsonb_object_agg(df.key, 
            (SELECT jsonb_agg(dfo.value) 
             FROM DatasetRecordOptionValues drov
             JOIN DatasetFieldOptions dfo ON dfo.option_id = drov.option_id
             WHERE drov.record_id = dr.record_id AND drov.field_id = df.field_id
            )
         )
         FROM DatasetFields df
         WHERE df.dataset_id = dr.dataset_id AND df.type IN ('select', 'multi_select')
      ) as select_values
    FROM DatasetRecords dr
    JOIN Datasets ds ON ds.dataset_id = dr.dataset_id
    WHERE dr.record_id = $1
      AND dr.deleted_at IS NULL
    LIMIT 1;
  `;
  
  const { rows } = await db.query(fullRecordQuery, [volunteer_id]);
  if (rows.length === 0) return null;
  
  return mapRowToVolunteerInfo(rows[0]);
}

export async function updateVolunteerStatus(
  db: Db,
  volunteer_id: string,
  updateData: VolunteerStatusUpdateData,
  userId: number
): Promise<VolunteerInfo> {
  const currentRecord = await getRecordDB(db, volunteer_id);

  if (!currentRecord) {
    throw new Error("Voluntario no encontrado o ya eliminado.");
  }
  
  const dataToUpdate: any = {};
  const selectValuesToUpdate: Record<string, string[]> = {};

  if (updateData.notes !== undefined) {
    dataToUpdate.notes = updateData.notes;
  }

  if (updateData.status) {
    const fieldQuery = await db.query(
      `SELECT field_id FROM DatasetFields 
       WHERE dataset_id = $1 AND key = $2 AND is_active = TRUE`,
      [currentRecord.dataset_id, 'status']
    );
    const fieldId = fieldQuery.rows[0]?.field_id;
    if (!fieldId) {
      throw new Error("No se pudo encontrar el campo 'status' en el dataset.");
    }
    
    const optionQuery = await db.query(
      `SELECT option_id FROM DatasetFieldOptions
       WHERE field_id = $1 AND value = $2 AND is_active = TRUE`,
      [fieldId, updateData.status]
    );
    const optionId = optionQuery.rows[0]?.option_id;
    if (!optionId) {
      throw new Error(`El valor de estado '${updateData.status}' no es una opción válida.`);
    }

    selectValuesToUpdate[fieldId] = [optionId];
    if (updateData.status === 'contactado' && !currentRecord.data.contacted_at) {
      dataToUpdate.contacted_at = new Date().toISOString();
    }
  }

  const updatedRecord = await updateRecordDB(db, userId, {
    record_id: volunteer_id,
    version: currentRecord.version,
    data: Object.keys(dataToUpdate).length > 0 ? dataToUpdate : undefined,
    select_values: Object.keys(selectValuesToUpdate).length > 0 ? selectValuesToUpdate : undefined,
  });

  if (!updatedRecord) {
    throw new Error("Conflicto de versión. Los datos han sido modificados por otro usuario. Por favor, recarga e intenta de nuevo.");
  }

  const updatedVolunteerInfo = await getVolunteerContactById(db, volunteer_id);
  
  if (!updatedVolunteerInfo) {
    throw new Error("Error al recuperar el voluntario después de actualizarlo.");
  }

  return updatedVolunteerInfo;
}