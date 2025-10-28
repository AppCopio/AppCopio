import { Router, RequestHandler } from "express";
import pool from "../config/db";
import {
  createRecordDB, getRecordDB, listRecordsDB, updateRecordDB, softDeleteRecordDB
} from "../services/recordService";

import { requireUser } from "../auth/requireUser";
import { requireAuth } from '../auth/middleware';

const router = Router();

// Helpers locales
function isObject(o: any) { return o && typeof o === "object" && !Array.isArray(o); }

// =============================
// Controllers
// =============================
const listRecords: RequestHandler = async (req, res) => {
  const dataset_id = String(req.query.dataset_id ?? "");
  if (!dataset_id) { res.status(400).json({ error: "Falta dataset_id." }); return; }
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  // Filtros simples: qData (json) → usa @>
  let qData: any = null;
  if (req.query.qData) {
    try { qData = JSON.parse(String(req.query.qData)); }
    catch { res.status(400).json({ error: "qData debe ser JSON válido." }); return; }
    if (!isObject(qData)) { res.status(400).json({ error: "qData debe ser objeto JSON." }); return; }
  }

  try {
    const rows = await listRecordsDB(pool, { dataset_id, limit, offset, qData });
    res.json({ items: rows, limit, offset });
  } catch (e: any) {
    console.error("listRecords error:", e);
    res.status(500).json({ error: "Error al listar registros." });
  }
};

const getRecord: RequestHandler = async (req, res) => {
  const id = req.params.id;
  if (!id) { res.status(400).json({ error: "Falta record id." }); return; }
  try {
    const row = await getRecordDB(pool, id);
    if (!row) { res.status(404).json({ error: "Registro no encontrado." }); return; }
    res.json(row);
  } catch (e: any) {
    console.error("getRecord error:", e);
    res.status(500).json({ error: "Error al obtener registro." });
  }
};

const createRecord: RequestHandler = async (req, res) => {
  const { dataset_id, activation_id, data, select_values, relations_dynamic, relations_core } = req.body ?? {};
  const userId = requireUser(req).user_id;

  if (!dataset_id || !activation_id || !isObject(data)) {
    res.status(400).json({ error: "Requiere dataset_id, activation_id y data (objeto)." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const record = await createRecordDB(client, userId,{
      dataset_id, activation_id: Number(activation_id), data: data ?? {},
      select_values: select_values ?? {},                 // { field_id: [option_id, ...] } o { field_id: option_id }
      relations_dynamic: relations_dynamic ?? [],         // [ { field_id, target_record_id } ... ]
      relations_core: relations_core ?? []                // [ { field_id, target_core, target_id } ... ]
    });
    await client.query("COMMIT");
    res.status(201).json(record);
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("createRecord error:", e);
    if (e.code === "23503") res.status(400).json({ error: "FK inválida (dataset/activation/field/option/record)." });
    else if (e.code === "23514") res.status(400).json({ error: "Violación de CHECK (tipos/coherencia)." });
    else res.status(500).json({ error: "Error al crear registro." });
  } finally {
    client.release();
  }
};

const updateRecord: RequestHandler = async (req, res) => {
  const record_id = req.params.id;
  const userId = requireUser(req).user_id;
  if (!record_id) { res.status(400).json({ error: "Falta record id." }); return; }
  const { version, data, select_values, relations_dynamic, relations_core } = req.body ?? {};
  if (!Number.isInteger(version)) {
    res.status(400).json({ error: "Se requiere version (optimistic locking int)." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await updateRecordDB(client, userId,{
      record_id, version, data: data ?? null,
      select_values: select_values ?? null,
      relations_dynamic: relations_dynamic ?? null,
      relations_core: relations_core ?? null
    });
    await client.query("COMMIT");

    if (!row) { res.status(409).json({ error: "Conflicto de versión o registro no encontrado." }); return; }
    res.json(row);
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("updateRecord error:", e);
    if (e.code === "23514") res.status(400).json({ error: "Violación de CHECK (tipos/coherencia)." });
    else res.status(500).json({ error: "Error al actualizar registro." });
  } finally {
    client.release();
  }
};

const deleteRecord: RequestHandler = async (req, res) => {
  const record_id = req.params.id;
  if (!record_id) { res.status(400).json({ error: "Falta record id." }); return; }
  try {
    const ok = await softDeleteRecordDB(pool, record_id);
    if (!ok) { res.status(404).json({ error: "Registro no encontrado." }); return; }
    res.json({ message: "Registro eliminado (soft-delete).", record_id });
  } catch (e: any) {
    console.error("deleteRecord error:", e);
    res.status(500).json({ error: "Error al eliminar registro." });
  }
};

// =============================
// Routes
// =============================
router.get("/", listRecords);
router.get("/:id", getRecord);
router.post("/", requireAuth, createRecord);
router.patch("/:id", requireAuth, updateRecord);
router.delete("/:id", deleteRecord);

export default router;
