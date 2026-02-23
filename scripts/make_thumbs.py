#!/usr/bin/env python3
"""Generate JPEG thumbnails for tarot card faces.

Uses Pillow. Creates smaller images suitable for the table-grid flips.

Defaults:
- input:  images/rws
- output: images/rws-thumb
- width:  240px
- quality: 72

Usage:
  python3 scripts/make_thumbs.py
  python3 scripts/make_thumbs.py --width 280 --quality 75
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in-dir', default='images/rws')
    ap.add_argument('--out-dir', default='images/rws-thumb')
    ap.add_argument('--width', type=int, default=240)
    ap.add_argument('--quality', type=int, default=72)
    args = ap.parse_args()

    in_dir = Path(args.in_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted([p for p in in_dir.glob('*.jpg')])
    if not files:
        raise SystemExit(f'No .jpg files found in {in_dir}')

    made = 0
    skipped = 0

    for p in files:
        out = out_dir / p.name
        if out.exists() and out.stat().st_size > 0:
            skipped += 1
            continue

        with Image.open(p) as im:
            im = im.convert('RGB')
            w, h = im.size
            if w <= args.width:
                thumb = im
            else:
                new_h = round(h * (args.width / w))
                thumb = im.resize((args.width, new_h), Image.LANCZOS)

            thumb.save(out, format='JPEG', quality=args.quality, optimize=True, progressive=True)

        made += 1

    print(f'Done. made={made} skipped={skipped} out={out_dir}')


if __name__ == '__main__':
    main()
