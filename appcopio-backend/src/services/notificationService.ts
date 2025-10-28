import { Db } from "../types/db";
import type { CenterNotification, NotificationStatus, CreateNotificationInput, ListOpts } from "../types/notification";
import type { EmailStatus } from "../types/email";
import { sendEmail, prepareEmail } from "../services/emailService";

export async function sendNotification(db: Db, input: CreateNotificationInput)
: Promise< { data: CenterNotification; email: { status: EmailStatus; error?: string} } > {
  const notification = await createNotification(db, input);
  //console.log(notification)
  let emailStatus: EmailStatus = "skipped";
  let emailError: string | undefined;

  const emailContent = await prepareEmail(db, notification);
  //console.log(emailContent)
  try {
    if (!emailContent) {
      emailStatus = "skipped";
    } else {
      await sendEmail(emailContent);
      emailStatus = "sent";
    }
  } catch (e: any) {
    emailStatus = "failed";
    emailError = e?.message || String(e);
    console.error("[notifications] email send failed:", emailError);
  }
  return { 
    data: notification, 
    email: emailStatus === "failed" ? { status: emailStatus, error: emailError } : { status: emailStatus }
  };
}

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

  // crear notificación en BD
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

  const r = rows[0];

  // Helpers mínimos para fechas → ISO
  const toIso = (v: any): string => {
    if (!v) return new Date().toISOString();
    if (v instanceof Date) return v.toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };
  const toIsoOrNull = (v: any): string | null => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const out: CenterNotification = {
    notification_id: String(r.notification_id),
    center_id: String(r.center_id),
    center_name: '', // sin JOIN no lo tenemos
    activation_id: r.activation_id ?? null,
    destinatary_id: r.destinatary ?? null, // renombrado desde 'destinatary'
    destinatary_name: '', // sin JOIN no lo tenemos
    title: r.title,
    message: r.message,
    event_at: toIso(r.event_at),
    channel: r.channel,
    status: (r.status ?? 'queued') as NotificationStatus, // por si la tabla tiene default
    sent_at: toIsoOrNull(r.sent_at),
    read_at: toIsoOrNull(r.read_at),
    error: r.error ?? null,
    created_at: toIso(r.created_at),
    updated_at: toIsoOrNull(r.updated_at),
  };

  return out;
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
// Normalización segura
  const limit  = Number.isFinite(opts.limit as any) ? Math.min(Math.max(1, Number(opts.limit)), 200) : 50;
  const offset = Number.isFinite(opts.offset as any) ? Math.max(0, Number(opts.offset)) : 0;

  // Filtros como parámetros (NULL = desactivado)
  const statusParam = opts.status && opts.status !== 'any' ? opts.status : null;
  const sinceParam  = opts.since ?? null;
  const untilParam  = opts.until ?? null;

  const q = `
    SELECT
      cn.notification_id,
      cn.center_id,
      COALESCE(c.name, '') AS center_name,
      cn.activation_id,
      cn.destinatary,
      ''::text AS user_name,                           -- no unimos Users aquí
      cn.title,
      cn.message,
      cn.event_at,
      cn.channel,
      cn.status,
      cn.sent_at,
      cn.read_at,
      cn.error,
      cn.created_at,
      cn.updated_at
    FROM CenterNotifications AS cn
    LEFT JOIN Centers AS c
      ON c.center_id = cn.center_id
    WHERE cn.destinatary = $1
      AND ($2::text        IS NULL OR cn.status     = $2)
      AND ($3::timestamptz IS NULL OR cn.created_at >= $3)
      AND ($4::timestamptz IS NULL OR cn.created_at <  $4)
    ORDER BY COALESCE(cn.event_at, cn.created_at) DESC, cn.created_at DESC
    LIMIT $5 OFFSET $6;
  `;

  const params = [user_id, statusParam, sinceParam, untilParam, limit, offset];
  const { rows } = await db.query(q, params);
  return rows;
}

export async function listByCenter(
  db: Db,
  center_id: string,
  opts: ListOpts = {}
): Promise<CenterNotification[]> {
 // Normalización segura
  const limit  = Number.isFinite(opts.limit as any) ? Math.min(Math.max(1, Number(opts.limit)), 200) : 50;
  const offset = Number.isFinite(opts.offset as any) ? Math.max(0, Number(opts.offset)) : 0;

  // Filtros como parámetros (NULL = desactivado)
  const statusParam = opts.status && opts.status !== 'any' ? opts.status : null;
  const sinceParam  = opts.since ?? null;
  const untilParam  = opts.until ?? null;

  const q = `
    SELECT
      cn.notification_id,
      cn.center_id,
      ''::text AS center_name,      
      cn.activation_id,
      cn.destinatary,
      COALESCE(u.nombre, u.username, '') AS user_name,
      cn.title,
      cn.message,
      cn.event_at,
      cn.channel,
      cn.status,
      cn.sent_at,
      cn.read_at,
      cn.error,
      cn.created_at,
      cn.updated_at
    FROM CenterNotifications AS cn
    LEFT JOIN Users AS u
      ON u.user_id = cn.destinatary
    WHERE cn.center_id = $1
      AND ($2::text        IS NULL OR cn.status     = $2)
      AND ($3::timestamptz IS NULL OR cn.created_at >= $3)
      AND ($4::timestamptz IS NULL OR cn.created_at <  $4)
    ORDER BY COALESCE(cn.event_at, cn.created_at) DESC, cn.created_at DESC
    LIMIT $5 OFFSET $6;
  `;

  const params = [center_id, statusParam, sinceParam, untilParam, limit, offset];
  const { rows } = await db.query(q, params);
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