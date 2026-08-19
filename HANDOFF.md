# Handoff

Decisions and hazards that exist nowhere else in this repo. Written for a
session that starts cold.

New file: there was no HANDOFF.md before 2026-08-16, so this is the first
entry rather than an append.

---

## 2026-08-15 / 16. Four Claude Design comps imported, plus fixes

Branch `design-comps-import`. Twelve commits, one per task.

### design.md is real, and it is in a third project

Every comp and roughly ninety references across this repo cite `design.md` as
the locked source of truth. It is **not in this repo** and **not in the comps
project**. It lives in a separate Claude Design project:

| project | UUID |
|---|---|
| **Circulation Studio Design System** (holds `design.md`) | `c8752ee5-e47c-4c3a-a1a0-7039ee47fc1c` |
| Design variation requests (holds the comps) | `12ce352e-77bf-4150-8930-a1ab91d1493d` |

Read it with the `DesignSync` tool, `get_file` at path `design.md`.

The comps project carries a **partial snapshot** at
`_ds/circulation-studio-design-system-c8752ee5…/`, holding tokens,
`components.css`, fonts and `readme.md`. It deliberately omits `design.md`, `guidelines/` and
`components/core/`, which is why that readme's index lists files that are not
beside it.

`design.md` has **ten numbered sections**: 1 Color, 2 Typography, 3 Alt-glyph,
4 Spacing/layout, 5 Motion, 6 Components, 7 Text rules, 8 Pending decisions,
9 Wordmark, 10 Imagery. `DESIGN_SYSTEM.md` in this repo is a *different*,
repo-side document with no numbered sections. It is not design.md and the two
should not be conflated.

**Consequence worth stating plainly:** the instruction "flag any value that does
not resolve to a token in design.md" was, for however long it has been in use,
pointing at a file nothing in this repo could open. Nothing was checking against
anything. Either vendor a copy in, or have `/design-sync` pull it.

### §5 is a live contradiction, not a gap

`design.md` §5 is marked LOCKED and says, verbatim:

> 140 and 220 are the ONLY durations in the system. There is no third, and a
> component that seems to want one takes 140 … encoding it would stop the scale
> being a scale.

This repo now carries **three more**, in `src/css/main.css`:

```
--dur-long:   320ms   the header nav row's slide
--dur-longer: 400ms   the header mark's descent and scale
--dur-lead:   100ms   delay before the scale starts
```

They are there because the Header Condense comp needs compound motion. The
mark covers a descent *and* a scale change while the nav covers a slide and
nothing else, and at a shared 220 the mark reads hurried. The call was made to
ship it. **This is a contradiction of a locked rule, not an unfilled gap**, and
the amendment belongs in §5, not in a repo comment.

### §5 also still describes physics that no longer exists

§5 describes the button as: *"tracking .22em snaps to .1em, weight jumps 400 to
600, outline fills to solid."* All three are **retired in this repo**:

- The tracking snap and weight jump caused a hover feedback loop. Measured:
  263.56px at rest, 233.77px hovered, a 29.79px unstable band on the right edge,
  eleven hover flips in 1.2 seconds, on every button on the site.
- "Outline fills to solid" went with it. `--secondary`, `--deep` and
  `--on-accent` no longer fill on hover; the bar is the hover on every variant.

Upstream `components.css` still ships the snap on `.cs-btn:hover` too.

### Amendments owed to design.md, in full

None of these can be made from this repo.

1. **§5.** The tracking snap is retired, and "outline fills to solid" with it.
2. **§5.** The three durations above, against "there is no third".
3. **§6.** `on-deep-primary` is now implemented here (paper fill, paper border,
   ink label, hover to mist, read from upstream `components.css`). §6's note
   that "two are open right now" is stale: `components.css` carries all three of
   `on-deep-primary`, `on-accent` and `on-accent-primary`.
4. **§6.** `accent-outline` exists in this repo and is **not** in the locked
   set. Either propose it properly or remove it.
5. **§8 item 3.** The two link patterns are now confirmed and refined:
   *inline links engage their rule in place, discrete `.cs-link` CTAs sweep*,
   with `ghost` having moved into the button family. §8.3 asks for exactly this.
6. **New states with no home in the document.** The visited link tint (40%
   madder), the button bar / plate / registration marks, and the condensed
   header geometry (62px bar, mark at 0.38 of the lockup, 28px gaps).
7. **The 8px button bar, and a correction.** The comp asks for it to be measured
   off the photographs rather than picked. **It does not yield a single number.**
   Measured across six library images, the madder bar is:

   | image | bar width | % of image width |
   |---|---|---|
   | sowing | 19px | 1.48% |
   | bee | 23px | 1.80% |
   | web | 29px | 2.42% |
   | fruit | 35px | 3.42% |
   | espalier | 51px | 3.98% |
   | trellis | 77px | 7.53% |

   All are genuinely bar-shaped (aspect 5.9–18.5). An earlier note in this
   session quoted **2.4%** as *the* figure; that was one image and should not be
   treated as canonical. Grounding the button bar this way needs a prior
   decision about which photograph is canonical, or normalising by rendered
   size rather than source width.

### There are TWO emitters of `cs-btn`

`src/_includes/components/button.njk` is the macro, and
**`eleventy.config.js:1826`** hand-writes the article CTA button, outside
`src/`. A sweep scoped to `src/` reports the macro as the sole emitter and is
wrong.

The button is now two layers. `.cs-btn` is the plate, `.cs-btn__face` is the
printed surface carrying the bar, the press and the focus marks:

```html
<a class="cs-btn cs-btn--x"><span class="cs-btn__face"><span class="cs-btn__label">…</span></span></a>
```

**Anything touching button markup has to change both files.** Flattening either
back to a bare label silently drops all three states. `tools/verify/manifest.mjs`
catches it: its `cta button` signature now points at `.cs-btn__face`.

### `_site` gets clobbered, and it is not only `measure:stats`

Two separate writers produce an **unstyled** `_site`, with no stylesheet
`<link>` and `/src/js/main.js` referenced as a dev path:

1. **`npm run measure:stats`** builds with `npx eleventy` directly and bypasses
   the Vite asset pipeline. Any visual check run straight after it is looking at
   an unstyled page.
2. **`npm start` / `eleventy --serve`** watches files and rewrites `_site` on
   every edit. If a dev server is running anywhere, including in a VS Code
   terminal, it will overwrite production builds *underneath* a measurement or
   a `verify` run, and npm respawns the child if you kill only `eleventy`.

This cost real time in this session and produced several *false* conclusions
that were reported as fact before being caught. It is also the likely cause of
repeated `readiness.mjs` failures reading *"Lora: 21 faces registered, none
loaded"*, which were dismissed three times as Google Fonts flakes. **They were
probably not flakes**: a build clobbered mid-run has no `@font-face`.

Before trusting any measurement: this is now only true of `npm run build` and
anything reading `_site` by hand. `verify` and `measure:stats` are safe with a
watcher running. If you are measuring `_site` yourself, still confirm
`grep -c 'assets/main-.*css' _site/contact/index.html` returns 1 first, because
the watcher's own output has no stylesheet link and is indistinguishable from a
real build at a glance.

**FIXED 2026-08-19, and this section is kept as the record of why.** The checks
no longer share a directory with the watcher. `npm run verify` builds and serves
`_check`, `npm run measure:stats` builds and measures `_measure`, and the
watcher keeps `_site` to itself. Both take Eleventy's `--output` flag, which the
Vite pipeline honours: the separated builds carry their stylesheet link and all
three deploy files.

Proved rather than assumed. `npm run verify` was run with `eleventy --serve`
alive and passed all five, then run again with `_site` deliberately replaced by
a one-line stub, and still passed all five. Neither is possible under the old
arrangement.

It bit three more times before it was fixed, each time producing numbers that
looked real: twelve fingerprint hashes that all differed at once, a page
reporting its image at natural size with every survey rule at height 0, and a
round of section-rhythm measurements that came back empty and had to be thrown
away. The failure never announces itself, which is what made it worth the fix
rather than the discipline of remembering.

### The header's derived offset is computed, and must stay computed

`src/js/main.js` measures the four nav label widths at runtime and derives where
each item lands in the condensed bar. **It is not a literal and must not become
one.** Rename Results to Case Studies and a tuned constant does not go stale, it
*inverts*, and nothing in the code would say so.

It recomputes on mount, on `document.fonts.ready`, on every `fonts`
`loadingdone`, on resize, and via a `ResizeObserver` on the rail and the nav
list. Dual is self-hosted with `font-display: swap`, so the **fallback face is
what paints first** and a measurement taken then is wrong for the life of the
page, silently. Verified by delaying the woff2 2.5s: offsets start on fallback
metrics and self-correct when Dual lands.

Two traps already paid for, both worth not re-learning:

- The comp's own version queried `.nav[data-live]`, an attribute its markup
  never carried, so **its measurement never ran** and it always used the
  symmetric fallback. What was approved is a static illustration with a
  hardcoded `-26.04px`. `data-masthead-nav` is the hook here; if it is dropped
  the same silent fallback returns.
- `offsetLeft`/`offsetTop` are relative to `offsetParent`, and **offsetParent
  moves between the two states**: once the nav list carries its transform it
  becomes a containing block. Reading one hop was correct only while expanded
  and put the whole run ~514px to the right when re-measured while condensed.
  Everything goes through `within()`, which sums to the header.

Also: **both header states are chosen independently and only the travel between
them is derived.** Deriving the expanded state as an offset from the condensed
one is what regressed the composition once. Flanking labels lost 45.7px onto
the top edge and the nav band collapsed from 59.6px of air to a 1px rule.

### The line vocabulary

One treatment across the site: **1px dashed hairline ink at 14%, 160px run.**
Chosen after reading all six horizontal survey rules as rendered:

| page | rule | style |
|---|---|---|
| home | `--espalier`, `--hero-h` | dashed |
| who-we-are | `--graft` | **solid** |
| what-we-do | `--trellis` | dashed |
| results | `--fruit` | dashed |
| contact | `--sowing` | dashed |

`.cs-intro__rule` on What We Do (formerly `.cs-intro__accent`, which was solid
madder) now joins them and crosses 160px into the image.

**`--graft` on Who We Are is now the odd one out**, the only solid rule left,
at `who-we-are.css:126`. It was not changed because it was outside the brief.
Decide whether it converges or is deliberately different.

Also worth knowing: `.cs-intro__rule` is the **only** rule on the site that
crosses an image boundary. All six others terminate exactly at one, and they run
the opposite way, from an image edge outward rather than from text inward.

### The focus ring is fixed, and nothing else carries the old value

`--focus-ring` was `rgba(143,29,46,.45)`, measuring **2.37:1** on paper against
1.4.11's 3:1. That is a live failure on a site publishing an accessibility
statement. It is now `.7`.

Measured across candidates, and **mist is the constraint, not paper**. It is
the darkest ground the ring sits on, so testing on paper alone would have passed
.60 and shipped a ring that fails on every quiet panel:

| alpha | paper | mist | white |
|---|---|---|---|
| .45 | 2.37 | 2.30 | 2.42 |
| .60 | 3.32 | 3.17 | 3.44 |
| **.70** | **4.19** | **3.95** | **4.39** |

**Audit answer: no consumer still carries a failing indicator.** Every focus
declaration in `src/css/` resolves to one of four things:

- `var(--focus-ring)`, now 4.23:1 measured on paper and 3.95:1 computed on mist
  (cards, wordmark, FAQ, related, masthead, `.cs-link`, breadcrumbs, skip link)
- `var(--color-paper)` on ink and madder grounds, 16.06:1 and 8.03:1
  (colophon, menu, panes, yelp-rank-tracking)
- the button's registration marks, 8.06:1 on paper and madder, 16.06:1 on ink
- the contact field's own madder underline, 8.06:1

One caveat recorded rather than solved: the button's four brackets total about
176 square px against roughly 1,000 for a 2px perimeter, so they pass on
contrast and fall short on **area**. That is the enhanced threshold, not the AA
the site is held to.

### Smaller things carried forward

- **Article typography tokens were never promoted.** `main.css` claimed all
  fourteen went upstream on 2026-08-01. They are not in the design system's
  `tokens/typography.css`, which carries only the locked marketing scale.
  `/design-sync` will not deliver them. The comment is corrected.
- **Link States option E is built but not wired.** `.cs-link-ext` works on any
  hand-authored link and is carved out of the focus exclusion so it keeps the
  inline treatment. Article prose links come from markdown and carry no class,
  so nothing applies it automatically; that needs a markdown-it `link_open` rule
  under `amendLibrary`. Several external links in `src/yelp/*.md` have no arrow.
- **The focus ticks are scoped by an exclusion list.** `a[class]` plus nine
  named scopes in `base/elements.css`. That list has to grow whenever a
  standalone link is built with a bare anchor inside a classed parent. There is
  no CSS way to ask "does this link still carry the base underline". Failure
  mode is mild and visible: a standalone link picks up ticks on paper.
- **The condensed masthead is 98% paper, not the comp's 92%.** At 92 the page
  behind was legible through the bar, 1.094:1 against the ground. This all but
  retires the frosted-glass quality the comp asked for; deliberate trade.
- **`src/yelp-rank-tracking-tool.njk:419`** has a second mockup submit. Confirm
  it carries `data-form-mockup`, which is the only thing blocking submission.
- **`about-this-site.njk:35`** still says three third-party requests in a
  Nunjucks comment. The measured figure is two.
