// Stage 5: codegen. Turns verified vectors into SeriesMeta entries and writes
// src/lib/registry.generated.ts. Validates each table's releaseUrl with a HEAD
// request (cached per productId). Skips vectors already in the curated registry.
//
// Dedupe policy (decided during the pilot build):
// - Vectors already hand-curated: skipped, never duplicated.
// - Same title + same units + same frequency from different cubes (e.g. EI
//   beneficiaries published by age group AND by benefit type): true duplicates,
//   keep the lowest productId, drop the rest.
// - Same title but different units/frequency (e.g. "All sizes, Utilities"
//   meaning employment in one cube and earnings in another): disambiguated with
//   a measure prefix from the cube title, and a frequency qualifier when the
//   frequency is not monthly.
// Usage: node 06-codegen.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { wdsHead, sleep, readJsonl } from './lib.mjs';
import {
  NOISE_PARTS,
  fredCore,
  needsSurveyPrefix,
} from './titles.mjs';

// memberUomCode -> display units. Grounded: 6 codes against the curated
// registry's known units; the rest inferred from vector titles + latest-value
// magnitudes (e.g. LFS employment 19,935.6 = thousands of persons).
const UOM_UNITS = {
  17: 'Index', 21: 'Index', 25: 'Index', 75: 'Dollars',
  77: 'Days', 81: 'Dollars', 178: 'Index', 186: 'Index',
  239: 'Percent', 249: 'Persons', 304: 'Index', 308: 'Years', 347: 'Index',
  348: 'Index', 351: 'Index', 373: 'Index', 374: 'Index', 386: 'Index',
  390: 'Index', 398: 'Index', 401: 'Index', 403: 'Index', 426: 'Index',
  428: 'Thousands of persons', 430: 'Index', 434: 'Index', 435: 'Index',
  455: 'Dollars',
  // Grounded in Phase 2 from titles + latest-value magnitudes against known
  // StatCan conventions (see REVIEW_FULL.md):
  300: 'Units', // housing starts / dwelling-unit counts (annual total 259,028 for 2025)
  387: 'Millions of chained 2017 dollars', // GDP at 2017 constant prices; matches curated GDP_REAL
  272: 'Percent', // debt service ratio, interest only (9.15)
  220: 'Months', // average job tenure (~100 months)
  436: 'Dwellings', // private dwelling counts by housing type
  57: 'Cents per litre', // retail gasoline price (173.8)
  454: 'Index', // Fisher commodity price index component (Footwear, 109)
  68: 'Number', // EI claim counts (initial/renewal claims), NOT persons
};

const SURVEY_NAMES = {
  '2301': 'Consumer Price Index',
  '2312': 'Machinery and Equipment Price Index',
  '2318': 'Industrial Product Price Index',
  '2604': 'Employment Insurance Statistics',
  '2612': 'Survey of Employment, Payrolls and Hours',
  '3701': 'Labour Force Survey',
  '5136': 'For-hire Motor Carrier Freight Services Price Index',
  '5224': 'Freight Rail Services Price Index',
};

const FREQ_NAME = { 6: 'Monthly', 9: 'Quarterly', 12: 'Annual' };
// StatCan 2-digit subject -> CRED category slug. Judgment calls (no exact
// category exists): 10 government finance -> national-accounts (fiscal
// balances live in the macro accounts); 11 income/tax -> population-employment-labour
// (wages and household income). Extended subjects: production-adjacent -> production.
const CATEGORY = {
  14: 'population-employment-labour', 18: 'prices', 36: 'national-accounts',
  12: 'international-trade-investment', 34: 'housing-construction',
  10: 'national-accounts', 33: 'production-business-activity', 11: 'population-employment-labour',
  32: 'production-business-activity', 20: 'production-business-activity',
  25: 'production-business-activity', 16: 'production-business-activity',
  27: 'production-business-activity', 21: 'production-business-activity',
  17: 'population-employment-labour', 46: 'housing-construction',
  43: 'population-employment-labour',
};

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const capfirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function surveyName(r) {
  for (const code of r.surveyCode || []) {
    if (SURVEY_NAMES[code]) return SURVEY_NAMES[code];
  }
  // Fallback: cube title stem, e.g. "Major wage settlements, by jurisdiction..." -> "Major Wage Settlements".
  const stem = r.cubeTitle.split(',')[0].trim().replace(/\s+/g, ' ');
  return stem
    .split(' ')
    .map((w) => (w.length > 3 ? capfirst(w) : w))
    .join(' ');
}

function unitsFor(r) {
  // uom 152 covers both averages (e.g. 37.5 hours/week) and aggregates
  // (e.g. 750,775.5 thousand hours); the latest value separates them cleanly.
  if (r.uom === 152) return r.latestValue < 200 ? 'Hours' : 'Thousands of hours';
  // uom 402 mixes index levels and percent changes in one code; the title
  // always says which ("Real GDP, volume index 2017=100, percent change").
  if (r.uom === 402) return /percent change/i.test(r.titleEn) ? 'Percent' : 'Index';
  // uom 223 is a generic count code (persons AND establishments, vacancies,
  // agreements, weeks). Title decides; count-nouns win over person-words
  // ("Number of exporting establishments, 0 to 499 employees" is a count of
  // establishments, not persons). The cube title is consulted too: vector
  // titles often omit the measure ("Canada;Payroll employees" for job
  // vacancies).
  if (r.uom === 223) {
    const t = `${r.titleEn} ${r.cubeTitle || ''}`;
    if (/person-day/i.test(t)) return 'Days';
    if (/month/i.test(r.titleEn)) return 'Months';
    if (/establishment|stoppage|strike|vacanc|agreement|benefit week|dwelling|permit|outlet/i.test(t)) return 'Number';
    if (/person|employee|employed|population|worker|beneficiar|claimant|member/i.test(r.titleEn)) return 'Persons';
    return 'Number';
  }
  const u = UOM_UNITS[r.uom];
  // Unmapped unit codes: skip the entry and record it (never guess units).
  if (!u) return null;
  return u;
}

function unitsDetailFor(r) {
  // Carry index base years into unitsDetail, e.g. "(2013=100)" -> "Index, 2013=100".
  const hay = [r.titleEn, ...r.members.map((m) => m.name)].join(' ');
  const m = hay.match(/\(([^)]*?=\s*100)\)/);
  if (m && /index/i.test(unitsFor(r))) return `Index, ${m[1].replace(/\s+/g, '')}`;
  if (r.members.some((x) => /^seasonally adjusted/i.test(x.name))) return 'Seasonally adjusted';
  return null;
}

function titleParts(r) {
  const seen = new Set();
  const parts = r.members.filter((m) => {
    if (m.name === 'Canada' || NOISE_PARTS.has(m.name) || /^seasonally adjusted/i.test(m.name)) return false;
    if (seen.has(m.name)) return false; // drop repeated dimension labels
    seen.add(m.name);
    return true;
  });
  return {
    core: parts.map((p) => p.name).join(', '),
    sa: r.members.some((m) => /^seasonally adjusted/i.test(m.name)),
  };
}

function cleanTitleParts(r) {
  let { measureHead, core, sa } = fredCore(r.members);
  if (!core) {
    // Every member was noise (e.g. "Canada; Estimate; Seasonally adjusted"):
    // fall back to the cube's subject stem rather than emitting "Survey: , Canada".
    core = r.cubeTitle.split(',')[0].trim();
  }
  let prefix = '';
  const isCpi = /consumer price/i.test(r.cubeTitle);
  if (isCpi && !/^consumer price index/i.test(core) && !/^cpi\b/i.test(core)) prefix = 'CPI: ';
  else if (!isCpi && needsSurveyPrefix(measureHead, core)) {
    prefix = `${surveyName(r)}: `;
  }
  // Don't double the prefix when the core already leads with it.
  if (prefix && core.toLowerCase().startsWith(prefix.slice(0, -2).toLowerCase())) prefix = '';
  const saPart = sa ? ' (seasonally adjusted)' : '';
  return { prefix, core, saPart, title: `${prefix}${core}, Canada${saPart}` };
}

function buildDescription(r, units, freqName, tableId, survey) {
  const { core, sa } = titleParts(r);
  // Short cores often lost the measure (it lives only in the cube title, e.g.
  // SEPH "Average weekly hours" cubes whose vectors are just "Logging;
  // Excluding overtime"). Re-attach the cube's subject stem in that case.
  const stem = r.cubeTitle.split(',')[0].trim();
  const context = core.length < 50 ? ` ${stem},` : '';
  return (
    `${capfirst(core)}.${context} From the ${survey} (Statistics Canada), table ${tableId}. ` +
    `Expressed in ${units.toLowerCase()}; published ${freqName.toLowerCase()}` +
    `${sa ? '; seasonally adjusted' : ''}.`
  );
}

mkdirSync(new URL('./work/', import.meta.url), { recursive: true });
const verified = readJsonl(new URL('./work/verified.jsonl', import.meta.url).pathname);

// Vectors already hand-curated: never duplicate them.
const regSrc = readFileSync(new URL('../../src/lib/registry.ts', import.meta.url), 'utf8');
const curatedVectors = new Set(
  [...regSrc.matchAll(/vectorIds:\s*\[([^\]]*)\]/g)].flatMap((m) =>
    m[1].split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite)
  )
);
const curatedIds = new Set([...regSrc.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));

// Validate one releaseUrl per table with a HEAD request (results cached in
// work/url-check.json so re-runs don't re-hit the table viewer).
const byProduct = new Map();
for (const r of verified) {
  if (!byProduct.has(r.productId)) byProduct.set(r.productId, r);
}
let urlCache = {};
try {
  const cached = JSON.parse(readFileSync(new URL('./work/url-check.json', import.meta.url), 'utf8'));
  urlCache = cached.perPid || {};
  if (!Object.keys(urlCache).length && cached.bad && cached.bad.length === 0 && cached.checked > 0) {
    // Legacy cache format (all-ok, no per-pid detail): trust it for current pids.
    for (const pid of byProduct.keys()) urlCache[pid] = true;
  }
} catch { /* no cache */ }
const urlOk = {};
for (const [pid] of byProduct) {
  if (pid in urlCache) { urlOk[pid] = urlCache[pid]; continue; }
  const url = `https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=${pid}01`;
  try {
    const res = await wdsHead(url);
    urlOk[pid] = res.status >= 200 && res.status < 400;
  } catch {
    urlOk[pid] = false;
  }
  await sleep(150);
}
const badUrls = [...byProduct.keys()].filter((pid) => !urlOk[pid]);
console.log(`releaseUrl HEAD check: ${byProduct.size - badUrls.length}/${byProduct.size} ok`);

// Dedupe: group by clean title, then resolve collisions.
const fresh = verified.filter((r) => !curatedVectors.has(r.vectorId));
const skippedCurated = verified.length - fresh.length;
// Partition out entries whose unit code is unmapped: record and skip them
// (units are never guessed).
const skippedUom = [];
const usable = [];
for (const r of fresh) {
  if (unitsFor(r) === null) skippedUom.push({ vectorId: r.vectorId, productId: r.productId, uom: r.uom, titleEn: r.titleEn });
  else usable.push(r);
}
writeFileSync(
  new URL('./work/codegen-skipped.jsonl', import.meta.url),
  skippedUom.map((s) => JSON.stringify(s)).join('\n') + (skippedUom.length ? '\n' : '')
);
if (skippedUom.length) console.log(`codegen: ${skippedUom.length} skipped (unmapped uom codes: ${[...new Set(skippedUom.map((s) => s.uom))].join(',')})`);
const groups = new Map();
for (const r of usable) {
  const t = cleanTitleParts(r).title.toLowerCase();
  if (!groups.has(t)) groups.set(t, []);
  groups.get(t).push(r);
}
const kept = [];
let droppedTrueDupes = 0;
for (const [, rs] of groups) {
  // Sub-group by units+frequency: same units+freq = true duplicates.
  const subs = new Map();
  for (const r of rs) {
    const k = `${unitsFor(r)}|${r.frequencyCode}`;
    if (!subs.has(k)) subs.set(k, []);
    subs.get(k).push(r);
  }
  const winners = [...subs.values()].map((g) =>
    g.sort((a, b) => a.productId - b.productId)[0]
  );
  droppedTrueDupes += rs.length - winners.length;
  if (winners.length === 1) {
    kept.push({ r: winners[0], title: cleanTitleParts(winners[0]).title });
  } else {
    // Genuinely different series sharing member names: append mechanical
    // qualifiers (units and/or frequency). Always truthful, never guessed.
    const unitsDiffer = new Set(winners.map((w) => unitsFor(w))).size > 1;
    const seen = new Set();
    for (const w of winners.sort((a, b) => a.productId - b.productId)) {
      const p = cleanTitleParts(w);
      const quals = [];
      if (unitsDiffer) quals.push(unitsFor(w).toLowerCase());
      if (w.frequencyCode !== '6') quals.push(FREQ_NAME[w.frequencyCode].toLowerCase());
      const title = quals.length
        ? `${p.prefix}${p.core}, Canada${p.saPart} (${quals.join('; ')})`
        : p.title;
      if (seen.has(title.toLowerCase())) { droppedTrueDupes++; continue; }
      seen.add(title.toLowerCase());
      kept.push({ r: w, title });
    }
  }
}

const entries = [];
for (const { r, title } of kept.sort((a, b) => a.r.productId - b.r.productId || a.r.vectorId - b.r.vectorId)) {
  const survey = surveyName(r);
  const units = unitsFor(r);
  const freqName = FREQ_NAME[r.frequencyCode] ?? 'Monthly';
  const id = `SC_${r.productId}_${r.vectorId}`;
  if (curatedIds.has(id)) { droppedTrueDupes++; continue; }
  const tableId = `${String(r.productId).slice(0, 2)}-${String(r.productId).slice(2, 4)}-${String(r.productId).slice(4)}-01`;
  const url = `https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=${r.productId}01`;
  const detail = unitsDetailFor(r);
  entries.push(
    [
      '  {',
      `    id: ${q(id)},`,
      `    title: ${q(title)},`,
      `    originalTitle: ${q(r.titleEn)}, // raw StatCan label: provenance + search alias`,
      `    source: 'statcan',`,
      `    sourceLabel: ${q(`Statistics Canada, ${survey}`)},`,
      `    release: ${q(survey)},`,
      `    releaseUrl: ${q(url)},`,
      `    sourceUrl: ${q(url)},`,
      `    tableId: ${q(tableId)},`,
      `    vectorIds: [${r.vectorId}],`,
      `    units: ${q(units)},`,
      detail ? `    unitsDetail: ${q(detail)},` : null,
      `    frequency: ${q(freqName)},`,
      `    category: ${q(CATEGORY[r.subjects[0]])},`,
      `    description: ${q(buildDescription(r, units, freqName, tableId, survey))},`,
      `    lastVerified: ${q(r.verifiedOn)},`,
      `    autoGenerated: true,`,
      '  },',
    ]
      .filter(Boolean)
      .join('\n')
  );
}

const header = `// GENERATED FILE — do not edit by hand.
// Produced by scripts/ingest/06-codegen.mjs from ${verified.length} verified StatCan WDS vectors.
// Every entry passed the live verification gate (see data/verification-report.md).
// Re-running the pipeline overwrites this file.
import type { SeriesMeta } from './registry';
`;
// TypeScript cannot represent the union of 8,000+ object literals in one
// array (TS2590), so entries are split into ~1,000-entry chunk files and
// re-exported concatenated. Each chunk stays well under the limit.
const CHUNK = 1000;
const nChunks = Math.ceil(entries.length / CHUNK);
const partNames = [];
for (let i = 0; i < nChunks; i++) {
  const part = entries.slice(i * CHUNK, (i + 1) * CHUNK);
  const name = `GENERATED_SERIES_PART${i}`;
  partNames.push(name);
  writeFileSync(
    new URL(`../../src/lib/registry.generated.${i}.ts`, import.meta.url),
    `${header}\nexport const ${name}: SeriesMeta[] = [\n${part.join('\n')}\n];\n`
  );
}
writeFileSync(
  new URL('../../src/lib/registry.generated.ts', import.meta.url),
  `${header}\n${partNames.map((n, i) => `import { ${n} } from './registry.generated.${i}';`).join('\n')}\n\nexport const GENERATED_SERIES: SeriesMeta[] = [\n${partNames.map((n) => `  ...${n},`).join('\n')}\n];\n`
);
writeFileSync(
  new URL('./work/url-check.json', import.meta.url),
  JSON.stringify({ checked: byProduct.size, ok: byProduct.size - badUrls.length, bad: badUrls, perPid: urlOk }, null, 1)
);
writeFileSync(
  new URL('./work/codegen-stats.json', import.meta.url),
  JSON.stringify(
    { verified: verified.length, skippedCurated, droppedTrueDupes, entries: entries.length },
    null, 1
  )
);
console.log(`codegen: ${entries.length} entries (${skippedCurated} already-curated skipped, ${droppedTrueDupes} true-dupe vectors dropped)`);
if (badUrls.length) console.log('releaseUrl HEAD failures:', badUrls.join(', '));
