# Lead-magnet PDF build

The two lead magnets exist in three forms:
- `../*.md` — the canonical text (edit for wording).
- `./*.html` — print-styled, on-brand (Sage & Clay) versions used to make the PDFs.
- `../*.pdf` — the print-ready one-pagers you upload to your ESP / host.

## Regenerate the PDFs

Edit the HTML here, then print to PDF with headless Chromium (one page each):

```bash
cd marketing/content-engine/lead-magnets
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome   # or your local Chrome/Chromium
for f in audit-ready-note-checklist person-first-language-cheatsheet; do
  "$CHROME" --headless --disable-gpu --no-sandbox --no-pdf-header-footer \
    --print-to-pdf="$f.pdf" "build/$f.html"
done
```

On a normal machine, `chrome --headless --print-to-pdf=out.pdf in.html` works the
same — any recent Chrome/Chromium will do. Keep each magnet to a single A4 page.
If you change the markdown wording, mirror it in the HTML so the three stay in sync.
