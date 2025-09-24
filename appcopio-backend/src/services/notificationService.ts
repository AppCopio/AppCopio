import pool from "../config/db";
import { Db } from "../types/db";
import type { CenterNotification, NotificationStatus, CreateNotificationInput, ListOpts } from "../types/notification";

export async function createNotification(input: CreateNotificationInput): Promise<CenterNotification> {
  const {
    center_id,
    activation_id = null,
    destinatary = null,
    title,
    message,
    event_at,
    channel = 'system',
  } = input;

  const q = `
    INSERT INTO "CenterNotifications"
      (center_id, activation_id, destinatary, title, message, event_at, channel)
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()), $7)
    RETURNING *;
  `;
  const { rows } = await pool.query(q, [
    center_id,
    activation_id,
    destinatary,
    title,
    message,
    event_at ?? null,
    channel,
  ]);
  return rows[0];
}

export async function updateStatus (notification_id: string, status: NotificationStatus, error?: string | null) : Promise<CenterNotification> {
  // Nota: el CHECK de la tabla valida los valores
  const q = `
    UPDATE "CenterNotifications"
       SET status = $2,
           error = COALESCE($3, error),
           updated_at = now()
     WHERE notification_id = $1
     RETURNING *;
  `;
  const { rows } = await pool.query(q, [notification_id, status, error ?? null]);
  if (!rows[0]) throw new Error("NOT_FOUND");
  return rows[0];
}

export async function markSent(notification_id: string, sent_at?: Date | string): Promise<CenterNotification> {
  const q = `
    UPDATE "CenterNotifications"
       SET status = 'sent',
           sent_at = COALESCE($2, now()),
           updated_at = now()
     WHERE notification_id = $1
     RETURNING *;
  `;
  const { rows } = await pool.query(q, [notification_id, sent_at ?? null]);
  if (!rows[0]) throw new Error("NOT_FOUND");
  return rows[0];
}

export async function markRead(notification_id: string, read_at?: Date | string): Promise<CenterNotification> {
  const q = `
    UPDATE "CenterNotifications"
       SET read_at = COALESCE($2, now()),
           updated_at = now()
     WHERE notification_id = $1
     RETURNING *;
  `;
  const { rows } = await pool.query(q, [notification_id, read_at ?? null]);
  if (!rows[0]) throw new Error("NOT_FOUND");
  return rows[0];
}



export async function listByUser(user_id: number, opts: ListOpts = {}): Promise<CenterNotification[]> {
  const q = `
    SELECT *
      FROM "CenterNotifications"
     WHERE destinatary = $1
     ORDER BY created_at DESC, event_at DESC;
  `;
  const { rows } = await pool.query(q, [user_id]);
  return rows;
}

export async function listByCenter(center_id: string, opts: ListOpts = {}): Promise<CenterNotification[]> {
  const q = `
    SELECT *
      FROM "CenterNotifications"
     WHERE center_id = $1
     ORDER BY created_at DESC, event_at DESC;
  `;
  const { rows } = await pool.query(q, [center_id]);
  return rows;
}

export async function getNotificationById(notification_id: string): Promise<CenterNotification | null> {
  const q = `SELECT * FROM "CenterNotifications" WHERE notification_id = $1;`;
  const { rows } = await pool.query(q, [notification_id]);
  return rows[0] ?? null;
}