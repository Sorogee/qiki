/**
 * Time-decay "hot" ranking similar to Reddit:
 * score = (ups - downs) / ( (ageHours + 2) ^ 1.8 )
 */
export function hotScore(ups: number, downs: number, createdAt: Date) {
  const votes = (ups || 0) - (downs || 0);
  const ageH = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 36e5);
  const denom = Math.pow(ageH + 2, 1.8);
  return (votes) / denom;
}
export function topScore(ups: number, downs: number) {
  return (ups || 0) - (downs || 0);
}
