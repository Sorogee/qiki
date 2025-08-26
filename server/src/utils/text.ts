export function extractMentions(text: string): string[] {
  if (!text) return [];
  const re = /(^|\s)@([a-zA-Z0-9_]{2,32})\b/g;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    set.add(m[2]);
  }
  return Array.from(set);
}

export function extractLinks(text: string): string[] {
  if (!text) return [];
  const re = /(https?:\/\/[^\s)]+)|(www\.[^\s)]+)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[0]);
  }
  return out;
}
