// Stage 2: candidate generation. Applies the per-dimension picker rules to each
// cube's metadata and emits up to CAP coordinates per cube, priority-ordered.
// Usage: node 03-candidates.mjs
// Output: work/candidates.jsonl
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { padCoord, readJsonl } from './lib.mjs';

const CAP = parseInt(process.env.CAP || '20', 10); // per-cube candidate cap (Phase 2: 20)

const HEADLINE = /^(all-items|total\b|all\b)/i;
const NOISE_GEO = /^canada/i;

function memberPriority(name) {
  if (HEADLINE.test(name.trim())) return 0;
  return 1000 + name.length; // shorter names ~ higher-level aggregates
}

function classifyDim(dim) {
  const names = dim.members.map((m) => m.name);
  if (/geograph/i.test(dim.name) || names.some((n) => n === 'Canada')) return 'geo';
  if (/seasonal/i.test(dim.name) || names.some((n) => /seasonally adjusted/i.test(n))) return 'sa';
  if (names.some((n) => n === 'Estimate')) return 'est';
  return 'other';
}

function pickMembers(dim, kind) {
  if (kind === 'geo') {
    const c = dim.members.find((m) => m.name === 'Canada');
    return c ? [c] : [];
  }
  if (kind === 'sa') {
    const sa = dim.members.filter((m) => /^seasonally adjusted/i.test(m.name));
    return sa.length ? sa : dim.members; // NSA-only cube: keep all
  }
  if (kind === 'est') return dim.members.filter((m) => m.name === 'Estimate');
  return [...dim.members].sort(
    (a, b) => memberPriority(a.name) - memberPriority(b.name) || a.name.localeCompare(b.name)
  );
}

mkdirSync(new URL('./work/', import.meta.url), { recursive: true });
const cubesById = new Map(
  JSON.parse(readFileSync(new URL('./work/cubes.json', import.meta.url), 'utf8')).map((c) => [
    c.productId,
    c,
  ])
);
const metas = readJsonl(new URL('./work/meta.jsonl', import.meta.url).pathname).filter(
  (m) => !m.locked && !m.error && m.dims
);
const out = createWriteStream(new URL('./work/candidates.jsonl', import.meta.url));
let cubesUsed = 0, skipped = 0, skippedReasons = {};
let total = 0;

for (const meta of metas) {
  const kinds = meta.dims.map(classifyDim);
  const picked = meta.dims.map((d, i) => pickMembers(d, kinds[i]));
  const emptyIdx = picked.findIndex((p) => p.length === 0);
  if (emptyIdx !== -1) {
    skipped++;
    const k = `dim[${meta.dims[emptyIdx].name}] empty after pick (${kinds[emptyIdx]})`;
    skippedReasons[k] = (skippedReasons[k] || 0) + 1;
    continue;
  }
  // Cartesian product with priority = sum of member priorities.
  let combos = [{ ids: [], members: [], pri: 0 }];
  for (let di = 0; di < picked.length; di++) {
    const next = [];
    for (const c of combos) {
      for (const m of picked[di]) {
        next.push({
          ids: [...c.ids, String(m.id)],
          members: [...c.members, { dim: meta.dims[di].name, id: m.id, name: m.name }],
          pri: c.pri + memberPriority(m.name),
        });
      }
    }
    combos = next;
  }
  combos.sort((a, b) => a.pri - b.pri);
  const chosen = combos.slice(0, CAP);
  for (const c of chosen) {
    out.write(JSON.stringify({
      productId: meta.productId,
      coord: padCoord(c.ids),
      members: c.members,
      cubeTitle: meta.titleEn,
      frequencyCode: meta.frequencyCode,
      subjects: cubesById.get(meta.productId)?.subjects ?? [],
      surveyCode: cubesById.get(meta.productId)?.surveyCode ?? [],
    }) + '\n');
    total++;
  }
  cubesUsed++;
}
out.end();
console.log(`candidates: ${total} from ${cubesUsed} cubes, ${skipped} cubes skipped`);
console.log('skip reasons:', JSON.stringify(skippedReasons, null, 1));
