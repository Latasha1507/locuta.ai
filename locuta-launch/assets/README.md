# Locuta launch — asset drop zones

Put real assets in these folders, then reference them from compositions with
**project-relative paths** (e.g. `assets/logo/locuta-logo.svg`). Large media is
auto-proxied for fast preview (`hyperframes.json` → `media.autoProxy: true`), so
you can drop full-resolution files here directly.

> Nothing here is invented yet. Filenames below are **suggestions** — rename to
> match what you actually add, and update the paths in your compositions.

| Folder | What goes here | Suggested files / formats |
|---|---|---|
| `logo/` | Locuta logo | `locuta-logo.svg`, `locuta-logo-white.svg`, `locuta-mark.svg`, PNG fallbacks (transparent) |
| `brand/` | Brand system | `brand.json` or `colors.md` (hex palette), `fonts/` (woff2), gradient/texture backgrounds |
| `screenshots/` | Product screenshots | `dashboard.png`, `practice-page.png`, `feedback.png` (PNG, exact-pixel, retina if possible) |
| `recordings/` | Product screen recordings | `practice-demo.mp4`, `.mov`, or `.webm` — see UI-recording note below |
| `ui/` | Isolated UI images / device frames | exported UI cards, cursors, phone/laptop mockups (PNG with alpha) |
| `audio/voiceover/` | Narration | `vo-line-01.wav`, `vo-line-02.wav` … (WAV/MP3; keep per-line for easier sync) |
| `audio/music/` | Background music | `bgm.mp3` (or `.wav`) — one bed track |
| `audio/sfx/` | Sound effects | `whoosh.wav`, `click.wav`, `pop.wav`, `chime.wav` |

## Notes

- **Screen recordings / UI clips:** when rendering, extract source video frames as
  PNG for crisp UI text — `hyperframes render --video-frame-format png`. Prefer
  clean, high-bitrate captures; trim to the exact beat you need.
- **Video in a composition:** use a muted `<video>` element; put any spoken audio in
  a separate `<audio>` track (see `/hyperframes-core` → variables-and-media).
- **Transparency:** logos/UI overlays should be PNG or SVG with alpha.
- **Fonts:** drop `.woff2` in `brand/fonts/` and `@font-face` them inside the
  composition (system fonts like Helvetica/Arial are auto-mapped to Inter at render).
- Keep source-of-truth originals in these folders; rendered videos land in `../renders/`.
