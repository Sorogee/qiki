let cachedToken: string | null = null;
let expiresAt = 0;
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export async function getCsrf() {
  const now = Date.now();
  if (cachedToken && now < expiresAt) return cachedToken;
  const res = await fetch(`${API}/auth/csrf`);
  const data = await res.json();
  cachedToken = data.token;
  expiresAt = now + (data.expiresIn || 900) * 1000 - 5000;
  return cachedToken!;
}

export async function withCsrfHeaders(init: RequestInit = {}): Promise<RequestInit> {
  const t = await getCsrf();
  return { ...init, headers: { ...(init.headers || {}), 'X-CSRF-Token': t } };
}
