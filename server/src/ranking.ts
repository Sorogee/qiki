export type RankAlgo = 'hot'|'top'|'new';

export function scoreFromVotes(votes: { type: 'UP'|'DOWN' }[]) {
  let s = 0;
  for (const v of votes) s += (v.type === 'UP' ? 1 : -1);
  return s;
}

/**
 * Hacker News style hot score:
 * rank = (score) / (age_hours + 2)^1.5
 */
export function hotRank(score: number, createdAt: Date) {
  const ageHours = (Date.now() - createdAt.getTime()) / 36e5;
  return score / Math.pow(ageHours + 2, 1.5);
}

export function topRank(score: number) {
  return score;
}
