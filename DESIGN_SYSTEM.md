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

Two Tailwind defaults are overridden on purpose: `text-base` is 18px, not
16px, and `leading-tight` is 1.06, not 1.25. (`text-base` was recorded here as
17px until 2026-07-30; that was drift from the canonical Component Reference,
not a local decision.)

Spacing is deliberately not in `@theme`. Every value in the locked scale is a
multiple of 4px, so Tailwind's default scale already emits them exactly
(`p-2` 8, `p-4` 16, `p-6` 24, `p-10` 40, `p-16` 64, `p-24` 96). Naming them
numerically in `@theme` would have silently redefined `p-8` to mean 8px.

## Fonts

**Dual** (CDType / Charles Daoud) is self-hosted under a web license confirmed
2026-07-27. The six licensed OTFs were converted to woff2 (883KB down to
275KB, about 69 percent) and live in `src/fonts/`. `src/css/base/fonts.css`
maps weights 100 to 600 onto `--font-display`.

Not subsetted, deliberately. The alt-glyph device depends on the OpenType
stylistic sets, and a careless subset drops layout features. All ten sets
(ss01 to ss10) are verified present in all six weights. Anyone subsetting
these later must pass the layout features through explicitly.

Fonts are referenced by relative source path, so Vite fingerprints them into
`/assets/Dual-600-<hash>.woff2`, which is cached immutably for a year.

## Deploy pipeline

Two gaps found during the font pass, both now fixed.

`src/_headers` cached `/fonts/*`, `/css/*`, `/js/*` and `/images/*`, none of
which exist: Vite emits everything to `/assets/*`. The rules now match the
served paths.

**Cache-Control rules must never overlap.** Cloudflare Pages does not resolve
duplicate headers by specificity, it JOINS the values with a comma. A
`Cache-Control` on `/*` plus another on `/assets/*` would ship
`public, max-age=3600, must-revalidate, public, max-age=31536000, immutable`
on every asset. So `/*` carries security headers only, and exactly one rule
sets `Cache-Control` for any given path. HTML pages carry no rule and fall
back to the Pages default, which revalidates. That is the safe posture:
content edits go live immediately while fingerprinted assets stay cached.

`_headers`, `_redirects` and `site.webmanifest` were not reaching `_site` at
all. Two causes: they have no template extension, so Eleventy skips them; and
the Vite plugin renames Eleventy's output to a temp folder, then rebuilds with
`emptyOutDir`, discarding anything it does not reference. Plain passthrough
copy silently lost all three. They are now passed through to `public/`, which
Vite copies verbatim to the output root.

The manifest's `theme_color` and `background_color` were generic `#000000` and
`#ffffff`. They are now `--ink` (#211523) and `--paper` (#F4F5F4), per
design.md section 1, which bans generic black outright.

**Still open:** nothing links the manifest. Without
`<link rel="manifest" href="/site.webmanifest">` in the document head no
browser reads it, so the corrected colors have no effect yet. Left undone
because SITE_ARCHITECTURE.md sets PWA to No, and adding the link enables
install prompts. One line in `layouts/base.njk` whenever that is wanted.

**Lora** (body) still loads from Google Fonts via the import at the top of
`main.css`. It is SIL OFL, so self-hosting it later is permitted.

## Components

`tokens/base.css` is rewritten as `src/css/base/elements.css` (@layer base) and
`components/components.css` as `src/css/components/*.css` (@layer components).
The layer wrapping is load-bearing: unlayered CSS outranks every layered rule,
so without it an element rule would beat a Tailwind utility on the same
element.

The five React components are rewritten as Nunjucks macros in
`src/_includes/components/`. Heading's alt-glyph enforcement (cap of two,
h1/h2 only, letter must fall inside the named word) lives in the `glyphSwaps`
filter in `eleventy.config.js`.

**The alt-glyph floor.** design.md section 9 says the crossbar-less A holds at
15px and up and drops to plain type below about 14px, where the alternate
stops reading as a deliberate letterform and just looks like a broken A.

CSS cannot branch on computed font-size, so the floor cannot be automatic. It
is an author-chosen modifier, `.cs-wordmark--plain`, which sets
`font-feature-settings: normal` on every alt class inside the wordmark:

```html
<a class="cs-wordmark cs-wordmark--plain" href="/"> ... </a>
```

**When to apply it:** small wordmark lockups, footer micro-marks, favicon and
app-icon adjacent contexts, dense UI chrome, anywhere the name is set under
roughly 14px. When in doubt, measure the rendered size rather than inferring
it from context.

Nothing in the build needs it today. The wordmark is 20px, h1 is 56px, h2 is
36px, all well clear of the floor. It exists so the rule is enforceable the
first time something renders small.

Note the filter is still size-blind by design: `glyphSwaps` takes text, swaps
and tag only. Size is a rendering concern, so it is handled in CSS.

**Verified against the font binary:** `ss01` substitutes `A` (gid 565) with
`A.alt` (gid 566), matching design.md section 9 exactly. `ss01` also carries
D, E, H, J, O and R, which is why activation must stay per-character and never
word-level.

### The O device: scoped by adjacency, not banned outright

design.md section 9 retires the O device. Refined 2026-07-27: **the retirement
is about adjacency to the icon, not about the letter.** The isotype's ring owns
circular meaning, so an O device competes with it and reads as a thinner echo
whenever the two share a visual field.

- **Retired** wherever the mark sits next to the icon: the masthead lockup, the
  sticky lockup, and any headline in the same visual field as the icon. The
  wordmark itself never carries a device on the O, in any lockup, ever.
- **Permitted** where the icon is not present: the footer colophon tagline, and
  the home hero tagline, which sits far enough down the page that the masthead
  icon is out of view.

Applied per character on that single letter (`.alt-dot`, ss10). Never
word-level `font-feature-settings`: ss10 would bleed the dot onto other
letters, and ss01 carries the O and R alternates that stay retired.

Still in Claude Design, not here: **`guidelines/`**, fifteen reference pages,
plus the brand image library and the icon set.
