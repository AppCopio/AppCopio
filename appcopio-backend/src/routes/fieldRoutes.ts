// src/routes/fieldsRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import {
  listFieldsByDatasetDB, createFieldDB, updateFieldDB, moveFieldPositionDB, softDeleteFieldDB,
  listOptionsByFieldDB, createOptionDB, updateOptionDB, softDeleteOptionDB
} from "../services/fieldService";
import { DatasetFieldOption } from "../types/dataset";

const router = Router();

// =============================
// Controllers
// =============================
const listFields: RequestHandler = async (req, res) => {
  const dataset_id = String(req.query.dataset_id ?? "");
  if (!dataset_id) { res.status(400).json({ error: "Falta dataset_id en query." }); return; }
  try {
    const rows = await listFieldsByDatasetDB(pool, dataset_id);
    res.json({ items: rows });
  } catch (e: any) {
    console.error("listFields error:", e);
    res.status(500).json({ error: "Error al listar campos." });
  }
};

const createField: RequestHandler = async (req, res) => {
  const { dataset_id, name, key, type, required, unique_field, config, position,
          is_active, is_multi, relation_target_kind, relation_target_dataset_id, relation_target_core } = req.body ?? {};
  if (!dataset_id || !name || !key || !type) {
    res.status(400).json({ error: "Requiere dataset_id, name, key, type." });
    return;
  }

  try {
    const field = await createFieldDB(pool, {
      dataset_id, name, key, type, required: !!required, unique_field: !!unique_field,
      config: config ?? {}, position: Number(position ?? 0), is_active: is_active !== false,
      is_multi: !!is_multi, relation_target_kind, relation_target_dataset_id, relation_target_core
    });
    res.status(201).json(field);
  } catch (e: any) {
    console.error("createField error:", e);
    if (e.code === "23505") {
      res.status(409).json({ error: "La clave (key) ya existe en campos activos de este dataset." });
    } else if (e.code === "23514") {
      res.status(400).json({ error: "Violación de CHECK (coherencia de relación o tipo)." });
    } else {
      res.status(500).json({ error: "Error al crear campo." });
    }
  }
};

const updateField: RequestHandler = async (req, res) => {
  const field_id = req.params.id;
  if (!field_id) { res.status(400).json({ error: "Falta field_id." }); return; }

  const payload = (req.body ?? {}) as Record<string, any>;
  const toPosition = Number.isInteger(payload.position) ? Number(payload.position) : null;
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (toPosition !== null) {
      await moveFieldPositionDB(client, field_id, toPosition);
      delete payload.position; // ya lo aplicamos por el servicio de mover
    }
    const row = await updateFieldDB(client, field_id, payload);
    await client.query("COMMIT");
    if (!row) { res.status(404).json({ error: "Campo no encontrado." }); return; }
    res.json(row);
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("updateField error:", e);
    if (e.code === "23505") res.status(409).json({ error: "Conflicto de unicidad (key activa)." });
    else if (e.code === "23514") res.status(400).json({ error: "Violación de CHECK (coherencia/formatos)." });
    else res.status(500).json({ error: "Error al actualizar campo." });
  }
   finally {
    client.release();
  }
};
//delete
const deleteField: RequestHandler = async (req, res) => {
  const field_id = req.params.id;
  
  if (!field_id) { 
    res.status(400).json({ error: "Falta field_id." }); 
    return; 
  }
  //el confirm es para la segunda validación
  const confirm = req.query.confirm === 'true' || req.query.confirm === '1';

  try {
    console.log("🗑️ Intentando eliminar campo:", field_id, "confirm:", confirm);
    
    // Llamar a softDeleteFieldDB con el parámetro confirm
    const result = await softDeleteFieldDB(pool, field_id, confirm);
    
    console.log("📊 Resultado de softDeleteFieldDB:", result);

    // Manejar cada estado posible
    if (result.status === 'blocked_required') {
      // ❌ Columna obligatoria - NO se puede eliminar
      console.log("❌ Bloqueado: Columna obligatoria");
      res.status(403).json({ 
        error: result.message || 'No se puede eliminar una columna obligatoria.',
        status: 'blocked_required',
        field_id: result.field_id
      });
      return;
    }

    if (result.status === 'needs_confirmation') {
      // ⚠️ Tiene datos - necesita confirmación (por ahora bloqueamos)
      console.log("⚠️ Necesita confirmación: Columna tiene datos");
      res.status(409).json({ 
        error: result.message || 'La columna contiene datos.',
        status: 'needs_confirmation',
        field_id: result.field_id,
        usage: result.usage
      });
      return;
    }

    if (result.status === 'deleted') {
      // ✅ Eliminado exitosamente
      if (!result.field_id) {
        console.log("❌ Campo no encontrado");
        res.status(404).json({ error: "Campo no encontrado." });
        return;
      }
      
      console.log("✅ Campo eliminado exitosamente:", result.field_id);
      res.json({ 
        message: "Campo eliminado (soft-delete).", 
        field_id: result.field_id,
        status: 'deleted'
      });
      return;
    }

    // Estado inesperado
    console.error("⚠️ Estado inesperado:", result);
    res.status(500).json({ 
      error: "Estado inesperado al eliminar campo.",
      debug: result
    });

  } catch (e: any) {
    console.error("💥 Error crítico al eliminar campo:", e);
    res.status(500).json({ 
      error: "Error interno al eliminar campo.",
      details: e?.message || "Error desconocido"
    });
  }
};

// Options
const listOptions: RequestHandler = async (req, res) => {
  const field_id = String(req.query.field_id ?? "");
  if (!field_id) { res.status(400).json({ error: "Falta field_id en query." }); return; }
  try {
    const rows = await listOptionsByFieldDB(pool, field_id);
    res.json({ items: rows });
  } catch (e: any) {
    console.error("listOptions error:", e);
    res.status(500).json({ error: "Error al listar opciones." });
  }
};

const createOption: RequestHandler<DatasetFieldOption> = async (req, res) => {
  const { field_id, label, value, color, position, is_active } = req.body ?? {};
  if (!field_id || !label || !value) {
    res.status(400).json({ error: "Requiere field_id, label, value." });
    return;
  }
  try {
    const row = await createOptionDB(pool, {
      field_id, label, value: String(value).toLowerCase(), color: color ?? null,
      position: Number(position ?? 0), is_active: is_active !== false
    });
    res.status(201).json(row);
  } catch (e: any) {
    console.error("createOption error:", e);
    if (e.code === "23514") res.status(400).json({ error: "Value debe ser lowercase (CHECK falló)." });
    else if (e.code === "23505") res.status(409).json({ error: "La value ya existe como activa en el campo." });
    else res.status(500).json({ error: "Error al crear opción." });
  }
};

const updateOption: RequestHandler = async (req, res) => {
  const option_id = req.params.option_id;
  if (!option_id) { res.status(400).json({ error: "Falta option_id." }); return; }
  try {
    const row = await updateOptionDB(pool, option_id, req.body ?? {});
    if (!row) { res.status(404).json({ error: "Opción no encontrada." }); return; }
    res.json(row);
  } catch (e: any) {
    console.error("updateOption error:", e);
    if (e.code === "23505") res.status(409).json({ error: "Conflicto de unicidad (value activa)." });
    else if (e.code === "23514") res.status(400).json({ error: "CHECK falló (value en minúsculas)." });
    else res.status(500).json({ error: "Error al actualizar opción." });
  }
};

const deleteOption: RequestHandler = async (req, res) => {
  const option_id = req.params.option_id;
  if (!option_id) { res.status(400).json({ error: "Falta option_id." }); return; }
  try {
    const ok = await softDeleteOptionDB(pool, option_id);
    if (!ok) { res.status(404).json({ error: "Opción no encontrada." }); return; }
    res.json({ message: "Opción eliminada (soft-delete).", option_id });
  } catch (e: any) {
    console.error("deleteOption error:", e);
    res.status(500).json({ error: "Error al eliminar opción." });
  }
};

// =============================
// Routes
// =============================
router.get("/", listFields);
router.post("/", createField);
router.patch("/:id", updateField);
router.delete("/:id", deleteField);

router.get("/options", listOptions);
router.post("/options", createOption);
router.patch("/options/:option_id", updateOption);
router.delete("/options/:option_id", deleteOption);

export default router;
