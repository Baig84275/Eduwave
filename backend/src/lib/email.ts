import nodemailer from "nodemailer";
import { getEnv } from "./env";

export type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
};

// Email delivery is environment-driven:
// - If SMTP_* is configured, send real emails.
// - Otherwise, log the email payload to stdout (useful for local dev).
export async function sendEmail(options: SendEmailOptions) {
  const env = getEnv();
  const from = env.EMAIL_FROM ?? "no-reply@eduwave.local";

  const hasSmtp = Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);
  if (!hasSmtp) {
    console.log("[email:noop]", { from, to: options.to, subject: options.subject, text: options.text });
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });

  await transporter.sendMail({ from, to: options.to, subject: options.subject, text: options.text });
  return { delivered: true };
}

