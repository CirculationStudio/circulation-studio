# Design System

**Project:** Circulation Studio (agency site)
**Last updated:** 2026-07-19

The canonical design system (brand colors, typography, spacing, components)
lives in Claude Design, not in this file. Tokens land in `src/css/main.css`
via `/design-sync` from Claude Code. Don't hand-edit design values here,
they will drift from the real source.

A Yelp Hub-specific sub-system (spoke page templates, hub layout, FAQ
components) hasn't been built yet in Claude Design. Build that before
starting Yelp Hub pages, not before.

## What's in the repo

Source project: **Circulation Studio Design System** in Claude Design
(`c8752ee5-e47c-4c3a-a1a0-7039ee47fc1c`).

Pulled 2026-07-27 into `src/css/main.css`: `tokens/colors.css`,
`tokens/typography.css`, `tokens/layout.css`. Tokens whose names map onto a
Tailwind v4 namespace sit in `@theme` and generate utilities (`bg-paper`,
`font-display`, `text-h1`, `rounded-control`, `max-w-main`). The rest are
plain custom properties in `:root` for hand-written component CSS.

Two Tailwind defaults are overridden on purpose: `text-base` is 17px, not
16px, and `leading-tight` is 1.06, not 1.25.

Spacing is deliberately not in `@theme`. Every value in the locked scale is a
multiple of 4px, so Tailwind's default scale already emits them exactly
(`p-2` 8, `p-4` 16, `p-6` 24, `p-10` 40, `p-16` 64, `p-24` 96). Naming them
numerically in `@theme` would have silently redefined `p-8` to mean 8px.

Still in Claude Design, not here:

- **Dual OTFs** (`fonts/`, six weights 100 to 600). Licensed files, not in
  this repo, so `var(--font-display)` falls back to system-ui today. Lora
  (body) does load, via the Google Fonts import at the top of `main.css`.
- **`tokens/base.css`**, the element-level defaults (h1 to h6, p, a, the
  `.alt` glyph classes, `.hairline`, `.specimen`).
- **`components/core/`**, five React components (Button, Card, Container,
  Heading, Section). This site is Nunjucks, so these need rewriting as macros
  in `src/_includes/components/`, not porting.
- **`guidelines/`**, fifteen reference pages, plus the brand image library.
