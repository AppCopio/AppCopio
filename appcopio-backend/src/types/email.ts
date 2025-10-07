export type SendEmailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};