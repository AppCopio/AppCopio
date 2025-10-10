// src/routes/templatesRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import {
  listTemplatesDB, getTemplateDB, createTemplateDB, updateTemplateDB,
  listTemplateFieldsDB, createTemplateFieldDB, updateTemplateFieldDB, deleteTemplateFieldDB
} from "../services/templateService";

import { requireUser } from "../auth/requireUser";
import { requireAuth } from '../auth/middleware';

const router = Router();

// =============================
// Controllers
// =============================
const listTemplates: RequestHandler = async (_req, res) => {
  try {
    const rows = await listTemplatesDB(pool);
    res.json({ items: rows });
  } catch (e: any) {
    console.error("listTemplates error:", e);
    res.status(500).json({ error: "Error al listar plantillas." });
  }
};

const getTemplate: RequestHandler = async (req, res) => {
  const id = req.params.id;
  if (!id) { res.status(400).json({ error: "Falta template_id." }); return; }
  try {
    const row = await getTemplateDB(pool, id);
    if (!row) { res.status(404).json({ error: "Plantilla no encontrada." }); return; }
    const fields = await listTemplateFieldsDB(pool, id);
    res.json({ ...row, fields });
  } catch (e: any) {
    console.error("getTemplate error:", e);
    res.status(500).json({ error: "Error al obtener plantilla." });
  }
};

const createTemplate: RequestHandler = async (req, res) => {
  const { name, description, is_public } = req.body ?? {};
  const userId = requireUser(req).user_id;
  if (!name) { res.status(400).json({ error: "Falta name." }); return; }
  try {
    const row = await createTemplateDB(pool, userId, { name, description: description ?? null, is_public: !!is_public });
    res.status(201).json(row);
  } catch (e: any) {
    console.error("createTemplate error:", e);
    res.status(500).json({ error: "Error al crear plantilla." });
  }
};

const updateTemplate: RequestHandler = async (req, res) => {
  const template_id = req.params.id;
  if (!template_id) { res.status(400).json({ error: "Falta template_id." }); return; }
  try {
    const row = await updateTemplateDB(pool, template_id, req.body ?? {});
    if (!row) { res.status(404).json({ error: "Plantilla no encontrada." }); return; }
    res.json(row);
  } catch (e: any) {
    console.error("updateTemplate error:", e);
    res.status(500).json({ error: "Error al actualizar plantilla." });
  }
};

// TemplateFields
const listTemplateFields: RequestHandler = async (req, res) => {
  const template_id = String(req.query.template_id ?? "");
  if (!template_id) { res.status(400).json({ error: "Falta template_id." }); return; }
  try {
    const rows = await listTemplateFieldsDB(pool, template_id);
    res.json({ items: rows });
  } catch (e: any) {
    console.error("listTemplateFields error:", e);
    res.status(500).json({ error: "Error al listar columnas de plantilla." });
  }
};

const createTemplateField: RequestHandler = async (req, res) => {
  const { template_id, name, key, field_type, is_required, is_multi, position, settings,
          relation_target_kind, relation_target_template_id, relation_target_core } = req.body ?? {};
  if (!template_id || !name || !key || !field_type) {
    res.status(400).json({ error: "Requiere template_id, name, key, field_type." });
    return;
  }
  try {
    const row = await createTemplateFieldDB(pool, {
      template_id, name, key, field_type,
      is_required: !!is_required, is_multi: !!is_multi,
      position: Number(position ?? 0), settings: settings ?? {},
      relation_target_kind, relation_target_template_id, relation_target_core
    });
    res.status(201).json(row);
  } catch (e: any) {
    console.error("createTemplateField error:", e);
    if (e.code === "23505") res.status(409).json({ error: "La key ya existe en esta plantilla." });
    else if (e.code === "23514") res.status(400).json({ error: "Violación de CHECK (coherencia/formatos)." });
    else res.status(500).json({ error: "Error al crear columna de plantilla." });
  }
};

const updateTemplateField: RequestHandler = async (req, res) => {
  const template_field_id = req.params.id;
  if (!template_field_id) { res.status(400).json({ error: "Falta template_field_id." }); return; }
  try {
    const row = await updateTemplateFieldDB(pool, template_field_id, req.body ?? {});
    if (!row) { res.status(404).json({ error: "Columna de plantilla no encontrada." }); return; }
    res.json(row);
  } catch (e: any) {
    console.error("updateTemplateField error:", e);
    if (e.code === "23505") res.status(409).json({ error: "Conflicto de unicidad (key)." });
    else if (e.code === "23514") res.status(400).json({ error: "Violación de CHECK (coherencia/formatos)." });
    else res.status(500).json({ error: "Error al actualizar columna de plantilla." });
  }
};

const deleteTemplateField: RequestHandler = async (req, res) => {
  const template_field_id = req.params.id;
  if (!template_field_id) { res.status(400).json({ error: "Falta template_field_id." }); return; }
  try {
    const ok = await deleteTemplateFieldDB(pool, template_field_id);
    if (!ok) { res.status(404).json({ error: "Columna de plantilla no encontrada." }); return; }
    res.json({ message: "Columna de plantilla eliminada.", template_field_id });
  } catch (e: any) {
    console.error("deleteTemplateField error:", e);
    res.status(500).json({ error: "Error al eliminar columna de plantilla." });
  }
};

// =============================
// Routes
// =============================
router.get("/", listTemplates);
router.get("/:id", getTemplate);
router.post("/", requireAuth, createTemplate);
router.patch("/:id", requireAuth, updateTemplate);

router.get("/fields/list", listTemplateFields);
router.post("/fields", createTemplateField);
router.patch("/fields/:id", updateTemplateField);
router.delete("/fields/:id", deleteTemplateField);

export default router;
