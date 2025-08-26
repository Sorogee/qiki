import { extractLinks } from './text.js';

export type AutoModDecision = { status: 'VISIBLE'|'QUEUED', reason?: string };

export function automodEvaluate(input: { body?: string; url?: string; userAgeHours: number }): AutoModDecision {
  const banned = (process.env.AUTOMOD_BANNED_WORDS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const maxLinks = parseInt(process.env.AUTOMOD_MAX_LINKS || '3', 10);
  const queueAge = parseInt(process.env.AUTOMOD_QUEUE_NEW_ACCOUNTS_HOURS || '72', 10);

  const text = (input.body || '') + ' ' + (input.url || '');
  const lower = text.toLowerCase();

  if (banned.length && banned.some(b => lower.includes(b))) {
    return { status: 'QUEUED', reason: 'banned_words' };
  }
  const links = extractLinks(text);
  if (links.length > maxLinks) {
    return { status: 'QUEUED', reason: 'too_many_links' };
  }
  if (input.userAgeHours < queueAge && links.length > 0) {
    return { status: 'QUEUED', reason: 'new_account_with_links' };
  }
  return { status: 'VISIBLE' };
}
