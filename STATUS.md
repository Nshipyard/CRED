# CRED build status

## What is stubbed

- `src/lib/registry.ts` is a 3-entry STUB (UNRATE_CA, CPI_CA, POLICY_RATE) with
  placeholder vector IDs and Valet keys. The coordinator will swap in the
  sibling agent's verified registry; then `tsc --noEmit` and `next build` get
  re-run until green. Every page, route, and component reads the registry only
  through `getSeries` / `searchSeries` / `REGISTRY`, so the swap is one file.

## What is real

- `src/lib/data.ts`: live StatCan WDS + BoC Valet fetchers, 24h in-memory cache
  with stale-while-revalidate, serialized BoC requests (rate-limit friendly).
- `src/lib/recessions.ts`: C.D. Howe peak/trough dates, 5 post-1970 episodes.
- `src/lib/vintages.ts`: Blob-or-local NDJSON snapshot store.
- API routes: `/api/series` (search), `/api/series/[id]`, `/api/observations`
  (from/to filters, cache metadata), `/api/categories` (live counts),
  `/api/vintages` (snapshot listing), `/api/cron/snapshot` (x-vercel-cron or
  Bearer CRON_SECRET, else 401; maxDuration 300).
- Pages: `/` (hero, trending pills, browse-by, 3 live featured charts),
  `/series/[id]` (breadcrumb, FRED 5-cell meta bar, chart panel with range
  pills, date inputs, Edit Graph popover, CSV download, fullscreen, share,
  notes), `/categories` (8 cards, live counts), `/search` (live search),
  `/news` (4 scaffold articles, marked illustrative where shown), `/about`
  (What is CRED, sources table, tutorials note, digital badges honest
  placeholder, naming strip, contact via GitHub issues), `/api-docs`
  (endpoint reference + Phase-2 MCP tool mapping).
- `vercel.json`: daily cron `0 12 * * *` on `/api/cron/snapshot`.
- Style: Archivo Black + Roboto, paper/ink/#d80621 palette, hairlines,
  rounded cards. No em dashes, no lorem ipsum.

## What remains

- Verified registry swap (sibling agent, coordinator's step).
- MCP server (`search_series`, `get_observations`, `get_release_calendar`) and
  `/api/releases`: Phase 2, documented as the contract in `/api-docs#mcp`.
- Provincial map view, EN/FR toggle, accounts + digital badges: Phase 1/2.
- Screenshots in the Nshipyard/CRED README (coordinator's step).
- Deploy to cred.nshipyard.com (coordinator's step; no Vercel/DNS work here).

## Quality gates

- `npx tsc --noEmit`: PASS (one fix during build: `cached: fresh` narrowing in data.ts).
- `next build`: PASS (Next 16.4.0, Turbopack). Two scaffold-default issues fixed:
  `cacheComponents: true` is incompatible with `export const dynamic =
  'force-dynamic'`, so `cacheComponents` and `partialPrefetching` were turned
  off in next.config.ts; this app is dynamic-by-design (live data per request).
- Runtime smoke test (production build, port 3019): all routes 200;
  `/series/POLICY_RATE` renders the live BoC chart (369 observations,
  1996-01-01 to 2026-09-01); `/api/observations` returns the same 369 points;
  cron without key returns 401, with `Bearer $CRON_SECRET` runs and writes
  NDJSON to ./data/vintages/ (gitignored); `/api/vintages` lists the snapshot;
  unknown series returns 404.
- Correctness fix found during the smoke test: StatCan WDS
  `getDataFromVectorByReferencePeriodRange` is a GET with quoted comma-joined
  `vectorIds` (`?vectorIds="41690973"&startRefPeriod=...&endReferencePeriod=...`),
  not a POST with `{vectorIds, startReferencePeriod, endReferencePeriod}`
  (that returns 405/406 "JSON syntax error"). data.ts now uses the GET form,
  verified live against CPI vector 41690973. BoC Valet parsing verified live
  against V122514. NOTE: the stub's POLICY_RATE valetSeriesKey 'V122514' turned
  out to be a real key (overnight rate), which is why the smoke test pulled
  real data; treat it as coincidence, the verified registry still replaces the stub.
- After the verified registry swap: re-run `npx tsc --noEmit` and `npm run build`.
