import sanitizeHtml from 'sanitize-html';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:3000`;

export function tplVerify(username: string, url: string) {
  const u = sanitizeHtml(username || '', { allowedTags: [], allowedAttributes: {} });
  return {
    subject: `Verify your Qikiworld email`,
    text: `Hi ${u},\n\nPlease verify your email: ${url}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>Hi ${u},</p><p>Please verify your email: <a href="${url}">${url}</a></p><p>If you didn't request this, ignore this email.</p>`
  };
}

export function tplReset(username: string, url: string) {
  const u = sanitizeHtml(username || '', { allowedTags: [], allowedAttributes: {} });
  return {
    subject: `Reset your Qikiworld password`,
    text: `Hi ${u},\n\nReset your password using this link: ${url}\nThis link expires soon.`,
    html: `<p>Hi ${u},</p><p>Reset your password using this link: <a href="${url}">${url}</a></p><p>This link expires soon.</p>`
  };
}

type DigestItem = { type: string; createdAt: string; body?: string; title?: string };
export function tplDigest(username: string, freq: 'DAILY'|'WEEKLY', items: DigestItem[]) {
  const u = sanitizeHtml(username || '', { allowedTags: [], allowedAttributes: {} });
  const lines = items.map(i => `• ${i.type} at ${new Date(i.createdAt).toLocaleString()}`).join('\n');
  const text = `Hi ${u},\n\nHere is your ${freq.toLowerCase()} Qikiworld digest:\n\n${lines || 'No new updates.'}\n\nVisit: ${SITE}`;
  const htmlItems = items.map(i => `<li>${i.type} — ${new Date(i.createdAt).toLocaleString()}</li>`).join('');
  const html = `<p>Hi ${u},</p><p>Here is your <b>${freq.toLowerCase()}</b> Qikiworld digest:</p><ul>${htmlItems || '<li>No new updates.</li>'}</ul><p><a href="${SITE}">Open Qikiworld</a></p>`;
  return { subject: `Your ${freq.toLowerCase()} Qikiworld digest`, text, html };
}
