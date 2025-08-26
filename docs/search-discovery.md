# Search & Discovery (Run #19)

## Query Expansion
- We expand user queries using a lightweight synonym map (`src/search/synonyms.json`). This is a pragmatic, explainable booster and surfaces an `appliedSynonyms` object to the UI.

## Ranking
- Final score: `0.55*text + 0.25*log1p(votes+2*comments) + 0.20*exp(-ageHours/72)`.
- OpenSearch: normalize by top-hit score. Postgres: use a default text baseline (0.6).

## Trending
- Redis ZSETs store trending **queries**, **posts**, **communities** over ~48h (key TTLs). Endpoints to fetch the top slices.

## Saved Searches
- `SavedSearch` unique per (user, query, communitySlug). API to save/list/remove.
- (Future) set up a daily job to notify about new matches via the existing notification system.

## Telemetry
- `SearchEvent` captures both queries and clicks to analyze CTR and refine ranking later.
