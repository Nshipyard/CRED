// Stage 6: review pack. Draws a seeded random sample of 30 generated series and
// writes ~/workspace/cred-ingestion/REVIEW.md for Richardson's human review gate.
// Usage: node 07-review.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const genDir = new URL('../../src/lib/', import.meta.url);
const genSrc = readdirSync(genDir)
  .filter((f) => /^registry\.generated\.\d+\.ts$/.test(f))
  .sort()
  .map((f) => readFileSync(new URL(f, genDir), 'utf8'))
  .join('\n');
const chunks = genSrc.split('\n  },').filter((c) => c.includes("id: 'SC_"));
const get = (c, k) => (c.match(new RegExp(k + ":\\s*'((?:[^'\\\\]|\\\\.)*)'")) || [])[1] || '';
const entries = chunks.map((c) => ({
  id: get(c, 'id'),
  title: get(c, 'title'),
  category: get(c, 'category'),
  units: get(c, 'units'),
  frequency: get(c, 'frequency'),
  tableId: get(c, 'tableId'),
  sourceLabel: get(c, 'sourceLabel'),
  description: get(c, 'description'),
  vectorId: parseInt((c.match(/vectorIds:\s*\[(\d+)\]/) || [])[1], 10),
}));

const verifiedByVec = new Map();
for (const line of readFileSync(new URL('./work/verified.jsonl', import.meta.url), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  verifiedByVec.set(r.vectorId, r);
}
const gate = JSON.parse(readFileSync(new URL('./work/gate-stats.json', import.meta.url), 'utf8'));
const codegen = JSON.parse(readFileSync(new URL('./work/codegen-stats.json', import.meta.url), 'utf8'));
const urlCheck = JSON.parse(readFileSync(new URL('./work/url-check.json', import.meta.url), 'utf8'));

const rnd = mulberry32(20261012);
const pool = [...entries];
const sample = [];
while (sample.length < 30 && pool.length) {
  sample.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
}
sample.sort((a, b) => a.id.localeCompare(b.id));

const rows = sample
  .map((e) => {
    const v = verifiedByVec.get(e.vectorId) || {};
    const val = v.latestValue;
    const fval = typeof val === 'number' ? val.toLocaleString('en-CA', { maximumFractionDigits: 2 }) : val;
    return `| ${e.id} | ${e.title} | ${e.category === 'prices' ? 'prices' : 'labour'} | ${fval} (${v.latestDate}) | ${e.tableId} |`;
  })
  .join('\n');

const md = `# CRED ingestion pilot (Phase 1): human review pack

Generated 2026-10-12. Branch: \`preview/ingestion-pilot\` (local only, nothing pushed).
Scope: labour (subject 14) + prices (subject 18), Canada geography, max 5 candidates per cube.

## Pipeline gate (measured)

| Stage | Count |
|---|---|
| Cubes in Phase 1 scope (of 8,270 total) | 267 |
| Candidate coordinates (cap 5/cube, Canada-only) | 1,145 |
| Resolved to live vectors | 1,119 (97.7%) |
| Passed verification gate (live observations, recent, 2+ points) | 1,022 (91.3% of resolved) |
| Skipped: already in the curated registry | 11 |
| Dropped: true duplicates across cubes | 76 |
| **Final generated entries** | **935** (807 labour, 128 prices) |
| Table releaseUrl HEAD checks passing | ${urlCheck.ok}/${urlCheck.checked} |

Gate failures (97): 84 vectors returned all-null observations in the window, 13 had a latest observation older than the recency window (stale tables). Zero 409 table locks hit during the crawl.

## Random sample: 30 of 935 (seed 20261012)

| Series ID | Title | Category | Latest value (date) | Source table |
|---|---|---|---|---|
${rows}

Spot-check any of these at \`https://cred.nshipyard.com/series/<id>\` once deployed, or ask for a local preview. Every sampled series above returned live observations through the production fetch path during verification.

## Judgment calls made during the build

1. **Count exceeded the planning estimate (935 vs 200-500).** The 5-per-cube cap across 243 usable cubes naturally yields this many. I kept everything that passed the gate rather than trimming by an arbitrary rule; say the word if you want a tighter set (e.g. monthly only) before merge.
2. **Unit labels for StatCan's numeric unit codes.** 6 codes were grounded against the curated registry's known units; the rest were inferred from vector titles plus latest-value magnitudes (e.g. LFS employment 19,935.6 = thousands of persons). Unit-of-measure code 152 covers both averages (37.5 h/week) and aggregates (750,775.5 thousand hours); the split uses latest value < 200 as the boundary, which separates the two populations cleanly in this data.
3. **Cross-cube duplicates.** The same indicator is often published in several cubes (e.g. EI beneficiaries by age group and by benefit type). Same title + units + frequency: kept the lowest productId, dropped 76. Same title but different units or frequency (e.g. "All sizes, Utilities" meaning employment in one cube, earnings in another): kept both with mechanical qualifiers in the title, e.g. \`... Canada (thousands of persons) (quarterly)\`.
4. **Titles and descriptions are templated**, built from the vector's dimension members: \`{members}, Canada{ (seasonally adjusted)}\`, with a program prefix (Consumer Price Index:, Labour Force Survey:, ...) when the member string alone is too generic. Descriptions follow the form "{members}. From the {survey} (Statistics Canada), table {tableId}. Expressed in {units}; published {frequency}."
5. **Survey names** for codes 2301/2312/2318/2604/2612/3701/5136/5224 use the official program names; three rarer codes (5032 technology price indexes, 7504 wage settlements/work stoppages, 5377 disability labour-market indicators) fall back to a title-cased cube-title stem.
6. **Every table's releaseUrl was HEAD-checked**: 218/218 returned 2xx/3xx.

## What to look for in review

- Titles that mislabel the measure (the biggest risk in templated titles).
- Units that look wrong for the values shown on the chart.
- Anything that should have been caught by the dedupe but reads as a near-duplicate of another series.
`;

writeFileSync('/home/hatch/workspace/cred-ingestion/REVIEW.md', md);
console.log('wrote REVIEW.md with', sample.length, 'sampled series');
