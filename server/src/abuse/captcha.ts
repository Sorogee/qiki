import crypto from 'crypto';

type Challenge = { id: string; a: number; b: number; op: '+'|'-'; answer: number; expiresAt: number };
const store = new Map<string, Challenge>();

const TTL_MS = Number(process.env.CAPTCHA_TTL_MS || 2*60*1000);

function mkId() { return crypto.randomBytes(16).toString('hex'); }

export function newChallenge() {
  const a = Math.floor(Math.random()*9)+1;
  const b = Math.floor(Math.random()*9)+1;
  const op = Math.random() < 0.5 ? '+' : '-';
  const answer = op === '+' ? a + b : a - b;
  const id = mkId();
  const c: Challenge = { id, a, b, op, answer, expiresAt: Date.now()+TTL_MS };
  store.set(id, c);
  return { id, prompt: `${a} ${op} ${b} = ?` };
}

export function verifyChallenge(id: string, answer: number): boolean {
  const c = store.get(id);
  if (!c) return false;
  if (Date.now() > c.expiresAt) { store.delete(id); return false; }
  const ok = Number(answer) === c.answer;
  store.delete(id); // one-shot
  return ok;
}
