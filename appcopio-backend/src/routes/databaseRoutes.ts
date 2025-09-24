import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { createDatasetDB, getDatasetByIdDB, listDatasetsDB, updateDatasetDB, softDeleteDatasetDB, getDatasetSnapshot } from "../services/databaseService";
import type { Dataset, UUID } from "../types/dataset";

const router = Router();

// Helpers locales (no compartidos)
function parseIntParam(v: any): number | null {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
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
  const { activation_id, center_id, name, key, config } = req.body ?? {};
  if (!activation_id || !center_id || !name || !key) {
    res.status(400).json({ error: "Requiere activation_id, center_id, name, key." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dataset = await createDatasetDB(client, {
      activation_id: Number(activation_id),
      center_id: String(center_id),
      name: String(name),
      key: String(key),
      config: config ?? {},
    });

    await client.query("COMMIT");
    res.status(201).json(dataset);
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("createDataset error:", e);
    if (e.code === "23505") {
      res.status(409).json({ error: "Ya existe un dataset con esa key en la activación." });
    } else {
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
