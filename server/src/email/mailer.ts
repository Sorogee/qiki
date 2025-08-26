type Mail = { to: string; subject: string; html?: string; text?: string };
export async function sendMail(msg: Mail) {
  if (process.env.EMAIL_TRANSPORT === 'console' || process.env.FREE_MODE === 'true') {
    // eslint-disable-next-line no-console
    console.log('[email:console]', { to: msg.to, subject: msg.subject });
    return { ok: true };
  }
  // Placeholder: integrate provider (Resend/Mailgun/etc.) when not in free mode
  // throw new Error('Email provider not configured');
  return { ok: true };
}
