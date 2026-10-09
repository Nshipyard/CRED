#!/usr/bin/env python3
# Rasterizes public/og-svg/*.svg to public/og/*.png (1200x630) via Playwright.
# Run: python3 scripts/og/svg2png.py [only-id-or-all]
# Google Fonts (Archivo Black + Roboto) are loaded in the wrapper page so the
# PNGs use the same typefaces as the site.

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = Path('/home/hatch/cred')
SRC = REPO / 'public' / 'og-svg'
DST = REPO / 'public' / 'og'
(DST / 'series').mkdir(parents=True, exist_ok=True)

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">'
)

HTML = (
    '<!DOCTYPE html><html><head><meta charset="utf-8">' + FONTS +
    '<style>html,body{margin:0;padding:0;background:#fff;}'
    'svg{display:block;width:1200px;height:630px;}</style></head>'
    '<body>{svg}</body></html>'
)


def render(pw, svg_path: Path, png_path: Path):
    svg = svg_path.read_text()
    page = pw.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
    page.set_content(HTML.replace('{svg}', svg))
    page.evaluate('document.fonts.ready.then(() => true)')
    page.wait_for_timeout(600)
    page.screenshot(path=str(png_path))
    page.close()


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    with sync_playwright() as p:
        pw = p.chromium.launch()
        n = 0
        home = SRC / 'home.svg'
        if home.exists() and (not only or only == 'home'):
            render(pw, home, DST / 'home.png')
            n += 1
        for svg in sorted((SRC / 'series').glob('*.svg')):
            if only and only not in ('all', svg.stem):
                continue
            render(pw, svg, DST / 'series' / f'{svg.stem}.png')
            n += 1
            if n % 20 == 0:
                print(f'  {n} rendered')
        pw.close()
    print(f'Done: {n} PNGs in {DST}')


if __name__ == '__main__':
    main()
