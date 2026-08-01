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

## 6. The verify run, and the five scripts

`npm run verify` is self-contained: it runs the contract check, then builds,
serves `_site` statically on **port 8899**, runs the four browser checks
against it, and tears the server down. It stops at the first failure and exits
non-zero on any of them, including a failed build or a port already in use.
`VERIFY_PORT` moves the port.

The contract check is first because it needs neither a build nor a server, and a
spec mismatch should not wait for a browser to start.

**It needs a server, and for a long time nothing started one.** The checks drive
a real browser against a real URL. The port lived in three script files and in
no document, so `npm run verify` died on the first script with
ERR_CONNECTION_REFUSED and CLAUDE.md's build workflow failed at step one.

It builds so that verify measures the artifact that ships, and a static file
server over `_site` is what Cloudflare Pages is. Re-take the fingerprint
baseline through it for the same reason.

Each script still runs on its own against a server you already have, reading
`VERIFY_BASE`. That is the loop for working on one check.

### Dev and production render identically, and proving it took a diagnosis

**This matters beyond the tooling: every visual review on this project has been
done on the dev server, and those reviews were of what ships.**

It did not look that way. All ten fingerprint hashes differed against
`eleventy --serve` while every element count landed exactly on its floor, which
says the DOM is identical and only computed typography moved. Three fields
differed and no others: `color` on 187 elements, `maxWidth` on 38,
`letterSpacing` on 8. Neither a build difference nor a rendering difference. The
page was being measured before it had finished becoming itself, for two separate
reasons.

**`document.fonts.ready` cannot be trusted here, because it succeeds on an empty
set.** It resolves when every face the document currently knows about has
settled, so a document that knows about no faces has nothing outstanding and
reports "loaded" immediately. At the same instant in the same page's life,
production had 27 faces registered and the dev server had 6, with none of the 21
Lora faces present, and `document.fonts.status` read "loaded" in both. That is
the same vacuous pass the three checks exist to prevent, wearing a wait's
clothing rather than an assertion's.

Production serves a real `<link rel="stylesheet">`, so the stylesheet and the
Google Fonts sheet it `@import`s are both there before DOMContentLoaded. The dev
server ships no stylesheet link at all: Vite delivers CSS as a JS module that
injects a `<style>` element when it evaluates, which is after DOMContentLoaded,
and the nested `@import` is only discovered then. Lora missing means `ch` resolves
against Georgia, which is the entire `maxWidth` column: 66ch came out 729.158px
instead of 737.748px.

**The second reason is a transition, and it is why the colours moved.** Applying
that injected stylesheet changes computed values on elements that already exist,
and a changed animatable property with a transition on it animates. On the second
and later navigations in one browser context, 28 CSSTransitions were running,
covering color, opacity, transform, visibility, background-color and four border
colours, against zero in production. The skip link was caught mid interpolation
reading `rgb(0, 0, 238)`, then `rgb(27, 17, 74)`, then `rgb(32, 21, 40)`, landing
on its real `rgb(33, 21, 35)` about 150ms later, with the stylesheet unchanged
throughout at 22 rules. Production never shows this because an element's first
computed style is already the author's, so there is nothing to animate away from.

`tools/verify/readiness.mjs` asserts both preconditions by name before any
measurement, and the three checks that existed then return identical results
from a production build and from `eleventy --serve`. `verify:contrast` was
written afterwards against the same assertion and imports it like the rest.

**It deliberately does not wait on `networkidle`.** That would also have made the
numbers agree, and it is the wrong instrument: Playwright discourages it, and it
asserts that the network went quiet, which is not the thing being relied on. What
is relied on is that the faces are registered and nothing is still moving. Both
are observable directly, so both are observed, and a failure names which one was
missing rather than reporting that something was still busy.

Each answers a different question, and the failure mode they all exist to
prevent is **a check that passes having measured nothing**.

- **`verify:manifest`** asks *did exactly what we declared render, is it the
  size it claims, and is it the shape it claims*. Exact counts from
  `tools/verify/fixture.manifest.json`, plus each block's signature type and
  layout measured at 1440 and 390. See section 9 for the class of defect the
  layout half exists for. It exists
  because the fixture silently lost a block three times: a markdown edit that
  matched nothing is indistinguishable from a block nobody asked for. Change the
  fixture, change the manifest, same commit.

  **The typography half closes a blind spot every other script shared.** Two
  defects shipped through every one of them: two component stylesheets were
  never imported, and `.cs-article h2` outranked six blocks' labels. Both
  rendered, both counted, both aligned on the prose edge, because an unstyled
  block is still a block in the right place. Nothing measured whether a block's
  type was the size it claimed. The declared values live in the manifest and are
  never read back from the component CSS, because comparing a computed value to
  the rule that produced it proves only that the browser works. Each entry
  records where its value came from, the Component Reference or a repo
  decision.
- **`verify:sweep`** asks *is every element type present and on one left edge*.
  Declared minimums per type, so a selector that stops matching fails instead of
  reporting alignment across an empty set. It caught `related` rendering at the
  measure instead of main width.
- **`verify:contrast`** asks *is every text token legible on every surface it
  can land on, and is anything landing somewhere nobody declared*. Two halves.
  The **matrix** is declared: each token names the surfaces it is allowed to
  reach, and a token with no declared surfaces fails rather than being skipped,
  so adding one forces the decision instead of deferring it. The **live scan**
  walks every text-carrying element on all eight built pages, takes its computed
  colour and the first opaque background above it, composites any alpha, and
  measures. That is the half that catches a token somewhere the matrix never
  imagined. Both banned pairs, madder on ink and ink on madder at 1.99:1, are
  asserted absent rather than assumed absent. Thresholds are WCAG AA, 4.5:1
  normal and 3:1 for large at 24px or 18.66px bold. Values are read from
  `main.css`, because a checker holding its own copy of a colour is a third
  place for it to drift.

  **It exists because every ratio here was computed by hand once and never
  checked again.** `--text-faint` shipped at `.45`, which is 2.86:1 on paper,
  failing AA and failing even the large-text exemption that does not apply to
  text set at 11px, on the byline and captions of five live pages. It was found
  by reading a token file for an unrelated reason, which is not a process.

  **It found a real defect on its first run that the other four could not
  see.** `.cs-faq__title` had been given an explicit colour two commits
  earlier, making it ink on an ink pane at 1.00:1, invisible, and ink on madder
  at 1.99:1, banned outright. The block rendered, counted, sat on the left edge
  and measured at its declared type size, so manifest, sweep, fingerprint and
  contract all passed it. Colour is the one property none of them read. See
  section 9.
- **`verify:fingerprint`** asks *did the five marketing pages move*. Typography
  hashes against a committed baseline, with a per-page element floor checked
  before any hash is trusted, because two empty pages hash identically.
- **`verify:contract`** asks *do SHORTCODES.md and the build still agree*. Both
  directions, on names, arguments, required flags, pairing, parentage and closed
  sets. It exists because the spec fails silently where the build fails loudly:
  the authoring project is a language model writing markdown against that file
  and gets no feedback at all, so drift only surfaces as a rejected build nobody
  is watching. It reads the build by running the config against a recording stub
  and calling each shortcode with a Proxy, rather than by parsing source, so it
  cannot hold a stale copy of what it checks.

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

## 8. Which artefact wins, and why the six happened

Read the design system directly on 2026-08-01 through `/design-sync` rather than
from summaries of it. The picture is not the one the register described, and the
correction matters more than any of the six decisions it settles.

### There are three artefacts, not two, and the third is not in the design system

1. **`design.md`**, in the Claude Design project. Rules and prohibitions,
   marked LOCKED per section, with an explicit precedence claim of its own: "if
   any file, card, or generated text conflicts with this document, this document
   wins."
2. **`tokens/*.css` and `components/components.css`**, in the same project. The
   machine-readable system. This is what `/design-sync` pulls.
3. **The Component Reference.** Not in the design system project. Every disputed
   value came from here, and it can only be read by hand.

**On all six disagreements, artefacts 1 and 2 agree with each other.** They are
not in conflict. The conflict is between the design system and a fourth thing
that sits outside it:

- Radius. `design.md` section 4 LOCKED says "Corners 2px". `tokens/layout.css`
  says `--radius-control:2px` with the comment "near-square engraved-plate
  corners everywhere, buttons included". `components/components.css` uses
  `var(--radius-control)` on every component it defines. Three for 2px.
- Motion. `design.md` section 5 LOCKED says 140ms and 220ms.
  `tokens/layout.css` carries `--dur-fast:140ms` and `--dur-snap:220ms` and
  nothing between. Two for 140.
- Button variants. `design.md` section 6 says "LOCKED SET, nothing else" and
  "never invent inline". `components/components.css` carries exactly primary,
  secondary, ghost, deep. Nothing anywhere in the project carries an on-accent
  variant.

### The rule

**The design system wins. `design.md` first, then the tokens and
`components.css`, which have not yet been caught disagreeing with it.**

**The Component Reference is authoritative only where the design system is
silent.** Silence is not prohibition, and most of this article system lives in
that silence: `design.md` section 6's long-form set is `.cs-pullquote`,
`.cs-stat`, `.cs-fnref`, `.cs-footnotes` and `.cs-contentlabel`. takeaways,
callout, faq, table, related, execsummary, methodology, references, observed,
cover and cta are all outside it. They are legitimate because nothing rules them
out, and every one of them is a proposal in the sense section 6 means.

**Where the design system speaks, it wins even at scale.** Thirteen panel blocks
drawn at 8px is not thirteen votes; it is one artefact repeated. Uniformity is
what an unexamined default looks like, and the token set corroborates that
reading: there is a control radius and a pill radius and no panel radius at all,
because a panel radius was never a decision.

**A stated rule is amended, not worked around.** Sentence case for titles in a
list contradicts section 2. It is written up as an amendment, applied in one
place, and flagged, rather than quietly done everywhere.

### What stops the next six

The six were all found by building. That is the actual defect: **the artefact
carrying the most values is the one nothing can check.**

- **The Component Reference is not in the design system.** Nothing syncs it,
  nothing diffs it, and reading it is a person's job. This is why a summary of
  it put an ink-pane button on a madder pane. Everything in it that is real
  should move into `components/components.css` and `tokens/*.css`, where
  `/design-sync` can see it, and what is left should be understood as sketches.
- **The article type scale is repo-only.** Fourteen `--text-article-*` and
  `--tracking-article-*` values, taken from the Reference by hand.
  `tokens/typography.css` carries `--text-h1/h2/h3/base/caption` and nothing
  else, so the article scale is invisible to reconciliation. That is how
  `--text-article-h3` sat at a wrong holding value for several commits. **It
  should be promoted into `tokens/typography.css`.** That is an upstream change
  this repo cannot make; until it happens the tokens are marked in `main.css` so
  a sync can see which are unreconciled.
- **The tokens are not clean either.** `tokens/typography.css` still carries
  `--text-base:17px` while the build ships 18px, which DESIGN_SYSTEM.md records
  as Reference drift corrected on 2026-07-30. The correction never went
  upstream. So the token file is stale in at least one place, and "the tokens
  win" is a rule with a known exception already.
- **Names differ across the boundary.** Upstream is `--track-caps`, `--measure`,
  `--ink`. The repo is `--tracking-caps`, `--container-measure`, `--color-ink`.
  The rename is done by hand at sync time and nothing checks it.

### The register, now closed upstream

Written into `design.md` on 2026-08-01 through `/design-sync`, so the next
person reading the rules gets the answer instead of rediscovering the question.

| Where | Resolved | Where it is now written |
|---|---|---|
| Radius | **Design system.** 2px everywhere | `design.md` section 4 says panels and long-form blocks included, and that an 8px comp is a drawing default rather than an amendment |
| Motion | **Design system.** 140 and 220 | `design.md` section 5 says there is no third duration and a component seeming to want one takes 140 |
| Button variants | **Reference.** The list was incomplete | `design.md` section 6 names seven, and records that the shorter list was read as complete and put an ink-pane button on a madder pane |
| Titles in a list | **Amendment approved** | `design.md` section 2, as the Case rule, not a note |
| faq question | **Reference**, by silence | Unchanged in the build; nothing upstream to write |
| faq title | **Repo.** Heading kept, scale replaced | Unchanged upstream; the Reference has no faq block to disagree with |

**The article type scale is promoted.** All fourteen values now live in
`tokens/typography.css`, so `/design-sync` covers them and the reconciliation can
see them. They had lived only in this repo since the article system was built.

### Two things still open, and the first is the important one

**`components/components.css` does not carry the on-accent variants.** They are
named in `design.md` section 6 and running in this build from a local copy in
`button.css`, so a sync will not deliver them. `on-deep-primary` is named
upstream and implemented nowhere: no values were ever supplied for it, and by
symmetry it would be a paper fill with an ink label hovering to mist with
ink-press, but a derived value is not a specified one. Naming a variant without
implementing it is the same failure as implementing one without naming it, in
the other direction, and `design.md` now says so about itself.

**Both LOCKED token corrections are promoted, 2026-08-01.** `--text-base` is
18px in `tokens/typography.css` and in `design.md` section 2; `--text-faint` is
`rgba(33,21,35,.65)` in `tokens/colors.css`. Both had been corrected in this
build on 2026-07-30 and neither correction had reached the design system, so the
next sync would have pulled both backwards. Each upstream comment records the
direction: corrected in the build first, promoted after, because the running
site was the reviewed artefact and the token file was the stale copy.

`--text-faint` was an accessibility correction rather than a preference, and the
comment carries the measurements so nobody lightens it back for tone. At `.45`
it was 2.86:1 on paper, 2.80:1 on mist and 2.91:1 on white, failing AA and also
failing the 3:1 large-text exemption, which does not apply anyway to text set at
11px to 13px. At `.65` it is 5.28, 5.05 and 5.47. Verified independently here
before it was written upstream, not taken on report.

**Names still diverge across the boundary.** Upstream is `--track-caps`,
`--measure`, `--ink`; this repo is `--tracking-caps`, `--container-measure`,
`--color-ink`. The promoted article tokens land as `--track-article-*` and are
consumed here as `--tracking-article-*`. The rename is done by hand at sync time
and nothing checks it.

### What actually stops the next six

Not the register. The register is a list of things already found by building.

**The Component Reference is not in the design system.** Nothing syncs it,
nothing diffs it, and reading it is a person's job, which is why a summary of it
put the wrong button on a madder pane and why fourteen type tokens went
unreconciled for the life of the article system. Every value in it that is real
belongs in `components/components.css` and `tokens/*.css`, where `/design-sync`
can reach it. What remains after that move is a set of sketches, and should be
read as sketches.

That is the whole answer. Two artefacts cannot be reconciled by writing a third
document about their differences; they are reconciled by making one of them
machine-readable.

## 9. Prose rules are scoped, components neutralize the base, and an explicit colour stops inheriting

Four defects in a row came from one shape: a rule written for prose reaching
into a component and outranking the component's own rule. None of them failed a
check, because the block still rendered, still counted and still sat on the left
edge. Two rules came out of that, both learned the expensive way. A third rule
below is a different shape with the same silence.

**A prose rule is scoped to a direct child of `.cs-prose`.** Not to
`.cs-article`, which is one class plus one type and therefore beats any
component's single-class rule. This bit three times:

- `.cs-article h2` outranked six blocks' labels, so takeaways, faq, related,
  execsummary, methodology and references all rendered their labels at the 22px
  section scale. takeaways.css carried a comment explaining that it is a panel
  label at 14px, and that comment had never been true.
- `.cs-article ul, .cs-article ol` outranked `.cs-references__list`, which
  declared gap 12px and padding-left 24px and rendered 8px and 20px. Two-digit
  markers then did not fit the padding and reference 10 sat flush to the column
  edge.
- The same rule was the reason the footnotes list looked right: it was borrowing
  prose values. When the rule was scoped, longform.css had to state them.

A nested list inside a prose list is still prose, which is why the selector is
`.cs-prose > :is(ul, ol) :is(ul, ol)` and not just the direct child.

**A component element that renders as a prose tag but is not prose must
neutralize the base rules.** `base/elements.css` gives every `p` a
`max-width: 66ch`, and `ch` resolves against the element's OWN font, so a label
at 10px is capped at 468.6px rather than at a reading measure. On
`.cs-callout__label`, which paints a bar across its block, that left the bar at
63% of the callout with bare paper beside it. `max-width: none`, the call
`eyebrow.css` documents and `pullquote` makes.

Audited: of 55 non-prose elements across the site that render as `p`, `li`,
`ol`, `ul` or a heading, 13 inherit that cap and exactly one paints a ground.
The other 12 are text where a measure cap is harmless. Inheriting it is still
fragile, because the value depends on a font size the component may change.

**Both classes are now asserted.** The fixture manifest declares each block's
signature type and layout, so a rule that loses to a broader selector fails the
manifest instead of waiting for someone to look at the right block at the right
width. The callout bar was invisible below 469px of block width; the assertion
catches it at 390 where the eye cannot.

**An element that inherits a colour becomes wrong the moment it is given one.**
Inheritance follows the surface and a specified value does not. An element with
no `color` of its own takes the pane's on every surface, correctly and for free,
and the first person to set an explicit colour on it silently opts it out of all
of them. Three instances:

- **Prose links inside a pane.** `base/elements.css` gives every `a` the madder
  link token, which is 1.99:1 on ink. The headings and body copy beside them
  needed no rule at all, because they had never been given a colour. pane.css
  maps the link on both deep surfaces and leaves the accent in the underline.
- **`.cs-qa__a`, the faq answer.** It carried no colour, so it inherited, and it
  looked deliberate. Correcting it to slate against the Reference was right, and
  it created the need for an on-deep mapping that had not existed, which is why
  that rule in faq.css postdates the block it belongs to.
- **`.cs-faq__title`.** The panel-label change gave it `color: var(--text-body)`,
  which is ink everywhere: ink on an ink pane at 1.00:1, invisible, and ink on
  madder at 1.99:1, banned outright. It had inherited the pane's paper before, so
  faq.css mapped the title's border on deep surfaces and had never needed to map
  its text.

The defect is not the explicit colour. All three were correct in isolation and
correct on paper, which is where they were reviewed. The defect is that setting
a colour is a surface change wearing a typography change's clothes, and nothing
about writing the line looks like it. So: **a colour added to anything that can
sit in a pane carries its on-deep and on-accent mappings in the same edit**, and
a block that paints instead declares `data-no-pane` and is excluded.

**This class is asserted by `verify:contrast` and by nothing else.** The title
rendered, counted, aligned and measured at its declared size through all four of
the other checks. See section 6.

## 10. Open questions

Not decided. Do not resolve any of these silently.

- **Should a deep-surface panel ground exist?** Four blocks are pane-excluded
  only because mist has no ink counterpart. One token would move most of them.
- **The 8px radius.** See above. A design system decision.
- **Should the article type scale live upstream?** Fourteen `--text-article-*`
  and `--tracking-article-*` tokens are repo-only, from the Component Reference
  rather than from `tokens/*.css`. They are invisible to the token
  reconciliation, which is how `--text-article-h3` sat at a wrong holding value
  for several commits.
- ~~**Article URLs are temporary.**~~ **Decided.** Two tiers, one flat segment
  each: `/yelp/<slug>/` for Yelp Hub spokes and `/library/<slug>/` for
  everything else. Membership follows location, permalinks come from each
  directory's `11tydata.js`, and cluster membership is carried by internal
  linking and schema rather than by the path, so reorganising a content map
  never becomes a redirect. `/yelp/` itself is the hub page and is not built
  yet. The migration redirect map is still to be collected, see `src/_redirects`.
- **`epigraph` width is UNVERIFIED.** It carries the assumption `pullquote`
  carried, and that one was wrong. See SHORTCODES.md.
- **Two disposable fixtures**, not content. `src/library/pipeline-test.md`
  exercises every block that lives in a prose column;
  `src/library/whitepaper-test.md` exercises the cover, which cannot share a
  page with the sweep's one-left-edge assertion because a cover panel indents
  its own heading. Delete both when real articles land, and delete their
  manifest pages with them.
