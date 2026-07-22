# Locuta Design System — Chunky-3D Green (documented from the live site)

Extracted from locuta.in's shipped HTML/CSS on 2026-07-22. This is the **observed, live
theme** — the closest thing to a written design system that exists. When a dev handoff file
exists for a screen, the handoff still wins (rule zero); use this to fill gaps, keep new
work consistent, and spot drift.

## The visual identity in one paragraph

Duolingo-adjacent chunky-3D: friendly rounded type (Baloo 2), heavy weights, a green-on-sage
palette, and the signature **hard offset shadow with zero blur** (`box-shadow: 0 4px 0
<edge-color>`) that makes buttons and cards read as physical, pressable objects. Pills and
circles everywhere, 2px solid borders on cards, uppercase micro-labels with wide tracking.
Playful, game-like, warm — never corporate-SaaS flat.

## Color palette (by observed role)

**Greens (brand core):**
- `#3fce6f` — primary green (buttons, brand accents; the most-used color after white)
- `#2fa552` — pressed/edge green (the 3D edge under primary buttons, hover states)
- `#2b9a4c` — darker edge variant
- `#eafaef`, `#c7edd2` — green tints (soft fills, highlights)

**Sage neutrals (backgrounds/surfaces — NOT pure gray):**
- `#e8ece2` — the workhorse surface/border/edge neutral (card borders, neutral 3D edges)
- `#f4f7f0`, `#eef2e8`, `#e6eede`, `#dfe7d6`, `#dbe4d2`, `#d3ddc8` — surface ramp
- Every neutral is green-tinted. Pure gray (`#ccc`, `#eee`) is off-palette — using it is drift.

**Text:**
- `#4b4b4b` — primary text (soft black, never `#000` for body)
- `#556150`, `#7d8a75`, `#98a690`, `#a3b099` — muted text ramp (sage-grays)

**Accents (used sparingly, game-like):**
- `#ff6f61` coral · `#1cb0f6` sky blue · `#c774f0` purple · `#ffc531`/`#e0a400` yellow/gold

## The chunky-3D signature (what makes it "chunky")

- **Hard offset shadow, zero blur:** `box-shadow: 0 4px 0 <color>` (4px standard; 5–6px for
  bigger elements; 8px hero-scale). The color is the element's "edge": `#2fa552` under
  primary green, `#e8ece2` or `#dfe7d6` under white/neutral surfaces, `rgba(0,0,0,.13)` for
  floating elements. **A soft blurred drop-shadow is off-system** — if you're writing
  `box-shadow` with a blur radius, you're breaking the style.
- **Pressed interaction:** buttons translate down and shrink their edge on press (the
  `--lc-drop` / `--lc-edge-h` mechanic below) — the button physically "depresses."
- **Borders:** cards and inputs use `2px solid` (mostly `#e8ece2`; `#c7edd2` for green-
  tinted; occasionally 3px for emphasis; `2px dashed #d3ddc8` for empty/placeholder zones).
- **Radii:** `999px` pills for buttons/chips, `50%` circles for icons/avatars, and rounded
  rectangles for cards — observed values cluster 14–24px (see Known Issues: this cluster
  should be consolidated).

## The `--lc-*` button token system (exists — use it, extend it)

The live site ships a small custom-property system for chunky buttons. **This is the
correct pattern — prefer it over hardcoding per-button styles:**

- `--lc-bg` / `--lc-bg-hover` — face color and hover face
- `--lc-edge` — the 3D edge color (the offset shadow)
- `--lc-edge-h` — edge height (5px rest, ~2px pressed, 0 fully depressed)
- `--lc-drop` — translateY applied when pressed (matches the edge it consumed)
- `--lc-ring` — focus ring (`0 0 0 4px rgba(63,206,111,.45)` on green, white variant on dark)

Note: a focus-ring token **exists** in this system — so the app-wide missing-focus-state
problem is an adoption failure, not a design gap. Wiring `--lc-ring` into `:focus-visible`
everywhere is the sanctioned fix.

## Typography

- **Baloo 2** — display/headings/buttons (the chunky rounded personality carrier)
- **Nunito** — body text
- **Weights skew heavy:** 800 is the dominant weight sitewide; 700/600 secondary; 900 for
  hero moments; 400/500 rare. Thin type reads off-brand.
- **Micro-labels:** uppercase + `letter-spacing: 0.14em`, small size, bold — the section
  eyebrow style ("WHY LOCUTA", "SKILL PATHS"). Reuse exactly for new section labels.
- Headings use slight negative tracking (~`-0.9px`) at large sizes.

## Voice note for UI copy

Short, energetic, second-person, a little playful ("Four taps. Sixty seconds.", "Keep the
flame alive."). Sentence-case headings with a period. ALL-CAPS for CTAs and micro-labels
only.

## Known issues in the live theme (fix-on-contact list)

1. **No type scale.** 15+ distinct inline font sizes observed, including half-pixel values
   (`12.5px`, `13.5px`, `11.5px`, `16.5px`, `14.5px`) and sizes down to `9.5px`/`11px`.
   Consolidate toward a real scale when touching a screen; anything under ~12px is an
   accessibility problem, full stop — bump it.
2. **Radius sprawl.** 14/16/17/18/22/24px all in use for the same "rounded card" role.
   Near-identical-but-different radii on one screen is exactly the subtle-mistake pattern.
   Converge on a small set (e.g. 16 / 22 / 999 / 50%) as screens get touched.
3. **Tokens exist but are barely adopted.** The `--lc-*` system covers buttons only, and
   most colors/shadows are hardcoded inline per element. Direction of travel: move repeated
   values into tokens, don't add new hardcoded instances.
4. **Dead Geist font config still ships.** CSS still declares/loads Geist tokens while the
   real fonts are Baloo 2 + Nunito. Dead weight — remove when touching global styles.
5. **The stale dark-mode media query is still live in production CSS** (flips
   `--background` to `#0a0a0a` for dark-mode-OS users while the page is designed light-only
   with inline styles). Confirmed still shipping. Remove it or implement dark mode for real.
6. **Inline-styles-everywhere architecture.** The landing page is ~170KB of HTML largely
   because styling is inline per element. Beyond weight, this is why drift (issues 1–2)
   happens — there's no shared definition to stay consistent with. When rebuilding screens,
   extract repeated patterns into classes/components using the tokens above.
