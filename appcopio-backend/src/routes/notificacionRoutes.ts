import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { sendEmail, getUserEmailById } from "../services/emailService";
import {
  createNotification as createNotificationService,
  updateStatus as updateStatusService,
  markRead,
  listByUser,
  listByCenter,
  getNotificationById
} from "../services/notificationService";
import type { NotificationStatus } from "../types/notification";

const router = Router();

const allowedStatus = new Set(['queued', 'sent', 'failed']);

// ---------------------------------------------
// POST /notifications  (crear/enviar notificación)
// ---------------------------------------------
const createNotification: RequestHandler = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      center_id,
      activation_id = null,
      destinatary = null,           
      title,
      message,
      event_at = null,
      channel = 'system',
    } = req.body || {};

    if (!center_id || !title || !message) {
      client.release();
      return res.status(400).json({ error: "center_id, title y message son obligatorios" });
    }

    await client.query("BEGIN");
    const row = await createNotificationService(client, {
      center_id,
      activation_id,
      destinatary,
      title,
      message,
      event_at,
      channel,
    });

    // Enviar email
    const toEmail = await getUserEmailById(client, destinatary);
    let emailStatus: "sent" | "skipped" | "failed" = "skipped";
    let emailError: string | undefined;
    if (toEmail) {
      try {
        await sendEmail({
          to: toEmail,
          subject: title,
          text: message,
          html: ""
        });
        emailStatus = "sent";
      } catch (e: any) {
        emailStatus = "failed";
        emailError = e?.message || String(e);
        console.error("[notifications] email send failed:", emailError);
      }
    }
    
    await client.query("COMMIT");
    client.release();
    return res.status(201).json({ 
      data: row, 
      email: emailStatus === "failed" ? { status: emailStatus, error: emailError } : { status: emailStatus } });
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    next(err);
  }
};

// ---------------------------------------------
// PATCH /notifications/:id/status  (actualizar estado)
// body: { status: 'queued'|'sent'|'failed', error?: string }
// ---------------------------------------------
const updateStatus : RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status, error = null, sent_at = null } = req.body || {}; // <-- leer sent_at del body
    if (!id || !status || !allowedStatus.has(status)) {
      return res.status(400).json({ error: "Parámetros inválidos (status debe ser 'queued'|'sent'|'failed')." });
    }
    const row = await updateStatusService(
      pool,
      id,
      status as NotificationStatus,
      error,
      status === 'sent' ? sent_at : null
    );
    return res.json({ data: row });
  } catch (err) {
    if ((err as Error).message === "NOT_FOUND") {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }
    next(err);
  }
};

// ---------------------------------------------
// PATCH /notifications/:id/mark-read  (set read_at)
// body opcional: { read_at: ISO }
// ---------------------------------------------
const markMessageAsRead : RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { read_at = null } = req.body || {};
    const row = await markRead(pool, id, read_at);
    return res.json({ data: row });
  } catch (err) {
    if ((err as Error).message === "NOT_FOUND") {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }
    next(err);
  }
};

// ---------------------------------------------
// GET /notifications/:id  (opcional: obtener por id)
// ---------------------------------------------
const getById: RequestHandler = async (req, res, next) => {
  try {
    const row = await getNotificationById(pool, req.params.id);
    if (!row) return res.status(404).json({ error: "Notificación no encontrada" });
    return res.json({ data: row });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------
// GET /notifications/by-user/:userId
// query: ?limit=&offset=&status=(queued|sent|failed|any)&since=&until=
// ---------------------------------------------
const getByUser: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: "userId inválido" });

    const rows = await listByUser(pool, userId);
    return res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------
// GET /notifications/by-center/:centerId
// query: ?limit=&offset=&status=&since=&until=
// ---------------------------------------------
const getByCenter: RequestHandler = async (req, res, next) => {
  try {
    const centerId = req.params.centerId;
    const rows = await listByCenter(pool, centerId);
    return res.json({ data: rows });    
  } catch (err) {
    next(err);
  }
};

// Mount
router.post("/", createNotification);
router.patch("/:id/status", updateStatus);
router.patch("/:id/mark-read", markMessageAsRead);

router.get("/:id", getById);
router.get("/by-user/:userId", getByUser);
router.get("/by-center/:centerId", getByCenter);

export default router;