import { Db } from "../types/db";
import type {
  CenterNotification,
  NotificationStatus,
  CreateNotificationInput,
  ListOpts
} from "../types/notification";

export async function createNotification(db: Db, input: CreateNotificationInput): Promise<CenterNotification> {
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
    INSERT INTO CenterNotifications
      (center_id, activation_id, destinatary, title, message, event_at, channel)
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()), $7)
    RETURNING *;
  `;
  const { rows } = await db.query(q, [
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

export async function updateStatus(
  db: Db,
  notification_id: string,
  status: NotificationStatus,
  error?: string | null,
  sent_at?: Date | string | null
): Promise<CenterNotification> {
  let q: string;
  let params: any[];

  if (status === 'sent') {
    q = `
      UPDATE CenterNotifications
         SET status = $2,
             error = COALESCE($3, error),
             sent_at = COALESCE($4, now()),
             updated_at = now()
       WHERE notification_id = $1
       RETURNING *;
    `;
    params = [notification_id, status, error ?? null, sent_at ?? null];
  } else {
    q = `
      UPDATE CenterNotifications
         SET status = $2,
             error = COALESCE($3, error),
             updated_at = now()
       WHERE notification_id = $1
       RETURNING *;
    `;
    params = [notification_id, status, error ?? null];
  }

  const { rows } = await db.query(q, params);
  if (!rows[0]) throw new Error("NOT_FOUND");
  return rows[0];
}

export async function markRead(
  db: Db,
  notification_id: string,
  read_at?: Date | string
): Promise<CenterNotification> {
  const q = `
    UPDATE CenterNotifications
       SET read_at = COALESCE($2, now()),
           updated_at = now()
     WHERE notification_id = $1
     RETURNING *;
  `;
  const { rows } = await db.query(q, [notification_id, read_at ?? null]);
  if (!rows[0]) throw new Error("NOT_FOUND");
  return rows[0];
}

export async function listByUser(
  db: Db,
  user_id: number,
  opts: ListOpts = {}
): Promise<CenterNotification[]> {
  const q = `
    SELECT *
      FROM CenterNotifications
     WHERE destinatary = $1
     ORDER BY created_at DESC, event_at DESC;
  `;
  const { rows } = await db.query(q, [user_id]);
  return rows;
}

export async function listByCenter(
  db: Db,
  center_id: string,
  opts: ListOpts = {}
): Promise<CenterNotification[]> {
  const q = `
    SELECT *
      FROM CenterNotifications
     WHERE center_id = $1
     ORDER BY created_at DESC, event_at DESC;
  `;
  const { rows } = await db.query(q, [center_id]);
  return rows;
}

export async function getNotificationById(
  db: Db,
  notification_id: string
): Promise<CenterNotification | null> {
  const q = `SELECT * FROM CenterNotifications WHERE notification_id = $1;`;
  const { rows } = await db.query(q, [notification_id]);
  return rows[0] ?? null;
}