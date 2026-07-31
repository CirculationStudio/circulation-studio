# Shortcode Vocabulary

Circulation Studio article system.
Version 1.0 draft, 2026-07-30.

## What this is

The contract between two systems that never talk to each other.

The **build** is deterministic. Marked-up markdown drops into the repo, Eleventy renders it through locked Nunjucks components. No intelligence.

The **authoring project** is a Claude.ai project that takes a raw or old article and outputs markdown marked up with these shortcodes. All the judgment about which block to reach for lives there.

Both sides reference this file and nothing else. If the components expect `{% stat value="68%" %}` and the authoring project writes `{% statcallout 68% %}`, nothing renders. That failure is silent in the authoring project and loud in the build, which is the wrong way round, so the vocabulary is fixed here first and neither side improvises.

Source of truth for the visual design remains the Claude Design Component Reference. This file governs naming and arguments only.

---

## Rules that apply to every shortcode

**Names are lowercase, single word, no hyphens.** `pullquote`, not `pull-quote` or `pullQuote`. Hyphens invite the authoring project to guess.

**Arguments are named, never positional.** `{% stat value="...", label="..." %}`, never `{% stat "..." "..." %}`. Positional arguments break the moment an argument is optional.

**Named arguments are comma separated.** Nunjucks requires it: `{% stat value="68%", label="...", source="..." %}`. Space separation fails the build with a parse error. This applies to paired shortcodes too; the pane escaped it only because it takes a single argument.

**Paired shortcodes wrap content.** `{% takeaways %}` ... `{% endtakeaways %}`. The content between is markdown and gets rendered as markdown.

**Any block carrying a number requires a `source`.** Not optional, not defaulted. `stat`, `chart`, `figure`, `metrics`, and `table` all fail the build without one. This is the house rule about sourcing made mechanical rather than remembered.

**Unverified values stay bracketed.** `value="[XX%]"` renders as written. The build does not validate bracket contents. Brackets are the signal to a human that this is not publishable yet, exactly as the Component Reference uses them.

**No shortcode sets its own width.** See Widths below.

**No shortcode sets its own surface.** See Surfaces below.

---

## Surfaces

Three registers: `paper` (default), `ink` (dramatic), `madder` (rarest).

**Surface is a property of a pane, not of a block.**

```
{% pane surface="ink" %}
Body copy here.

{% stat value="[XX min]", label="median first response", source="..." %}
{% endpane %}
```

Blocks inside inherit. Blocks outside are paper.

### Why it works this way, and what it costs

The alternative is `surface="ink"` on every block. That fails for a specific reason: the authoring project is a language model writing markdown, and requiring it to tag six blocks inside one pane with the same value is exactly the error it will make. One block missed means a paper-styled component sitting on an ink pane, which is your recurring scoping bug in its most literal form, and it will look deliberate enough to survive review.

Making the pane authoritative makes that state unreachable.

**The cost is a CSS change, and it must land before components are built.** The existing CSS uses modifier classes (`.cs-stat--on-deep`). Those stay. Descendant selectors get added alongside them:

```css
.cs-stat--on-deep,
.cs-pane--ink .cs-stat { ... }
```

This is additive. Nine component families are affected: button, card, content label, footnote ref, footnotes, inline link, link, pull-quote, stat. It is a selector list extension, not a rewrite, and the modifier classes remain available as an escape hatch for a one-off component outside a pane.

### The shape those selectors take

Established by `stat`, the first family to use it. The remaining eight copy this rather than each inventing one.

- **The modifier class and the pane-descendant selector are listed together**, never one replacing the other.
- **Properties are grouped by hierarchy step, not one rule per property.** In `stat` the value and the label share a rule because they are one step, statement; the source has its own because it is the other, attribution.
- **Surface selectors live with their component, never in a shared surface file.**

The reason for the last one: `.cs-pane--ink .cs-stat` describes how a stat behaves, not how ink behaves. It belongs to the component.

### Pane rules, enforced in the build

- `surface="paper"` is the default and needs no pane at all.
- **At most one `ink` pane per page.** Build warns on a second.
- **At most one `madder` pane per page.** Build warns on a second.
- Panes do not nest. Build fails on a nested pane.
- On `madder`, nothing carries ink or madder. Everything is paper. Enforced by CSS, not by the author.
- **A pane must be a top-level element in the article body.** It cannot sit inside a list item, a blockquote, or any other markdown block. The build wraps prose in a column and a pane closes that column before emitting itself, so a pane written inside another block makes markdown-it end the enclosing element early. The pane then renders correctly, as valid HTML, but it lands *after* the list or quote rather than inside it. This is an authoring rule and not a build check, because nothing in the output is malformed: a misplaced pane is indistinguishable from a correctly placed one once rendered.

Verified ratios, already confirmed and not to be re-derived:

| Pair | Ratio |
|---|---|
| ink on paper | 16.06:1 |
| slate on paper | 5.22:1 |
| ink 65% on paper | 5.28:1 |
| madder on paper | 8.06:1 |
| paper on ink | 16.06:1 |
| paper 55% on ink | 5.62:1 |
| madder-lift on ink | 4.82:1 |
| paper on madder | 8.06:1 |
| paper 72% on madder | 4.84:1 |
| madder on ink | 1.99:1, banned |
| ink on madder | 1.99:1, banned |

---

## Widths

Four widths exist. Three are tokens, one is the absence of a container.

| Name | Token | Value | Used for |
|---|---|---|---|
| measure | `--container-measure` | 66ch | Body prose, the reading column |
| narrow | `--container-narrow` | 880px | Pull quotes, statements, emphasis |
| main | `--container-main` | 1120px | Tables, figures, charts, metric rows |
| bleed | none | full | Panes, hero imagery |

**Width is a property of the block, not an author choice.** A pull quote is always narrow. A data table is always main. The authoring project does not get a `width` argument, because width is part of what the block *is*, and letting it be set per instance is how a system stops being a system.

The one exception is `image`, which takes `width="measure|narrow|main|bleed"` because in-article imagery legitimately varies by intent.

Each block's width is declared in the table below and is not overridable.

---

## Not shortcodes

These are frontmatter or frame. They are listed so the authoring project knows not to reach for a shortcode that does not exist.

**Frontmatter**, set once at the top of the file:

```yaml
---
title: The Yelp Ads benchmark report
deck: Here's what a dollar of Yelp Ads actually bought.
kind: whitepaper        # fieldnote | essay | guide | faq | whitepaper
header: feature         # standard | feature | compact | cover | glyph
image: /assets/...
imagealt: ...
author: connor          # keyed to a data file, never a free-text name
updated: 2026-07-30
readingtime: 18
dropcap: true           # once per piece, at the open only
reviewed: 2026-07
nextreview: 2027-01
changelog: /articles/.../changes/
cluster: measurement    # drives the related block
---
```

`header: cover` is the whitepaper cover treatment. `header: glyph` is the flagship glyph header, which is rare by rule, one flagship piece at a time, and only when a word in the title carries the meaning the glyph refers to.

`author` is a key, not a name. Author bios live in a data file so a bio is written once and rendered everywhere. Free-text author names in frontmatter are how you end up with three spellings of the same person.

**Frame**, rendered by the layout and never authored: masthead, breadcrumb, footer, colophon, reading progress.

**Prose** is plain markdown. `##` and `###` render as h2 and h3 at measure width. There is no `{% prose %}`.

---

## The vocabulary

Paired shortcodes are marked P. Child shortcodes are indented under their parent and are only valid inside it.

### Article

| Shortcode | Args | Width | P | Notes |
|---|---|---|---|---|
| `takeaways` | `title` | measure | P | Default title "The short version" |
| `toc` | `title` | measure | | Auto-built from h2. Default title "In this report" |
| `stat` | `value` `label` `source` | measure | | `source` required |
| `chart` | `title` `source` `caption` `number` | main | P | Content is a markdown table of label/value rows |
| `table` | `caption` `number` `source` `kind` | main | P | `kind="comparison"` or `kind="data"`. Content is a markdown table |
| `pullquote` | `attribution` | narrow | P | |
| `screenshot` | `src` `alt` `caption` `number` | main | | Unretouched captures only |
| `image` | `src` `alt` `caption` `width` | varies | | Only block with author-set width |
| `aside` | `author` `label` | measure | P | Personal voice. Keeps its madder edge bar |
| `tool` | `name` `description` `url` `label` | measure | | Default label "Open the tool" |
| `faq` | `title` | measure | P | |
|   `qa` | `q` | | P | Content is the answer |
| `newsletter` | `copy` `label` | measure | | Default label "Get the notes" |
| `signednote` | `author` | measure | P | Uses author key, renders signature |
| `footnotes` | | measure | P | |
| `related` | `cluster` `title` | main | | Pulls from `cluster` frontmatter if omitted |

**Inline:** `{% fn n="1" %}` places a footnote marker in running prose. The only inline shortcode in the vocabulary.

### Guide

| Shortcode | Args | Width | P | Notes |
|---|---|---|---|---|
| `beforeyoustart` | `time` | measure | P | `time` is prose, "About 30 minutes" |
|   `need` | | | P | Content is a markdown list |
|   `goodtoknow` | | | P | |
| `step` | `n` `title` `src` `alt` `caption` | measure | P | Content is the instruction |
| `youredone` | `title` | measure | P | Default title "You're done" |
|   `exit` | `kind` `label` `url` | | | `kind="guide" | "tool" | "us"` |

### Whitepaper

| Shortcode | Args | Width | P | Notes |
|---|---|---|---|---|
| `execsummary` | `title` | measure | P | Default title "Executive summary" |
| `methodology` | `title` | measure | P | |
|   `method` | `label` | | P | Sample, Collection, Normalization, Limitations |
| `figure` | `number` `caption` `source` | main | P | `source` required |
| `references` | `title` | measure | P | |
|   `ref` | | | P | One per source, numbered automatically |

### Data

| Shortcode | Args | Width | P | Notes |
|---|---|---|---|---|
| `metrics` | `title` `subtitle` `source` | main | P | `source` required |
|   `metric` | `value` `label` | | | |

### Editorial and utility

| Shortcode | Args | Width | P | Notes |
|---|---|---|---|---|
| `epigraph` | `attribution` | narrow | P | |
| `callout` | `label` | measure | P | Closed set, see below |
| `glossary` | `title` | measure | P | |
|   `term` | `word` | | P | Content is the definition |

**`callout` labels are a closed set of four.** The build rejects anything else.

| Label | Use |
|---|---|
| `Note` | Information the reader needs to read the rest correctly |
| `Tip` | Optional improvement. Skipping it costs nothing |
| `Caveat` | A limit on what was just claimed |
| `Watch out` | A mistake that costs the reader something. Guides only |

`Watch out` is restricted to guides because in an article there is no action to get wrong.

The personal `aside` is not a callout. Callouts are informational and carry a label bar. Asides are a named human speaking and carry a madder edge bar. Keeping them separate is the reason both read as deliberate.

---

## Four decisions that are yours

**1. `dropcap` as frontmatter or shortcode.** I made it frontmatter, because the rule is one per piece at the open only, and frontmatter makes a second one unrepresentable. A shortcode would let the authoring project place two. Frontmatter is more restrictive and I think that is right, but it does mean the drop cap can only ever open the piece, and if you ever want one opening a major section you would need to change this.

**2. `toc` auto-built from h2.** I made it automatic. The alternative is the author listing entries, which drifts from the headings the moment anyone edits. Automatic means the TOC cannot lie. The cost is that you cannot hand-curate which sections appear.

**3. `table` as one shortcode with a `kind`, rather than two.** Comparison and data tables differ in styling, not structure. One shortcode with a variant keeps a single markdown table syntax for the author. If they diverge later, split them.

**4. Whether `stat` and `metrics` should merge.** They are close: both are big numbers with labels and a source. The Component Reference keeps them apart, with `stat` for a single finding in running prose and `metrics` for a row of headline figures. I kept the split because their widths differ, measure against main, and merging them would require a width argument, which breaks the rule above. Worth a look when the components are built.

---

## Open before the authoring project is built

- The `image` block is the only one with an author-set width. Watch whether that stays justified once real articles exist.
- `related` needs a cluster taxonomy that does not exist yet. Until it does, `related` requires explicit items.
- The Component Reference has no `container-narrow` counterpart, so pull quote and epigraph widths are set here from repo evidence rather than from the reference. Confirm visually once components are built.
