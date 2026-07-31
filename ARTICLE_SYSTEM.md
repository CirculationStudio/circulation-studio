# Article System, build notes

**Last updated:** 2026-07-30

Orientation for anyone working on the article system with no memory of how it
got here. It records the mechanics that are not obvious from reading the code,
and points at where everything else already lives.

**This file does not restate decisions.** Values, rules and per-block reasoning
live in SHORTCODES.md and in the component CSS. Where a thing is recorded
elsewhere, this points at it by name. Duplicated reasoning drifts, and the one
place that matters is the one nobody updated.

- **Vocabulary, rules, widths, surfaces:** SHORTCODES.md
- **Per-block reasoning:** the comment at the top of each `src/css/components/*.css`
- **Shortcodes and build-time checks:** `eleventy.config.js`
- **What must be verified:** `tools/verify/`

---

## 1. Markdown composition, and it cuts both ways

`markdownTemplateEngine` is `njk`, so Nunjucks runs first and whatever a
shortcode returns is fed through markdown-it afterwards. markdown-it follows
CommonMark: a line opening a block-level tag starts an HTML block that runs raw
until a **blank line** closes it.

**A block-level shortcode puts blank lines around its content.** Without them
everything up to the first blank line stays raw and everything after it gets
parsed, which is the worst of both. Measured: the naive form rendered a literal
`**bold**` in the opening paragraph and a real `<ul>` below it.

**An inline child must NOT.** A blank line closes the HTML block, so an inline
`<a>` separated by one does not continue its parent's block: markdown-it starts
a paragraph and wraps it. Measured on `related`: the first item was correct, the
second and third each came out inside a `<p>`.

Rule for both: wrapper tags on their own lines, blank lines around block
content, none around inline content, and never indent content four spaces
because that makes it a code block.

Never render content through a second markdown-it instance. One pass composes,
two do not: an inner shortcode's HTML would be parsed as markdown a second time,
and a separate instance's options can drift from the one used on prose.

## 2. Children render before parents

Nunjucks evaluates inside out. By the time a parent runs, its children have
already returned finished HTML strings and it receives their concatenation.

A parent cannot pass anything down, cannot validate children as they render,
and cannot see them as data. Three consequences:

- A child emits complete, self-contained markup.
- A parent wraps a string. There is no list of children to compose.
- **Anything needing the parent-child relationship happens in a transform**,
  because that relationship does not exist while either shortcode runs.

That is why orphan `qa` and orphan `item` are caught in the output, not at
render time, and why **numbering is a transform job**. A shortcode cannot know
its own position, and a marker in running prose has no parent at all. It is
also why numbering works across a pane boundary: a pane's contents render
before the prose that follows it, so only the built page has document order.

## 3. The walker is load-bearing, and it bit twice

The pane and faq checks used to enumerate wrapper tag names. It missed a block
twice: `figure` was added after a table inside a pane went undetected, then
`aside` after a callout inside a pane built cleanly on a probe written to fail.
Both times the check **passed silently**, which is the worst way to be wrong.

It now matches on **what marks a block**, its class or its `data-no-pane`
attribute, on whatever element carries it, and reads the tag name off the
element it found in order to slice to the matching close. See `elementsWithClass`
and `sliceElement` in `eleventy.config.js`.

The only enumerated list left is HTML's void elements, which is fixed by the
spec rather than by this project. **If you find yourself adding a tag name to a
list here, that is the bug.**

## 4. Surface inheritance, and where the line is

A block inside a pane inherits its surface through descendant selectors,
`.cs-pane--ink .cs-thing`. That reaches **text and hairlines**. It does not
reach a **painted ground**, which is structural.

The line is token availability, not selector cleverness. There is one deep
ground and no mist counterpart on ink, and there are two deep line weights.
So a block whose colours are all text and borders inherits; a block that paints
a background must be excluded, or given explicit variants.

Settled by building them: `stat`, `faq`, `pullquote` and the footnote marker
inherit. `table`, `takeaways`, `callout` and `related` are pane-excluded.
Excluded blocks declare `data-no-pane="<reason>"` on their wrapper and the
reason is carried into the build error, because a rule stated without its cause
is one someone will work around. Adding an excluded block is an attribute, not
a transform edit.

The rule that predicts this for unbuilt blocks is in SHORTCODES.md under
Surfaces. Settle it per block before building, not after.

## 5. outsideColumn has no context

`outsideColumn` lifts a block out of `.cs-article__column` so it can be full
bleed or main width. It does it by closing whatever column is currently open
and reopening one after.

**It does not know which column it closed.** Inside a pane it closes
`.cs-pane__inner`, and the block lands as a sibling of the pane's content with
no width constraint at all and its painted colours unmapped.

That is safe today only because every block that can reach that state is
pane-excluded and fails the build. A future block needing to break out from
*inside* a pane would need the helper to know its context. It does not.

## 6. The verify run, and the three scripts

`npm run verify` is self-contained: it builds, serves `_site` statically on
**port 8899**, runs all three checks against it, and tears the server down. It
stops at the first failure and exits non-zero on any of them, including a failed
build or a port already in use. `VERIFY_PORT` moves the port.

**It needs a server, and for a long time nothing started one.** The checks drive
a real browser against a real URL. The port lived in three script files and in
no document, so `npm run verify` died on the first script with
ERR_CONNECTION_REFUSED and CLAUDE.md's build workflow failed at step one.

**`eleventy --serve` is not a substitute, and this is the sharp edge.** Against
the dev server all ten fingerprint hashes differ from the committed baseline
while every element count lands exactly on its floor: same DOM, different
computed typography. The baseline was taken from a production build, so the run
has to be one, and a static file server over `_site` is what Cloudflare Pages is
anyway. Re-take the baseline the same way it is checked, never off the dev
server, or it stops describing what ships.

Each script still runs on its own against a server you already have, reading
`VERIFY_BASE`. That is the loop for working on one check.

Each answers a different question, and the failure mode all three exist to
prevent is **a check that passes having measured nothing**.

- **`verify:manifest`** asks *did exactly what we declared render*. Exact counts
  from `tools/verify/fixture.manifest.json`. It exists because the fixture
  silently lost a block three times: a markdown edit that matched nothing is
  indistinguishable from a block nobody asked for. Change the fixture, change
  the manifest, same commit.
- **`verify:sweep`** asks *is every element type present and on one left edge*.
  Declared minimums per type, so a selector that stops matching fails instead of
  reporting alignment across an empty set. It caught `related` rendering at the
  measure instead of main width.
- **`verify:fingerprint`** asks *did the five marketing pages move*. Typography
  hashes against a committed baseline, with a per-page element floor checked
  before any hash is trusted, because two empty pages hash identically.

Screenshot comparison is not a substitute. Results has lazy CDN images and two
captures of the same build differ.

## 7. Flow spacing has a principle, not a table

Three shapes, chosen by what a block belongs to:

- **Binds down**, more space above than below. A heading opens the section under
  it. 64/24 on h2, 40/16 on h3.
- **Binds up**, less space above than below. A list completes the sentence that
  introduces it. 16/28, and the tightening is done by the introducing paragraph
  closing at 16px, because margins collapse to the larger and a list cannot bind
  upward by opening tighter.
- **Symmetric**, belongs to neither neighbour. Panes at 64, everything
  self-contained at 40: stat, table, takeaways, callout, pullquote, related.

Margins collapse, so a gap is the larger of two values and not their sum.
Every number above is measured in the browser, not asserted.

## 8. Radius

`--radius-control` throughout, against the Component Reference's inline 8px.
The token set has exactly two radii and main.css states the rule as near-square
corners everywhere. The Reference uses 8px on every panel block, so this is
systemic rather than a one-off, which makes it a design system question rather
than a build one. Recorded in `table.css` and `faq.css`. If 8px is adopted it
needs a token and an amendment to that rule, not a literal per component.

## 9. Open questions

Not decided. Do not resolve any of these silently.

- **Should a deep-surface panel ground exist?** Four blocks are pane-excluded
  only because mist has no ink counterpart. One token would move most of them.
- **The 8px radius.** See above. A design system decision.
- **Should the article type scale live upstream?** Fourteen `--text-article-*`
  and `--tracking-article-*` tokens are repo-only, from the Component Reference
  rather than from `tokens/*.css`. They are invisible to the token
  reconciliation, which is how `--text-article-h3` sat at a wrong holding value
  for several commits.
- **Article URLs are temporary.** `/articles/pipeline-test/` is Eleventy's
  default permalink. No scheme, no redirects, no index page.
- **`epigraph` width is UNVERIFIED.** It carries the assumption `pullquote`
  carried, and that one was wrong. See SHORTCODES.md.
- **`src/articles/pipeline-test.md` is a disposable fixture**, not content. It
  exists to exercise every block and joint. Delete it when real articles land,
  and delete the manifest counts with it.
