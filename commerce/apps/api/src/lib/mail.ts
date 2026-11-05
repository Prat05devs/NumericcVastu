import {env} from '../config/env.js';
import {logger} from './logger.js';

export type Mail = {to: string; subject: string; text: string; tag: string; html?: string; replyTo?: string};

/**
 * Mail adapter. "log" keeps messages in a small in-memory dev mailbox (never in production); "smtp" uses
 * SMTP_URL (pending credential); "disabled" drops mail. Callers never block a commerce write on mail.
 */
const mailbox: (Mail & {at: string})[] = [];
export const devMailbox = () => mailbox.slice(-50);
export const clearDevMailbox = () => { mailbox.length = 0; };

let transport: {sendMail: (m: object) => Promise<unknown>} | null = null;
async function smtp() {
  if (transport) return transport;
  const url = env().SMTP_URL;
  if (!url) throw new Error('SMTP_URL is not set');
  const nodemailer = await import('nodemailer');
  transport = nodemailer.createTransport(url);
  return transport;
}

export async function sendMail(mail: Mail): Promise<void> {
  const driver = env().MAIL_DRIVER;
  if (driver === 'disabled') return;
  if (driver === 'log') {
    mailbox.push({...mail, at: new Date().toISOString()});
    if (mailbox.length > 200) mailbox.shift();
    logger.info({tag: mail.tag}, 'mail captured by log driver');
    return;
  }
  await (await smtp()).sendMail({from: env().MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text, ...(mail.html && {html: mail.html}), ...(mail.replyTo && {replyTo: mail.replyTo})});
}
