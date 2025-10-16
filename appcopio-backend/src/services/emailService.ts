import { google } from 'googleapis';
import type { SendEmailInput } from "../types/email";
import type { CenterNotification } from "../types/notification";
import { Db } from "../types/db";

export async function getUserEmailById(db: Db, user_id: number): Promise<string | null> {
  const sql = `
    SELECT email, is_active
    FROM users
    WHERE user_id = $1
    LIMIT 1
  `;
  const { rows } = await db.query(sql, [user_id]);
  if (!rows[0]) return null;
  if (rows[0].is_active !== true) return null; 
  return rows[0].email || null;
}

function escapeHtml(s: string = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function prepareEmail(db: Db,  notif: CenterNotification) : Promise<SendEmailInput | null>{
  // tomará la notificación y preparará el correo :D

  // además, aquí toma el id del usuario y toma el correo para saner a quien enviarlo
  const destinatary = notif.destinatary_id
  console.log(destinatary)
  if(!destinatary) return null;
  const to = await getUserEmailById(db, destinatary);
  console.log(to)
  if (!to) return null;
  const subject = notif.title;
  const text = notif.message;

  const { rows: centerRows } = await db.query(
    `SELECT name FROM Centers WHERE center_id = $1 LIMIT 1`,
    [notif.center_id]
  );
  const center_name = centerRows[0]?.name ?? "";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">
      <p>${escapeHtml(notif.message)}</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0" />
      <p style="font-size:12px;color:#666">
        — AppCopio<br/>
        Notificación del centro: <strong>${escapeHtml(notif.center_id)} - ${escapeHtml(center_name)}</strong>
      </p>
    </div>
  `;

  const input: SendEmailInput = { to, subject, text, html };
  return input;
}

/* ===================== Gmail API (nuevo) ===================== */

// Envío de email 
const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_USER,
  GMAIL_FROM, // opcional
} = process.env;

const oAuth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET
);

oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

function toBase64Url(s: string) {
  return Buffer.from(s)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function encodeHeaderUTF8(s: string) {
  // =?UTF-8?B?<base64>?=
  return /[^\x20-\x7E]/.test(s) ? `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=` : s;
}


/** Replica a Nodemailer: si hay text+html -> multipart/alternative; si no, parte única */
function buildRawMessage({
  from,
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}) {
  const EOL = '\r\n';

  const commonHeaders = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeaderUTF8(subject)}`,
    `MIME-Version: 1.0`,
    `Reply-To: ${replyTo ?? from}`,
  ];

  if (text && html) {
    const boundary = '=_appcopio_alt_' + Math.random().toString(16).slice(2);

    const headers = [
      ...commonHeaders,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].join(EOL);

    const plainPart = [
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      text,
    ].join(EOL);

    const htmlPart = [
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html,
    ].join(EOL);

    const closing = `--${boundary}--`;

    const mime = [headers, '', plainPart, '', htmlPart, '', closing, ''].join(EOL);
    return toBase64Url(mime);
  }

  if (html) {
    const headers = [
      ...commonHeaders,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
    ].join(EOL);
    const mime = [headers, '', html, ''].join(EOL);
    return toBase64Url(mime);
  }

  // Solo texto
  const headers = [
    ...commonHeaders,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
  ].join(EOL);
  const mime = [headers, '', text ?? '', ''].join(EOL);
  return toBase64Url(mime);
}

/** Nuevo envío por Gmail API (HTTPS 443) */
export async function sendEmail(input: SendEmailInput): Promise<{ messageId: string; response: any }> {
  const { to, subject, text, html, replyTo } = input;
  if (!to || !subject || (!text && !html)) {
    throw new Error("Faltan campos: 'to', 'subject' y 'text' o 'html'.");
  }

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const from = GMAIL_FROM || `AppCopio <${GMAIL_USER}>`;

  const raw = buildRawMessage({ from, to, subject, text, html, replyTo });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return {
    messageId: res.data.id ?? '',
    response: res.data,
  };
}