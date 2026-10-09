// Borrow, don't warehouse: observations are fetched live from StatCan WDS
// and the Bank of Canada Valet API, cached in memory for 24 hours with
// stale-while-revalidate, and never stored in the repo.

import { getSeries } from './registry';

export interface Observation {
  date: string; // ISO yyyy-mm-dd
  value: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  fetchedAt: number;
  data: Observation[];
  error?: string;
  refreshing: boolean;
}

const cache = new Map<string, CacheEntry>();

const STATCAN_WDS = 'https://www150.statcan.gc.ca/t1/wds/rest';

interface StatCanDataPoint {
  refPer: string;
  value: number | string | null;
}

interface StatCanVectorResponse {
  status: string;
  object: {
    vectorDataPoint: StatCanDataPoint[];
  };
}

function refPerToISO(refPer: string): string | null {
  // "2026-09-01" -> "2026-09-01"; "2026-Q2" -> "2026-04-01"; "2026-01-01"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(refPer);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const q = /^(\d{4})-Q([1-4])$/.exec(refPer);
  if (q) {
    const month = (Number(q[2]) - 1) * 3 + 1;
    return `${q[1]}-${String(month).padStart(2, '0')}-01`;
  }
  const y = /^(\d{4})$/.exec(refPer);
  if (y) return `${y[1]}-01-01`;
  return null;
}

async function fetchStatCan(vectorIds: number[]): Promise<Observation[]> {
  // getDataFromVectorByReferencePeriodRange is a GET whose vectorIds are
  // quoted and comma-joined: ?vectorIds="41690973","2062815"&startRefPeriod=...
  const ids = vectorIds.map((v) => `"${v}"`).join(',');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const url =
    `${STATCAN_WDS}/getDataFromVectorByReferencePeriodRange` +
    `?vectorIds=${encodeURIComponent(ids)}` +
    `&startRefPeriod=1900-01-01&endReferencePeriod=${tomorrow}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CRED/1.0 (open-data project; 1 req/day/series)' },
  });
  if (!res.ok) throw new Error(`StatCan WDS returned HTTP ${res.status}`);
  const payload = (await res.json()) as StatCanVectorResponse[];
  const byDate = new Map<string, number>();
  let sawSuccess = false;
  for (const block of payload) {
    if (block.status !== 'SUCCESS') continue;
    sawSuccess = true;
    for (const point of block.object?.vectorDataPoint ?? []) {
      if (point.value === null || point.value === undefined) continue;
      const iso = refPerToISO(point.refPer);
      if (!iso) continue;
      const v = Number(point.value);
      if (Number.isNaN(v)) continue;
      const prev = byDate.get(iso);
      // Sum across vectors when a series maps to several component vectors.
      byDate.set(iso, prev === undefined ? v : prev + v);
    }
  }
  if (!sawSuccess) {
    throw new Error(
      'StatCan WDS returned no usable data blocks (table may be refreshing)'
    );
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// BoC asks for restrained use; serialize all Valet calls through one queue
// and rely on the 24h cache so each series is fetched at most once a day.
let bocQueue: Promise<void> = Promise.resolve();

function bocFetch(input: string): Promise<Response> {
  const run = bocQueue.then(() =>
    fetch(input, {
      headers: { 'User-Agent': 'CRED/1.0 (open-data project; 1 req/day/series)' },
    })
  );
  bocQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

interface BocObservation {
  d: string;
  [key: string]: string | { v: string } | undefined;
}

async function fetchBoC(seriesKey: string): Promise<Observation[]> {
  const res = await bocFetch(
    `https://www.bankofcanada.ca/valet/observations/${seriesKey}/json`
  );
  if (!res.ok) throw new Error(`BoC Valet returned HTTP ${res.status}`);
  const payload = (await res.json()) as { observations: BocObservation[] };
  const out: Observation[] = [];
  for (const ob of payload.observations ?? []) {
    const cell = ob[seriesKey];
    if (typeof cell !== 'object' || cell === null) continue;
    const v = parseFloat(cell.v);
    if (Number.isNaN(v)) continue;
    out.push({ date: ob.d, value: v });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

async function refresh(seriesId: string): Promise<CacheEntry> {
  const series = getSeries(seriesId);
  if (!series) throw new Error(`Unknown series: ${seriesId}`);
  const data =
    series.source === 'statcan'
      ? await fetchStatCan(series.vectorIds ?? [])
      : await fetchBoC(series.valetSeriesKey ?? '');
  return { fetchedAt: Date.now(), data, refreshing: false };
}

/**
 * Live observations for a series, ascending by date, filtered to [from, to].
 * 24h in-memory cache with stale-while-revalidate: a stale entry is served
 * immediately while a background refresh fills the next request.
 */
export async function getObservations(
  seriesId: string,
  from?: string,
  to?: string
): Promise<{ observations: Observation[]; cached: boolean; asOf: string }> {
  const entry = cache.get(seriesId);

  if (!entry) {
    const next = await refresh(seriesId);
    cache.set(seriesId, next);
    return {
      observations: filterRange(next.data, from, to),
      cached: false,
      asOf: new Date(next.fetchedAt).toISOString(),
    };
  }

  const fresh = Date.now() - entry.fetchedAt < CACHE_TTL_MS;

  if (!fresh && !entry.refreshing) {
    entry.refreshing = true;
    refresh(seriesId)
      .then((next) => cache.set(seriesId, next))
      .catch(() => {
        entry.refreshing = false;
      });
  }

  return {
    observations: filterRange(entry.data, from, to),
    cached: fresh,
    asOf: new Date(entry.fetchedAt).toISOString(),
  };
}

function filterRange(
  data: Observation[],
  from?: string,
  to?: string
): Observation[] {
  return data.filter(
    (o) => (!from || o.date >= from) && (!to || o.date <= to)
  );
}
