import nodemailer from "nodemailer";
import type { SendEmailInput } from "../types/email";
import { Db } from "../types/db";

export async function getUserEmailById(db: Db, user_id: string): Promise<string | null> {
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

export async function sendEmail(input: SendEmailInput) {
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

export async function textEmail(input: string) {

}