import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { createDatasetDB, getDatasetByIdDB, listDatasetsDB, updateDatasetDB, softDeleteDatasetDB, getDatasetSnapshot } from "../services/databaseService";
import type { Dataset, UUID, TemplateField } from "../types/dataset";
import { listTemplateFieldsDB } from '../services/templateService'; 
import { createFieldDB } from '../services/fieldService';
import type { Db } from '../types/db';

const router = Router();

// Helpers locales (no compartidos)
function parseIntParam(v: any): number | null {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

async function createDatasetAndFields(client: Db, args: {
    activation_id: number; center_id: string; name: string; key: string; config: any;
}, templateKey: string | null) {
    // 1. Crear el Dataset base
    const dataset = await createDatasetDB(client, args);
    const datasetId = dataset.dataset_id;

    // 2. Si se selecciona una plantilla, crear los campos
    if (templateKey && templateKey !== 'blank') {
        
        // 🚨 TODO: REEMPLAZAR CON LA LÓGICA PARA OBTENER EL TEMPLATE_ID (UUID) a partir del templateKey (slug)
        // Por ahora, usamos un placeholder.
        const templateId = "f47ac10b-58cc-4372-a567-0e02b2c3d479"; 
        
        if (!templateId) {
            throw { code: "TEMPLATE_NOT_FOUND", message: `La plantilla con key "${templateKey}" no tiene un ID asociado.` };
        }
        
        // **UTILIZAMOS EL templateService.ts para obtener los campos**
        const templateFields: TemplateField[] = await listTemplateFieldsDB(client, templateId);

        if (templateFields.length === 0) {
            throw { code: "TEMPLATE_EMPTY", message: `La plantilla no tiene campos definidos.` };
        }
        
        // 3. Crear cada campo en el nuevo Dataset
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
                relation_target_dataset_id: fieldTemplate.relation_target_template_id, // *Ajuste aquí para usar template_id como destino inicial*
                relation_target_core: fieldTemplate.relation_target_core,
                is_active: true,
            });
        }
    }
    
    // Si no es plantilla, o es plantilla "blank", creamos un campo de ejemplo
    if (templateKey === 'blank' || !templateKey) {
        await createFieldDB(client, {
            dataset_id: datasetId,
            name: "Título/Nombre",
            key: "rec_title", //lo cambié debido a que me tiraba error con que lakey ya estaba en uso.
            type: "text",
            required: true,
            is_active: true,
            position: 0
        });
    }

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
    }, templateKey);

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
  if (!id) { res.status(400).json({ error: "Falta id." }); return; }

  try {
    const row = await updateDatasetDB(pool, id, { name, config, deleted_at });
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


// =============================
// Routes
// =============================
router.get("/", listDatasets);
router.get("/:id", getDataset);
router.post("/", createDataset);
router.patch("/:id", updateDataset);
router.delete("/:id", deleteDataset);
router.get("/:id/general-view", getSnapshot);

export default router;
