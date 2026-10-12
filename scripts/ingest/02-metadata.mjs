// Stage 1: per-cube metadata. One getCubeMetadata call per cube, polite delays,
// 409s recorded for retry (table locked during the nightly refresh window).
// Usage: node 02-metadata.mjs
// Output: work/meta.jsonl (one row per cube: productId, dims, nbSeriesCube, ...)
// Skips cubes already present in work/meta.jsonl (resumable).
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { wdsPost, sleep, readJsonl } from './lib.mjs';

const ROOT = new URL('./', import.meta.url);
mkdirSync(new URL('./work/', import.meta.url), { recursive: true });
const cubes = JSON.parse(readFileSync(new URL('./work/cubes.json', import.meta.url), 'utf8'));
const done = new Set(readJsonl(new URL('./work/meta.jsonl', import.meta.url).pathname).map((r) => r.productId));
const out = createWriteStream(new URL('./work/meta.jsonl', import.meta.url), { flags: 'a' });

let fetched = 0, locked = 0, failed = 0;
for (const cube of cubes) {
  if (done.has(cube.productId)) continue;
  try {
    const r = await wdsPost('getCubeMetadata', [{ productId: cube.productId }]);
    if (r.locked) {
      locked++;
      out.write(JSON.stringify({ productId: cube.productId, locked: true }) + '\n');
    } else {
      const m = r.data[0].object;
      out.write(JSON.stringify({
        productId: cube.productId,
        titleEn: m.cubeTitleEn,
        frequencyCode: String(m.frequencyCode),
        nbSeriesCube: m.nbSeriesCube,
        releaseTime: m.releaseTime,
        surveyCode: m.surveyCode,
        dims: m.dimension.map((d) => ({
          name: d.dimensionNameEn,
          members: d.member.map((x) => ({ id: x.memberId, name: x.memberNameEn })),
        })),
      }) + '\n');
      fetched++;
    }
  } catch (e) {
    failed++;
    out.write(JSON.stringify({ productId: cube.productId, error: String(e).slice(0, 160) }) + '\n');
  }
  await sleep(700);
}
console.log(`metadata: ${fetched} ok, ${locked} locked(409), ${failed} failed, ${done.size} already done`);
