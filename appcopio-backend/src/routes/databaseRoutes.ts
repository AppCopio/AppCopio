import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { createDatasetDB, getDatasetByIdDB, listDatasetsDB, updateDatasetDB, softDeleteDatasetDB, getDatasetSnapshot } from "../services/databaseService";
import type { Dataset, UUID, TemplateField } from "../types/dataset";
import { listTemplateFieldsDB } from '../services/templateService'; 
import { createFieldDB } from '../services/fieldService';
import type { Db } from '../types/db';

import { requireUser } from "../auth/requireUser";
import { requireAuth } from '../auth/middleware';


const router = Router();

// Helpers locales (no compartidos)
function parseIntParam(v: any): number | null {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

async function createDatasetAndFields(client: Db, args: {
    activation_id: number; center_id: string; name: string; key: string; config: any;
}, userId: number) {
    // 1. Crear el Dataset base
    const dataset = await createDatasetDB(client, userId, args);
    const datasetId = dataset.dataset_id;
    
    // 2. Crear el campo de ejemplo 'Título/Nombre' para el dataset vacío
    await createFieldDB(client, {
        dataset_id: datasetId,
        name: "Título/Nombre",
        key: "rec_title",
        type: "text",
        required: true,
        is_active: true,
        position: 0
    });
    
    return dataset;
}
// =============================
// Controllers
// =============================

const listDatasets: RequestHandler = async (req, res) => {
  const activation_id = parseIntParam(req.query.activation_id);
  if (!activation_id) {
    res.status(400).json({ error: "Se requiere activation_id como query param (int)." });
    return;
  }
  
  try {
    const rows = await listDatasetsDB(pool, activation_id );
    res.json({ items: rows });
  } catch (e: any) {
    console.error("listDatasets error:", e);
    res.status(500).json({ error: "Error al listar bases de datos." });
  }
};

const getDataset: RequestHandler = async (req, res) => {
  const id = req.params.id;
  if (!id) { res.status(400).json({ error: "Falta id." }); return; }

  try {
    const row = await getDatasetByIdDB(pool, id);
    if (!row) { res.status(404).json({ error: "Dataset no encontrado." }); return; }
    res.json(row);
  } catch (e: any) {
    console.error("getDataset error:", e);
    res.status(500).json({ error: "Error al obtener el dataset." });
  }
};

const createDataset: RequestHandler = async (req, res) => {
  // Extrae template_key para usarlo en el chequeo
  const { activation_id, center_id, name, key, config, template_key: req_template_key } = req.body ?? {};
  const userId = requireUser(req).user_id;

  if (!activation_id || !center_id || !name || !key) {
    res.status(400).json({ error: "Requiere activation_id, center_id, name, key." });
    return;
  }
  
  const templateKey = req_template_key || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (templateKey && templateKey !== 'blank') {
        const existingDatasets = await listDatasetsDB(client, Number(activation_id));
        // Compara con la nueva propiedad 'template_key' que se expone
        const templateAlreadyUsed = existingDatasets.some(d => d.template_key === templateKey); 
        if (templateAlreadyUsed) {
            throw { code: "TEMPLATE_USED", message: `La plantilla "${name}" ya fue utilizada en esta activación.` };
        }
    }
    const newConfig = { 
        ...(config ?? {}), 
        ...(templateKey ? { template_key: templateKey } : {}) 
    };

    const dataset = await createDatasetAndFields(client, {
        activation_id: Number(activation_id),
        center_id: String(center_id),
        name: String(name),
        key: String(key),
        config: newConfig,
    }, userId);

    await client.query("COMMIT");
    res.status(201).json(dataset);
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("createDataset error:", e);
    if (e.code === "23505") {
      res.status(409).json({ error: "Ya existe un dataset con esa key en la activación." });
    }else if (e.code === "TEMPLATE_USED") {
        res.status(409).json({ error: e.message }); // "Base de datos ya inicializada: nombre de la base de datos"
    }else {
      res.status(500).json({ error: "Error al crear dataset." });
    }
  } finally {
    client.release();
  }
};

const updateDataset: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const { name, config, deleted_at } = req.body ?? {};
  const userId = requireUser(req).user_id;
  if (!id) { res.status(400).json({ error: "Falta id." }); return; }

  try {
    const row = await updateDatasetDB(pool, userId, id, { name, config, deleted_at });
    if (!row) { res.status(404).json({ error: "Dataset no encontrado." }); return; }
    res.json(row);
  } catch (e: any) {
    console.error("updateDataset error:", e);
    res.status(500).json({ error: "Error al actualizar dataset." });
  }
};

const deleteDataset: RequestHandler = async (req, res) => {
  const id = req.params.id;
  if (!id) { res.status(400).json({ error: "Falta id." }); return; }

  try {
    const row = await softDeleteDatasetDB(pool, id);
    if (!row) { res.status(404).json({ error: "Dataset no encontrado." }); return; }
    res.json({ message: "Dataset eliminado (soft-delete).", dataset_id: id });
  } catch (e: any) {
    console.error("deleteDataset error:", e);
    res.status(500).json({ error: "Error al eliminar dataset." });
  }
};

/** GET /notion/datasets/:datasetId/snapshot */
const UUID_RE = /^[0-9a-fA-F-]{36}$/;

export const getSnapshot: RequestHandler = async (req, res) => {
  const datasetId = String(req.params.id || "");  

  // 1) Validación simple de UUID
  if (!UUID_RE.test(datasetId)) {
    res.status(400).json({ error: "datasetId no es un UUID válido." });
    return;
  }

  try {
    const info = await getDatasetSnapshot(pool, datasetId);
    if (!info) {
      // (El service devuelve null si el dataset no existe o está borrado)
      res.status(404).json({ error: "Dataset no encontrado." });
      return;
    }
    res.json(info);
  } catch (e) {
    const msg = (e as Error).message || "Error interno del servidor.";

    // 2) Mapeo simple por substring del mensaje (sin clases)
    if (msg.includes("SQL_DATASET_FAILED")) {
      res.status(500).json({ error: "No se pudo obtener el dataset." });
      return;
    }
    if (msg.includes("SQL_FIELDS_FAILED")) {
      res.status(500).json({ error: "No se pudieron obtener las columnas del dataset." });
      return;
    }
    if (msg.includes("SQL_RECORDS_FAILED")) {
      res.status(500).json({ error: "No se pudieron obtener los registros del dataset." });
      return;
    }
    if (msg.includes("SQL_OPTIONS_FAILED")) {
      res.status(500).json({ error: "No se pudieron agregar las opciones de select/multi_select." });
      return;
    }
    if (msg.includes("SQL_REL_DYNAMIC_FAILED")) {
      res.status(500).json({ error: "No se pudieron agregar las relaciones dinámicas." });
      return;
    }
    if (msg.includes("SQL_REL_CORE_FAILED")) {
      res.status(500).json({ error: "No se pudieron agregar las relaciones core." });
      return;
    }
    if (msg.includes("BUILD_CELLS_FAILED")) {
      res.status(500).json({ error: "No se pudo construir la matriz de celdas." });
      return;
    }

    // Fallback genérico
    console.error("getSnapshot unexpected error:", e);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

const applyTemplateToDataset: RequestHandler = async (req, res) => {
    const datasetId = req.params.id;
    const { template_key } = req.body ?? {};
    const userId = requireUser(req).user_id;
    
    if (!datasetId || !template_key || template_key === 'blank') {
        res.status(400).json({ error: "Requiere dataset_id y template_key (que no sea 'blank')." });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // 1. Verificar si ya tiene campos (se asume que solo se aplica una vez)
        // Nota: Si solo tiene el campo 'Título/Nombre' (posición 0), se permite.
        const existingFields = await listTemplateFieldsDB(client, datasetId);
        // Si hay más de un campo o si el único campo no es el predeterminado.
        if (existingFields.length > 1) { 
             throw { code: "FIELDS_EXIST", message: "La base de datos ya tiene campos; no se puede aplicar la plantilla." };
        }
        
        // 🚨 Es CRÍTICO que la lógica para obtener templateId a partir de template_key sea robusta.
        // Aquí se usa el ID placeholder (f47...) que debe ser reemplazado por la lógica de tu BE.
        // Usamos el mismo ID hardcodeado de tu código anterior como ejemplo de "ID de la plantilla".
        const templateId = "f47ac10b-58cc-4372-a567-0e02b2c3d479"; 
        
        if (!templateId) {
            throw { code: "TEMPLATE_NOT_FOUND", message: `La plantilla con key "${template_key}" no tiene un ID asociado.` };
        }
        
        // 2. Obtener y crear los campos de la plantilla
        const templateFields: TemplateField[] = await listTemplateFieldsDB(client, templateId);

        if (templateFields.length === 0) {
            throw { code: "TEMPLATE_EMPTY", message: `La plantilla no tiene campos definidos.` };
        }
        
        for (const fieldTemplate of templateFields) {
            await createFieldDB(client, {
                dataset_id: datasetId,
                name: fieldTemplate.name,
                key: fieldTemplate.key,
                type: fieldTemplate.field_type,
                required: fieldTemplate.is_required,
                is_multi: fieldTemplate.is_multi,
                position: fieldTemplate.position,
                config: fieldTemplate.settings,
                relation_target_kind: fieldTemplate.relation_target_kind,
                relation_target_dataset_id: fieldTemplate.relation_target_template_id,
                relation_target_core: fieldTemplate.relation_target_core,
                is_active: true,
            });
        }
        
        // 3. Actualizar el dataset para marcar que se usó esta plantilla
        await updateDatasetDB(client, userId, datasetId, { config: { template_key: template_key } });

        await client.query("COMMIT");
        res.status(200).json({ message: "Plantilla aplicada exitosamente.", dataset_id: datasetId });
    } catch (e: any) {
        await client.query("ROLLBACK");
        console.error("applyTemplateToDataset error:", e);
        if (e.code === "FIELDS_EXIST") {
            res.status(409).json({ error: e.message });
        } else {
            res.status(500).json({ error: "Error al aplicar la plantilla." });
        }
    } finally {
        client.release();
    }
};


// =============================
// Routes
// =============================
router.get("/", listDatasets);
router.get("/:id", getDataset);
router.post("/", requireAuth, createDataset);
router.patch("/:id", updateDataset);
router.delete("/:id", deleteDataset);
router.get("/:id/general-view", getSnapshot);

router.post("/:id/apply-template", applyTemplateToDataset);

export default router;
