import { Router, RequestHandler } from "express";
import {
  createNotification,
  updateStatus,
  markSent,
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
  try {
    // requireUser asegura autenticación; opcional: verificar permisos del rol
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
      return res.status(400).json({ error: "center_id, title y message son obligatorios" });
    }

    const row = await createNotification({
      center_id,
      activation_id,
      destinatary,
      title,
      message,
      event_at,
      channel,
    });

    return res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------
// PATCH /notifications/:id/status  (actualizar estado)
// body: { status: 'queued'|'sent'|'failed', error?: string }
// ---------------------------------------------
const actualizarEstado : RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status, error = null } = req.body || {};
    if (!id || !status || !allowedStatus.has(status)) {
      return res.status(400).json({ error: "Parámetros inválidos (status debe ser 'queued'|'sent'|'failed')." });
    }
    const row = await updateStatus(id, status as NotificationStatus, error);
    return res.json({ data: row });
  } catch (err) {
    if ((err as Error).message === "NOT_FOUND") {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }
    next(err);
  }
};

// ---------------------------------------------
// PATCH /notifications/:id/mark-sent  (set sent_at y status='sent')
// body opcional: { sent_at: ISO }
// ---------------------------------------------
const marcarLeido : RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { sent_at = null } = req.body || {};
    const row = await markSent(id, sent_at);
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
const marcarEnviado : RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { read_at = null } = req.body || {};
    const row = await markRead(id, read_at);
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
    const row = await getNotificationById(req.params.id);
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

    const rows = await listByUser(userId);
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
    const rows = await listByCenter(centerId);
    return res.json({ data: rows });    
  } catch (err) {
    next(err);
  }
};

// Mount
router.post("/notifications", createNotification);
router.patch("/notifications/:id/status", actualizarEstado);
router.patch("/notifications/:id/mark-sent", marcarEnviado);
router.patch("/notifications/:id/mark-read", marcarLeido);

router.get("/notifications/:id", getById);
router.get("/notifications/by-user/:userId", getByUser);
router.get("/notifications/by-center/:centerId", getByCenter);

export default router;