#!/usr/bin/env python3
"""Render the CRED FRED-style lockup as PNGs + the iOS app icon.

Lockup: Archivo Black "CRED" in near-black, chart mark (white rounded square,
ink border, blue zigzag over green zigzag) on the right, white background.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.dirname(os.path.abspath(__file__))
INK = (10, 15, 30)
BLUE = (36, 86, 214)
GREEN = (62, 158, 92)
WHITE = (255, 255, 255)
FONT = os.path.join(OUT, "ArchivoBlack-Regular.ttf")

BLUE_PTS = [(12, 42), (20, 42), (26, 30), (33, 36), (41, 22), (52, 13)]
GREEN_PTS = [(12, 50), (22, 47), (30, 49), (40, 43), (52, 36)]


def draw_mark(draw, box, border_px, line_px):
    """box = (x, y, size). Coordinates are in the 64-unit mark space."""
    x, y, s = box
    u = s / 64.0
    # white rounded square + ink border
    draw.rounded_rectangle([x, y, x + s, y + s], radius=int(13 * u),
                           fill=WHITE, outline=INK, width=max(1, int(border_px)))
    for pts, color in ((GREEN_PTS, GREEN), (BLUE_PTS, BLUE)):
        scaled = [(x + px * u, y + py * u) for px, py in pts]
        draw.line(scaled, fill=color, width=max(1, int(line_px)), joint="curve")


def lockup_png(path, height=500):
    font = ImageFont.truetype(FONT, size=int(height * 0.52))
    # measure wordmark
    probe = Image.new("RGB", (10, 10))
    d = ImageDraw.Draw(probe)
    bbox = d.textbbox((0, 0), "CRED", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    mark_s = int(height * 0.68)
    gap = int(height * 0.09)
    pad = int(height * 0.16)
    w = pad + tw + gap + mark_s + pad
    img = Image.new("RGB", (w, height), WHITE)
    d = ImageDraw.Draw(img)
    # baseline-aligned: draw text so its visual center matches the mark center
    ty = (height - th) / 2 - bbox[1]
    d.text((pad - bbox[0], ty), "CRED", font=font, fill=INK)
    draw_mark(d, (pad + tw + gap, (height - mark_s) / 2, mark_s),
              border_px=mark_s * 0.047, line_px=mark_s * 0.0625)
    img.save(path)
    print("saved", path, img.size)


def mark_png(path, size=1024):
    img = Image.new("RGB", (size, size), WHITE)
    d = ImageDraw.Draw(img)
    draw_mark(d, (0, 0, size), border_px=size * 0.047, line_px=size * 0.0625)
    img.save(path)
    print("saved", path, img.size)


def ios_icon_png(path, size=1024):
    # Apple masks the corners itself: full-bleed square, no transparency.
    img = Image.new("RGB", (size, size), WHITE)
    d = ImageDraw.Draw(img)
    m = int(size * 0.76)
    draw_mark(d, ((size - m) / 2, (size - m) / 2, m),
              border_px=m * 0.047, line_px=m * 0.0625)
    img.save(path)
    print("saved", path, img.size)


if __name__ == "__main__":
    lockup_png(os.path.join(OUT, "cred-logo.png"), height=500)
    lockup_png(os.path.join(OUT, "cred-logo@2x.png"), height=1000)
    mark_png(os.path.join(OUT, "cred-mark.png"), size=1024)
    ios_icon_png(os.path.join(OUT, "cred-ios-icon-1024.png"), size=1024)
