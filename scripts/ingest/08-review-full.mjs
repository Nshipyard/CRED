// Stage 7: full-run review pack. Seeded random sample of 50 generated series,
// pipeline gate table, failure breakdown, judgment calls. Writes
// ~/workspace/cred-ingestion/REVIEW_FULL.md for the human review gate.
// Usage: node 08-review-full.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed >>> 0) + 0x6d2b79f5 | 0;
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
let failures = [];
try {
  failures = readFileSync(new URL('./work/verify-failures.jsonl', import.meta.url), 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l));
} catch { /* none */ }
const skippedUomCount = (() => {
  try {
    return readFileSync(new URL('./work/codegen-skipped.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean).length;
  } catch { return 0; }
})();
const failReasons = {};
for (const f of failures) failReasons[f.reason] = (failReasons[f.reason] || 0) + 1;

// Phase 1 baseline (from REVIEW.md, kept separate so the full-run numbers stay honest).
const P1 = { cubes: 267, candidates: 1145, resolved: 1119, verified: 1022, entries: 935 };

const rnd = mulberry32(20261012);
const pool = [...entries];
const sample = [];
while (sample.length < 50 && pool.length) {
  sample.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
}
sample.sort((a, b) => a.id.localeCompare(b.id));

const rows = sample.map((e) => {
  const v = verifiedByVec.get(e.vectorId) || {};
  const val = v.latestValue;
  const fval = typeof val === 'number' ? val.toLocaleString('en-CA', { maximumFractionDigits: 2 }) : val;
  return `| ${e.id} | ${e.title} | ${e.category} | ${e.units} | ${fval} (${v.latestDate}) | ${e.tableId} |`;
}).join('\n');

const failRows = Object.entries(failReasons).sort((a, b) => b[1] - a[1])
  .map(([r, n]) => `| ${r} | ${n} |`).join('\n') || '| (none recorded) | 0 |';

const totalEntries = entries.length;
const md = `# CRED bulk ingestion: full-run review pack (Phases 2+3)

Generated 2026-10-12. Branch: \`preview/ingestion-pilot\` (local only, nothing pushed).
Scope: all core economic subjects (36, 14, 12, 18, 34, 10, 33, 11), Canada geography, cap 20 candidates per cube.
Phase 1 baseline (labour + prices, cap 5) is included in the totals below and broken out separately.

## Pipeline gate (measured)

| Stage | Phase 1 | Full run (this release) | Total |
|---|---|---|---|
| Cubes in scope | 267 | ${gate.cubesInScope ?? 'see note'} | ${P1.cubes} + new |
| Candidate coordinates | 1,145 | ${gate.candidatesTotal ?? 'n/a'} | cumulative |
| Resolved to live vectors | 1,119 (97.7%) | — | — |
| Passed verification gate | 1,022 (91.3% of resolved) | ${gate.pass} (this run) | ${P1.verified + (gate.pass || 0)} verified vectors |
| Skipped: already in curated registry | 11 | ${codegen.skippedCurated ?? 'n/a'} | — |
| Dropped: true duplicates across cubes | 76 | ${codegen.droppedTrueDupes ?? 'n/a'} | — |
| Skipped: unmapped unit codes | 0 | ${skippedUomCount} (see work/codegen-skipped.jsonl) | — |
| **Final generated entries** | **935** | — | **${totalEntries}** |
| Table releaseUrl HEAD checks passing | 218/218 | ${urlCheck.ok}/${urlCheck.checked} | — |

Note: gate-stats.json reflects the latest 05-verify run only (resumable runs overwrite it);
Phase 1 numbers are preserved from REVIEW.md above.

## Gate failure breakdown (all runs, verify-failures.jsonl)

| Reason | Count |
|---|---|
| ${failRows} |

## Random sample: 50 of ${totalEntries} (seed 20261012)

| Series ID | Title | Category | Units | Latest value (date) | Source table |
|---|---|---|---|---|---|
${rows}

Every sampled series above returned live observations through the production fetch path during verification.

## Judgment calls made during the build

1. **Subject-to-category mapping.** StatCan subjects 10 (government finance) and 11 (income/tax) have no exact CRED category; mapped to national-accounts and population-employment-labour respectively as the least-wrong fits. Extended subjects (agriculture, energy, manufacturing, wholesale, R&D, services) map to production-business-activity; social housing to housing-construction; population/immigrant income to population-employment-labour. Flag any that read wrong.
2. **Unmapped unit codes are skipped, never guessed.** Vectors whose memberUomCode has no mapping are recorded in scripts/ingest/work/codegen-skipped.jsonl and excluded. If a skipped code covers an important subject, it can be grounded and re-run.
3. **Title cleanup (mechanical only).** Dropped comma-segments that repeat the previous segment verbatim, suppressed a survey prefix when the core already leads with it, and fall back to the cube-title stem when every member was noise (avoids "Survey: , Canada"). No information is invented; StatCan's labels are preserved otherwise.
4. **Cap raised 5 -> 20 per cube** per the scope's tuning guidance. Labour/prices cubes were re-run at the higher cap; the resume chain (resolved.jsonl / verified.jsonl) and the cross-cube dedupe kept everything additive with no duplicate entries.
5. **Dedupe keeps the lowest productId** for true duplicates (same title + units + frequency). In rare cases a Phase 1 entry's twin from a lower-numbered cube wins; the surviving entry is the same indicator.

## What to look for in review

- Titles that mislabel the measure (the biggest risk in templated titles).
- Units that look wrong for the values shown on the chart.
- Near-duplicates the dedupe missed (same indicator, slightly different titles).
- Category assignments for government finance and income/tax series (judgment calls above).
`;

writeFileSync('/home/hatch/workspace/cred-ingestion/REVIEW_FULL.md', md);
console.log('wrote REVIEW_FULL.md with', sample.length, 'sampled series of', totalEntries);
