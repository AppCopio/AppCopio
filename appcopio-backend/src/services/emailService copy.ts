import nodemailer from "nodemailer";
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

// Envío de email 
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 465),
  secure: String(SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

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


export async function sendEmail(input: SendEmailInput) : Promise<{ messageId: any, response: any }>{
  const from = SMTP_FROM;;
  const { to, subject, text, html, replyTo } = input;

  if (!to || !subject || (!text && !html)) {
    throw new Error("Faltan campos: 'to', 'subject' y 'text' o 'html'.");
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html,
    replyTo,
  });

  return {
    messageId: info.messageId,
    response: info.response,
  };
}