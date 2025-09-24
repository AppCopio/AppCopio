// src/routes/auditLogRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { listAuditLogDB, listAuditLogByDatasetDB } from "../services/auditLogService";
import type { AuditLog } from "../types/dataset";

const router = Router();

// =============================
// Controller
// =============================
export const listAudit: RequestHandler = async (req, res) => {
  const activation_id =
    typeof req.query.activation_id === "string" ? Number(req.query.activation_id) : null;
  const entity_type =
    typeof req.query.entity_type === "string" ? req.query.entity_type : null;
  const entity_id =
    typeof req.query.entity_id === "string" ? req.query.entity_id : null;

  try {
    const items = await listAuditLogDB(pool, { activation_id, entity_type, entity_id });
    res.json({ items });
  } catch (e: any) {
    console.error("listAudit error:", e);
    res.status(500).json({ error: "Error al listar auditoría." });
  }
};

const listAuditByDataset: RequestHandler = async (req, res) => {
  const dataset_id = req.params.dataset_id;
  if (!dataset_id) { 
    res.status(400).json({ error: "Falta dataset_id en la ruta." }); 
    return; 
  }

  try {
    const items = await listAuditLogByDatasetDB(pool, { dataset_id });
    res.json({ items, dataset_id });
  } catch (e: any) {
    console.error("listAuditByDataset error:", e);
    res.status(500).json({ error: "Error al listar auditoría del dataset." });
  }
};

// =============================
// Routes
// =============================
router.get("/", listAudit);
router.get("/:dataset_id", listAuditByDataset);

export default router;
