// Stage 4: verification gate. Every candidate must return live observations
// through the production fetch path or it does not count. Mirrors data/verify.mjs.
// Usage: node 05-verify.mjs
// Output: work/verified.jsonl, work/gate-stats.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { wdsGet, sleep, readJsonl, appendJsonl } from './lib.mjs';

const BATCH = 20;
const WINDOW_DAYS = { 6: 400, 9: 700, 12: 1500 }; // monthly, quarterly, annual
const ROOT = new URL('./', import.meta.url);
mkdirSync(new URL('./work/', import.meta.url), { recursive: true });

const resolved = readJsonl(new URL('./work/resolved.jsonl', import.meta.url).pathname);
const doneIds = new Set(
  readJsonl(new URL('./work/verified.jsonl', import.meta.url).pathname).map((r) => r.vectorId)
);
const todo = resolved.filter((r) => !doneIds.has(r.vectorId));
console.log(`verifying ${todo.length} vectors (${resolved.length - todo.length} already done)`);

const today = new Date().toISOString().slice(0, 10);
const stats = { pass: 0, fail: 0, reasons: {}, locked: 0 };

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const byVec = new Map(batch.map((r) => [r.vectorId, r]));
  const start = new Date(Date.now() - 1500 * 864e5).toISOString().slice(0, 10); // widest window; per-freq recency checked below
  const ids = batch.map((r) => `"${r.vectorId}"`).join(',');
  let res;
  try {
    res = await wdsGet(
      `getDataFromVectorByReferencePeriodRange?vectorIds=${ids}&startRefPeriod=${start}&endReferencePeriod=${today}`
    );
  } catch (e) {
    console.log(`batch ${i / BATCH}: ${String(e).slice(0, 100)} (skipped, rerun resumes)`);
    await sleep(2000);
    continue;
  }
  if (res.locked) {
    stats.locked += batch.length;
    await sleep(1000);
    continue;
  }
  const fail = (r, reason) => {
    stats.fail++;
    stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
    appendJsonl(new URL('./work/verify-failures.jsonl', import.meta.url).pathname, {
      vectorId: r.vectorId, productId: r.productId, reason,
    });
  };
  for (const item of res.data || []) {
    const r = byVec.get(item?.object?.vectorId);
    if (!r) continue;
    if (item.status !== 'SUCCESS' || !item.object) { fail(r, 'not-success'); continue; }
    const pts = (item.object.vectorDataPoint || []).filter(
      (p) => p.value !== null && p.value !== undefined
    );
    if (pts.length < 2) { fail(r, pts.length === 0 ? 'all-null' : 'single-point'); continue; }
    const last = pts[pts.length - 1];
    const windowDays = WINDOW_DAYS[r.frequencyCode] ?? 400;
    const cutoff = new Date(Date.now() - windowDays * 864e5).toISOString().slice(0, 10);
    if (last.refPer < cutoff) { fail(r, `stale (latest ${last.refPer})`); continue; }
    stats.pass++;
    await appendJsonl(new URL('./work/verified.jsonl', import.meta.url).pathname, {
      ...r,
      latestDate: last.refPer,
      latestValue: last.value,
      nObs: pts.length,
      verifiedOn: today,
    });
  }
  // Vectors with no response item at all:
  const seen = new Set((res.data || []).map((x) => x?.object?.vectorId));
  for (const r of batch) {
    if (!seen.has(r.vectorId) && !doneIds.has(r.vectorId)) fail(r, 'no-response-item');
  }
  await sleep(500);
}

writeFileSync(
  new URL('./work/gate-stats.json', import.meta.url),
  JSON.stringify({ ...stats, verifiedTotal: stats.pass, runOn: today }, null, 1)
);
console.log('gate:', JSON.stringify(stats));
