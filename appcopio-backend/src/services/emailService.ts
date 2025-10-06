import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn("[email] Variables SMTP faltantes. Revisa .env");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 465),
  secure: String(SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export type SendEmailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export async function sendEmail(input: SendEmailInput) {
  const from = SMTP_FROM || `AppCopio <${SMTP_USER}>`;
  const { to, subject, text, html, replyTo } = input;

  // Validación mínima sin librerías (opcional pero útil)
  if (!to || !subject || (!text && !html)) {
    throw new Error("Faltan campos: 'to', 'subject' y 'text' o 'html'.");
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html || (text ? `<pre>${escapeHtml(text)}</pre>` : undefined),
    replyTo,
  });

  return {
    messageId: info.messageId,
    response: info.response,
  };
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
