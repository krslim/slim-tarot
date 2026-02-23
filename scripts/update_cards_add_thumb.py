#!/usr/bin/env python3
"""Update tarot/site/cards.js to use imgThumb + imgFull.

- Reads exported DECK JSON from cards.js
- For each card with `img`, replaces it with:
    imgThumb: ./images/rws-thumb/<filename>
    imgFull:  ./images/rws/<filename>

Assumes current `img` points at ./images/rws/<filename>.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

CARDS_JS = Path('/home/clawd/clawd/tarot/site/cards.js')


def load_deck(path: Path):
  txt = path.read_text(encoding='utf-8')
  m = re.search(r"export const DECK = (\[.*\]);\s*$", txt, re.S)
  if not m:
    raise SystemExit('Could not find DECK JSON in cards.js')
  deck_json = m.group(1)
  deck = json.loads(deck_json)
  return txt[:m.start(1)], deck, txt[m.end(1):]


def main():
  prefix, deck, suffix = load_deck(CARDS_JS)
  changed = 0

  for c in deck:
    img = c.get('img')
    if not img:
      continue
    # Extract filename
    fn = os.path.basename(img)
    c.pop('img', None)
    c['imgThumb'] = f'./images/rws-thumb/{fn}'
    c['imgFull'] = f'./images/rws/{fn}'
    changed += 1

  # keep keys order nice-ish by moving imgThumb/imgFull near top
  def reorder(card: dict) -> dict:
    keys = list(card.keys())
    preferred = ['id','name','arcana','suit','number','imgThumb','imgFull','meanings']
    out = {}
    for k in preferred:
      if k in card:
        out[k] = card[k]
    for k in keys:
      if k not in out:
        out[k] = card[k]
    return out

  deck = [reorder(c) for c in deck]

  out_txt = prefix + json.dumps(deck, ensure_ascii=False, indent=2) + suffix
  CARDS_JS.write_text(out_txt, encoding='utf-8')
  print(f'Updated {changed} cards')


if __name__ == '__main__':
  main()
