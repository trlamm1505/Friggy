/**
 * mailer.ts — Nodemailer transporter cho Email Service
 *
 * Brevo SMTP:
 *   - Dev:  smtp.brevo.com:587 (không cần whitelist IP)
 *   - Prod: smtp-relay.brevo.com:587 (cần whitelist IP VPS)
 *
 * Credentials lấy tại: https://app.brevo.com → SMTP & API → SMTP
 */
import * as nodemailer from 'nodemailer';
import {
  EMAIL_HOST,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  FRONTEND_URL,
} from '../constant/app.constant';

export const transporter = nodemailer.createTransport({
  host: EMAIL_HOST ?? 'smtp.brevo.com',
  port: 587,
  secure: false, // false = STARTTLS trên port 587
  auth: {
    user: EMAIL_USER ?? '',
    pass: EMAIL_PASS ?? '',
  },
});

export const MAIL_FROM = `"Friggy 🥬" <${EMAIL_FROM}>`;
export const APP_URL = FRONTEND_URL ?? 'https://friggy.vn';
