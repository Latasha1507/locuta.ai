# UI Review Checklist — Full Screen Audit

Use this when auditing a whole screen or page for UI mistakes (as opposed to the quick
self-review in SKILL.md, which covers single changes). Work through it looking at the
actual rendered screen where possible, not just the code — many of these are invisible in
JSX and obvious in the browser.

## 1. Consistency with the design system

- [ ] Colors all come from tokens/theme — zero inline hexes introduced.
- [ ] Spacing uses the system's scale — no one-off `13px`-style values.
- [ ] Corner radii consistent with sibling components (a mix of radii on one screen is one
      of the fastest "something feels off" signals).
- [ ] Shadows/elevation match the system's levels — not a new shadow recipe per card.
- [ ] Typography: type sizes and weights from the scale; no nearly-identical-but-different
      sizes on the same screen (15px next to 16px body text, 600 next to 700 for the same
      role).
- [ ] Iconography: one icon set, one stroke weight, consistent sizing per context.
- [ ] Buttons: same variant hierarchy as the rest of the app (primary/secondary/ghost look
      the same here as everywhere else).

## 2. Layout & spacing

- [ ] Full-screen, no unintended gutters (established Locuta preference).
- [ ] Key actions visible without scrolling at the target viewport.
- [ ] Alignment: edges that should line up actually line up (headings with content blocks,
      card edges with each other). Check with fresh eyes or an overlay, not assumption.
- [ ] Spacing rhythm: gaps between sections are consistent and larger than gaps within
      sections (broken hierarchy of spacing is a classic subtle mistake).
- [ ] Nothing crammed against viewport edges on mobile; nothing swimming in emptiness on
      desktop wide screens.

## 3. States (where most "it looked fine in the demo" bugs live)

- [ ] Loading: skeleton or spinner that doesn't shift layout when content arrives.
- [ ] Empty: designed empty state with guidance, not a blank area or a lonely "No data".
- [ ] Error: user-comprehensible message and a way forward (retry, go back) — not raw error
      text, not silence.
- [ ] Disabled: visually distinct AND explains itself (why is this disabled / what unlocks it),
      at least via tooltip or helper text where non-obvious.
- [ ] Long content: long names, long transcripts, huge numbers — truncation with ellipsis +
      title/tooltip, or wrapping that doesn't break layout. Test with worst-case content, not
      lorem ipsum.
- [ ] Overflow: lists with 0, 1, and 100 items all look intentional.

## 4. Responsive

- [ ] ~375px (small phone), ~768px (tablet), desktop all checked. No horizontal scroll at any.
- [ ] Touch targets ≥ ~44px on mobile for anything a thumb needs to hit.
- [ ] Text remains readable at mobile sizes — nothing shrunk below ~14px for body content.
- [ ] Fixed/sticky elements (navs, action bars) don't cover content or each other on small
      screens, including with the on-screen keyboard open on form screens.
- [ ] Images/illustrations scale without distortion or awkward cropping.

## 5. Accessibility (see SKILL.md baseline — this is the audit pass)

- [ ] Tab through the entire screen: every interactive element reachable, visible focus ring,
      logical order (matches visual order).
- [ ] Every icon-only button has an `aria-label`. Every image has meaningful `alt` (or
      `alt=""` if decorative).
- [ ] Form inputs all have associated labels; errors are attached to fields.
- [ ] Contrast spot-check: body text, secondary/muted text, text over gradients and over the
      green palette.
- [ ] State conveyed by more than color alone (playing vs paused, selected vs not, error vs
      valid).
- [ ] Animations respect `prefers-reduced-motion`.

## 6. Micro-interactions & polish

- [ ] Hover, active, and pressed states exist and are consistent across similar elements.
- [ ] Transitions are fast (typically 150–300ms) and eased — nothing sluggish, nothing
      instant-jarring where the system animates elsewhere.
- [ ] No animation blocks a user action or delays perceived response to a click/tap.
- [ ] Cursor semantics: pointer on clickables, default elsewhere, not-allowed on disabled.
- [ ] No layout shift on hover (e.g. border appearing that resizes the element — use
      transparent borders or outline/shadow instead).

## 7. Content & hierarchy

- [ ] Visual hierarchy matches importance — the primary action is the most prominent thing;
      two elements aren't fighting for attention.
- [ ] Headings/labels are consistent in tone and capitalization style across the screen
      (pick sentence case or title case; don't mix).
- [ ] Numbers, dates, and scores formatted consistently with the rest of the app.
- [ ] No leftover placeholder text, debug UI, or dead links.

## Reporting an audit

Report findings in severity order: (1) broken/blocking (unusable states, overlapping UI,
inaccessible core flows), (2) inconsistencies with the design system, (3) polish. For each:
what's wrong, where exactly (file + rough line or visual location), and the fix. Same
principle as the security reviews — lead with the worst, don't bury a broken mobile layout
under nitpicks about icon sizes.
