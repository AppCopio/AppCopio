import { Router } from "express";
import { handleCsvUpload } from "../services/csvService";
import pool from '../config/db';
const router = Router();

/**
 * Recibe: { module: "users", data: Array<Record<string, any>> }
 * Devuelve: { success, message, results: { ... } }
 */
router.post("/", async (req, res) => {
  try {
    const result = await handleCsvUpload(pool, req.body);
    res.json(result);
  } catch (err: any) {
    console.error("csv/upload error", err);
    res.status(500).json({ success: false, message: err?.message || "Error interno" });
  }
});

export default router;
