# CRED OG image pipeline

Generates the social sharing images for cred.nshipyard.com. Everything is
rendered with code, no AI imagery.

## What it produces

- `public/og/home.png` (1200x630): landing page card. CRED lockup, the Bank of
  Canada policy rate chart, live series count, sources.
- `public/og/series/[id].png` (1200x630): one card per registry series. CRED
  lockup, series title, the full-history chart (recession shading, axes, red
  line, same geometry as the on-page `ChartSVG`), latest value, units,
  frequency, and the source line.

## Regenerating

```bash
# 1. SVGs (fetches live observations for all 104 series; ~2 min)
node scripts/og/build-svg.mjs
# Home card only (1 quick fetch):
node scripts/og/build-svg.mjs home-only
# Specific series (e.g. after a StatCan refresh window):
node scripts/og/build-svg.mjs UNRATE_CA,PARTRATE_CA

# 2. Rasterize to PNG (Playwright + Chromium, Google Fonts for Archivo Black/Roboto)
python3 scripts/og/svg2png.py all
python3 scripts/og/svg2png.py home
python3 scripts/og/svg2png.py UNRATE_CA   # single series id, or one PNG stem
```

SVGs land in `public/og-svg/` (gitignored intermediates); PNGs land in
`public/og/`.

## Notes

- StatCan WDS locks some tables during its nightly refresh window (roughly
  2am-6am ET). Series that fail to fetch render as honest fallback cards
  ("Data refresh in progress"); re-run the failed ids after the window.
- The chart math mirrors `src/components/ChartSVG.tsx`: same `niceTicks`,
  same C.D. Howe recession bands, same colors. If the on-page chart changes,
  update `chartPlot` in `build-svg.mjs` to match.
- `generateMetadata` in `src/app/series/[id]/page.tsx` points at
  `/og/series/[id].png`; the landing page uses `/og/home.png`.
