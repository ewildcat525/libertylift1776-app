---
name: design-audit
description: Run a visual design audit of a website. Captures before screenshots, audits the design against heuristics, proposes concrete changes, builds an "after" redesign mockup, and renders side-by-side before/after comparison images so nobody has to read a wall of text. Use when the user asks to audit, critique, or redesign a site's visual design. Args: the URL or domain to audit.
---

# Design Audit Workflow

Audit the visual design of the site given in `$ARGUMENTS` and deliver **visual** before/after comparisons, not just prose.

## Outputs (always produce all of these)

Create `audits/<domain>-<YYYY-MM-DD>/` containing:

1. `before/` — captured screenshots of the live site (desktop 1440px hero crop, desktop full page, mobile 390px). If the live site is unreachable from this environment, build a high-fidelity HTML recreation in `before/index.html` from research (WebSearch/WebFetch, cached copies, training knowledge) and screenshot that instead — and **clearly label it as a recreation** in the report and in your reply.
2. `after/index.html` — a self-contained redesigned mockup (no external assets, system font stack or embedded fonts, inline SVG for imagery) that implements every recommendation in the audit.
3. `visuals/` — rendered PNG comparisons. At minimum:
   - `01-hero-desktop.png` — before vs after, above-the-fold crop
   - `02-full-page-desktop.png` — before vs after, full page
   - `03-mobile.png` — before vs after at 390px
   - `04-design-system.png` — token sheet: old vs new colors, type scale, buttons, spacing
4. `REPORT.md` — the findings, one short section per finding: severity, what's wrong, what the redesign does instead. Embed the visuals. Lead with the images, keep prose tight.

## Pipeline

1. **Capture before.** Use `tools/design-audit/capture.sh <url-or-file> <outdir> <name>` (wraps the Playwright CLI). It produces `<name>-hero.png` (1440×900 viewport), `<name>-full.png` (full page), `<name>-mobile.png` (390×844). For unreachable sites, point it at the local recreation: `capture.sh before/index.html ...`.
2. **Audit.** Evaluate against the heuristics checklist below. Pick the 6–10 highest-impact findings; assign severity (High/Medium/Low).
3. **Redesign.** Write `after/index.html` fixing every finding. Stay on-brand (keep the site's brand colors and voice) unless the brand itself is a finding. Define design tokens (CSS custom properties) at the top so the report can reference them.
4. **Render after + comparisons.** Capture the after mockup with the same `capture.sh` calls, then run `tools/design-audit/compose.sh <before.png> <after.png> <title> <out.png>` for each pair to produce labeled side-by-side images.
5. **Report + deliver.** Write `REPORT.md`, send the comparison PNGs to the user with SendUserFile, commit and push.

## Heuristics checklist

- **Hierarchy & messaging**: Is the hero headline outcome-led or feature/announcement-led? Is there exactly one primary CTA above the fold? Carousels in the hero are almost always a finding.
- **Navigation**: ≤5 top-level items ideal; flag deep mega-menus, duplicate links, missing visible CTA in header.
- **Color & contrast**: Check CTA/text contrast against WCAG AA (4.5:1 body, 3:1 large text). Flag brand colors used at sizes/weights where they fail. Check focus states.
- **Typography**: Modular type scale? Body ≥16px? Line length 45–75ch? Inconsistent heading weights/sizes across sections?
- **Spacing & rhythm**: Consistent spacing system (4/8pt)? Cramped sections, uneven card heights, misaligned grids?
- **Trust & social proof**: Customer logos/stats/testimonials above the fold or buried?
- **Consistency**: Button styles, border radii, shadows, icon styles — count the variants; >2 of anything is a finding.
- **Mobile**: Nav crowding, text overflow, tap target size (≥44px), hero scaling.
- **Performance-adjacent**: Image-heavy heroes, autoplaying media (note only; don't measure).

## Rendering notes

- Playwright CLI is preinstalled globally (`playwright screenshot`); browsers via `playwright install chromium` if missing.
- Keep mockups fully self-contained so they render offline and deterministically.
- In comparison images, BEFORE goes left with a red label chip, AFTER right with a green chip; add numbered callouts only when they map to numbered findings in the report.
