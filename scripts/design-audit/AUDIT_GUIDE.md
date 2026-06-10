# Design audit guide

Scope and rules for the automated design audit (`.github/workflows/design-audit.yml`).

## What to audit

Review `src/app/globals.css`, `tailwind.config.ts`, and the pages/components under
`src/`, plus the "before" screenshots in `.design-audit/before/`. Look for:

1. **Design-token drift** — values defined in `tailwind.config.ts` that disagree with
   the CSS custom properties in `globals.css` (`--liberty-*`, `--campaign-*`). The CSS
   variables are the source of truth for the current vintage-campaign look.
2. **Off-palette colors** — raw Tailwind palette colors (e.g. `red-500`) or hex values
   used where a brand token exists.
3. **Contrast** — text that fails WCAG AA, especially small uppercase labels rendered
   in low-opacity paper tones on the dark ink background.
4. **Typography scale** — interactive text below ~11px equivalent.
5. **Focus states** — interactive elements with hover styles but no `:focus-visible`
   treatment.
6. **Consistency** — duplicated button/input/card patterns that drifted apart.

## Rules for fixes

- CSS-level and token-level changes only. Do **not** restructure JSX, rename
  components, or change copy.
- Preserve the visual identity: ink `#10100F`, paper `#EBE7DC`, campaign red
  `#D32331`, Bebas Neue display type, square corners.
- Every change must be safe to ship: no layout shifts beyond a few pixels.
- Write findings to `.design-audit/REPORT.md`: one line per finding —
  severity, file:line, what changed, why. Keep it terse; the before/after
  images are the primary artifact.
