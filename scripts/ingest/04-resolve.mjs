// Stage 3: vector resolution. Batched getSeriesInfoFromCubePidCoord (~50/request).
// Keeps SUCCESS responses with terminated = 0. Resumable via work/resolved.jsonl.
// Usage: node 04-resolve.mjs
import { createWriteStream, mkdirSync } from 'node:fs';
import { wdsPost, sleep, readJsonl, appendJsonl } from './lib.mjs';

const BATCH = 50;
const ROOT = new URL('./', import.meta.url);
mkdirSync(new URL('./work/', import.meta.url), { recursive: true });

const cands = readJsonl(new URL('./work/candidates.jsonl', import.meta.url).pathname);
const doneCoords = new Set(
  readJsonl(new URL('./work/resolved.jsonl', import.meta.url).pathname).map(
    (r) => r.productId + '|' + r.coord
  )
);
const todo = cands.filter((c) => !doneCoords.has(c.productId + '|' + c.coord));
console.log(`resolving ${todo.length} coordinates (${cands.length - todo.length} already done)`);

const out = createWriteStream(new URL('./work/resolved.jsonl', import.meta.url), { flags: 'a' });
let ok = 0, dead = 0, locked = 0;

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  let r;
  try {
    r = await wdsPost(
      'getSeriesInfoFromCubePidCoord',
      batch.map((c) => ({ productId: c.productId, coordinate: c.coord }))
    );
  } catch (e) {
    console.log(`batch ${i / BATCH}: ${String(e).slice(0, 100)} (skipped, rerun resumes)`);
    await sleep(2000);
    continue;
  }
  if (r.locked) {
    locked += batch.length;
    await sleep(1000);
    continue;
  }
  const byCoord = new Map(batch.map((c) => [`${c.productId}|${c.coord}`, c]));
  for (const item of r.data || []) {
    const o0 = item?.object || {};
    const c = byCoord.get(`${o0.productId}|${o0.coordinate}`);
    if (!c) continue;
    const o = o0;
    if (item.status === 'SUCCESS' && o.vectorId && Number(o.terminated) === 0) {
      out.write(JSON.stringify({
        productId: c.productId,
        coord: c.coord,
        members: c.members,
        cubeTitle: c.cubeTitle,
        frequencyCode: c.frequencyCode,
        subjects: c.subjects,
        surveyCode: c.surveyCode,
        vectorId: o.vectorId,
        titleEn: o.SeriesTitleEn,
        titleFr: o.SeriesTitleFr,
        decimals: o.decimals,
        uom: o.memberUomCode,
        terminated: o.terminated,
      }) + '\n');
      ok++;
    } else {
      dead++;
    }
  }
  await sleep(400);
}
out.end();
console.log(`resolved: ${ok} live vectors, ${dead} dead/terminated, ${locked} locked`);
