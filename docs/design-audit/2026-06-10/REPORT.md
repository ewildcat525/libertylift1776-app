# Design audit findings — 2026-06-10

| # | Severity | Where | Finding | Fix |
|---|----------|-------|---------|-----|
| 1 | High | `tailwind.config.ts` | Token drift: Tailwind palette (`#B22234` red, `#D4AF37` gold, `#3C3B6E` blue, `#0A0A0F` dark) disagreed with the `:root` vars in `globals.css` (`#D32331`, `#EBE7DC`, `#1F2538`, `#10100F`). Two different brand reds rendered at once — e.g. the login page submit button (`btn-gold` → old red) vs. the nav "Join" CTA (campaign red). | Synced Tailwind tokens to the CSS variables. |
| 2 | Medium | `globals.css` `.btn-primary`, `.btn-gold` | Hover used generic Tailwind `red-500` (`#EF4444`), off the brand palette. | New `liberty-red-bright` token (`#F02A3B`), matching the campaign CTA hover. |
| 3 | Medium | `globals.css` (12 rules) | Small uppercase labels and body copy at 46–62 % paper opacity on ink fail WCAG AA (e.g. `.auth-field-note` ≈ 2.9:1, `.campaign-stat-label` ≈ 3.9:1 at 10 px). | Raised opacities to 64–78 % (≈ 4.6–7:1) and bumped two label sizes from 0.63/0.68 rem toward 0.68/0.7 rem. |
| 4 | Medium | global | No `:focus-visible` styling anywhere; keyboard users get no focus indicator on buttons/links (hover-only affordances). | Global 2 px campaign-red `:focus-visible` outline. |

Not changed (by design): paper/ink/red palette, Bebas Neue display type, square corners,
film-grain treatment, low-opacity decorative watermark (`.campaign-final-mark`).
