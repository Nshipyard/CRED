// CRED registry verifier. Re-checks every series mapping live.
// Usage: node verify.mjs
// StatCan: GET getDataFromVectorByReferencePeriodRange (quoted comma-joined vector IDs).
// BoC: GET valet/observations/<seriesKey>/json?recent=3.
// Prints PASS/FAIL per series id with the latest value and reference date.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, '..', 'src', 'lib', 'registry.ts'), 'utf8');

// Parse the SERIES array out of registry.ts without a TS toolchain.
function parseSeries(text) {
  const body = text.slice(text.indexOf('export const SERIES'));
  const chunks = body.split(/\n  \},/);
  const out = [];
  for (const c of chunks) {
    const id = (c.match(/id:\s*'([^']+)'/) || [])[1];
    if (!id) continue;
    const source = (c.match(/source:\s*'([^']+)'/) || [])[1];
    const title = (c.match(/title:\s*'([^']+)'/) || [])[1];
    const vm = c.match(/vectorIds:\s*\[([^\]]*)\]/);
    const vectorIds = vm ? vm[1].split(',').map(s => parseInt(s.trim(), 10)).filter(Number.isFinite) : [];
    const valetGroup = (c.match(/valetGroup:\s*'([^']+)'/) || [])[1];
    const valetSeriesKey = (c.match(/valetSeriesKey:\s*'([^']+)'/) || [])[1];
    const frequency = (c.match(/frequency:\s*'([^']+)'/) || [])[1];
    out.push({ id, source, title, vectorIds, valetGroup, valetSeriesKey, frequency });
  }
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function checkStatCan(series) {
  const today = new Date().toISOString().slice(0, 10);
  // Annual series (e.g. CMHC rental vacancy) have one point per year dated
  // January 1, which a 400-day window misses; widen the lookback for them.
  const lookbackDays = series.frequency === 'Annual' ? 1500 : 400;
  const start = new Date(Date.now() - lookbackDays * 864e5).toISOString().slice(0, 10);
  const ids = series.vectorIds.map(v => `"${v}"`).join(',');
  const url = `https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorByReferencePeriodRange` +
    `?vectorIds=${ids}&startRefPeriod=${start}&endReferencePeriod=${today}`;
  const res = await fetch(url);
  if (res.status === 409) return { ok: false, note: 'WDS 409: table locked (nightly refresh window)' };
  if (!res.ok) return { ok: false, note: `WDS HTTP ${res.status}` };
  const data = await res.json();
  const vals = [];
  const items = Array.isArray(data) ? data : [data];
  if (!items.length || !items[0]) return { ok: false, note: 'WDS returned no series (table may be locked)' };
  const byVector = {};
  for (const item of items) {
    if (item.status !== 'SUCCESS' || !item.object) return { ok: false, note: 'WDS item not SUCCESS' };
    const pts = (item.object.vectorDataPoint || []).filter(p => p.value !== null && p.value !== undefined);
    if (!pts.length) return { ok: false, note: `vector ${item.object.vectorId}: no values in range` };
    const last = pts[pts.length - 1];
    byVector[item.object.vectorId] = { date: last.refPer, value: last.value };
    vals.push({ vector: item.object.vectorId, date: last.refPer, value: last.value });
  }
  if (series.vectorIds.length === 2) {
    // Computed series (e.g. trade balance = exports minus imports), in registry vector order.
    const a = byVector[series.vectorIds[0]], b = byVector[series.vectorIds[1]];
    if (!a || !b) return { ok: false, note: 'computed series: a vector returned no values' };
    const bal = a.value - b.value;
    return { ok: true, date: a.date, value: `${a.value} - ${b.value} = ${bal}` };
  }
  return { ok: true, date: vals[0].date, value: vals[0].value };
}

async function checkBoc(series) {
  const url = `https://www.bankofcanada.ca/valet/observations/${series.valetSeriesKey}/json?recent=3`;
  const res = await fetch(url, { headers: { 'User-Agent': 'CRED-registry-verifier' } });
  if (!res.ok) return { ok: false, note: `Valet HTTP ${res.status}` };
  const data = await res.json();
  const obs = (data.observations || []).filter(o => o[series.valetSeriesKey] && o[series.valetSeriesKey].v !== undefined);
  if (!obs.length) return { ok: false, note: 'no observations returned' };
  const last = obs[obs.length - 1];
  return { ok: true, date: last.d, value: last[series.valetSeriesKey].v };
}

const series = parseSeries(src);
let pass = 0, fail = 0;
for (const s of series) {
  try {
    const r = s.source === 'statcan' ? await checkStatCan(s) : await checkBoc(s);
    if (r.ok) { pass++; console.log(`PASS ${s.id} | ${s.title} | ${r.date} = ${r.value}`); }
    else { fail++; console.log(`FAIL ${s.id} | ${s.title} | ${r.note}`); }
  } catch (e) {
    fail++;
    console.log(`FAIL ${s.id} | ${s.title} | ${e.message}`);
  }
  await sleep(1200);
}
console.log(`\n${pass} passed, ${fail} failed, ${series.length} total`);
process.exit(fail ? 1 : 0);
