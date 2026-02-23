# Tarot prototype (static)

This is a zero-backend prototype intended for GitHub Pages.

## Run locally

From this folder:

```bash
python3 -m http.server 5173
```

Then open: http://localhost:5173

## Notes

- Click **Deal the cards** to scatter the deck.
- Click a card to flip it; click again to open details.
- Reversals are 50/50 when enabled.

## Images

Placeholder images are downloaded from Wikimedia Commons into:

- `./images/rws/`

A manifest of sources is at:

- `../public/images/rws/manifest.json` (download manifest)

You should create a `SOURCES.md` (or similar) and verify/record license info per image before wider distribution.
