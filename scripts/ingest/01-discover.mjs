// Stage 0: discovery. Fetch the full cube list, filter to the pipeline universe.
// Usage: SUBJECTS="36,14,12,18,34,10,33,11" node 01-discover.mjs
// Output: work/cubes.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { wdsGet } from './lib.mjs';

const WORK = new URL('./work/', import.meta.url);
mkdirSync(WORK, { recursive: true });

// Core economic subjects (Phase 2): 36 national accounts, 14 labour,
// 12 trade, 18 prices, 34 housing/construction, 10 gov finance,
// 33 business, 11 income/tax. Extended set (Phase 3) via SUBJECTS env.
const SUBJECTS = new Set((process.env.SUBJECTS || '36,14,12,18,34,10,33,11').split(','));
const FREQS = new Set(['6', '9', '12']); // monthly, quarterly, annual

const { data } = await wdsGet('getAllCubesList');
const subjectsOf = (c) => (Array.isArray(c.subjectCode) ? c.subjectCode : []);
const cubes = data
  .filter(
    (c) =>
      c.archived === '2' &&
      subjectsOf(c).some((s) => SUBJECTS.has(s)) &&
      FREQS.has(String(c.frequencyCode))
  )
  .map((c) => ({
    productId: c.productId,
    titleEn: c.cubeTitleEn,
    titleFr: c.cubeTitleFr,
    subjects: subjectsOf(c),
    frequencyCode: String(c.frequencyCode),
    startDate: c.cubeStartDate,
    endDate: c.cubeEndDate,
    releaseTime: c.releaseTime,
    surveyCode: Array.isArray(c.surveyCode) ? c.surveyCode : [],
  }));

writeFileSync(new URL('./work/cubes.json', import.meta.url), JSON.stringify(cubes, null, 1));
console.log(`cubes: ${data.length} total -> ${cubes.length} in scope [${[...SUBJECTS].join(',')}]`);
