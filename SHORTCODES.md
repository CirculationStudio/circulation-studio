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

**Any block carrying a number requires a `source`.** Not optional, not defaulted. `stat`, `chart`, `figure` and `metrics` all fail the build without one. This is the house rule about sourcing made mechanical rather than remembered.

`table` is conditional on its `kind`, because the rule is about numbers and not about blocks. `kind="data"` fails the build without a source. `kind="comparison"` is qualitative, often carries no number at all, and a source there would be an empty ritual. `kind` defaults to `data`, the stricter of the two, so a forgotten `kind` fails for a missing source rather than silently opting out of the rule.

**Unverified values stay bracketed.** `value="[XX%]"` renders as written. The build does not validate bracket contents. Brackets are the signal to a human that this is not publishable yet, exactly as the Component Reference uses them.

**No shortcode sets its own width.** See Widths below.

**No shortcode sets its own surface.** See Surfaces below.

**No shortcode sets its own number.** Table, figure, chart, screenshot and footnote numbers are assigned by the build in document order, for the same reason as footnotes above: a block cannot know its own position, and hand-written numbers make a mid-document insertion a silent renumbering job. Each label counts in its own sequence, so a document mixing them reads Table 1, Table 2 alongside Figure 1, Figure 2 rather than sharing one run.

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

### Which blocks can inherit a surface at all

Blocks styled **only in text colour** inherit a surface through descendant selectors, because `.cs-pane--ink .cs-stat` reaches every colour the component has.

Blocks that **paint something**, a background, a border, a fill, are surface-blind: those colours are structural and do not follow the pane. A table keeps its mist header row and its hairline border on an ink ground, which is how paper text lands on mist at 1.12:1.

Any block that paints therefore needs explicit surface variants or must be excluded from panes. Affects `table`, `chart`, `figure`, `callout`, `tool` and the whitepaper cover. `faq` was on this list and has come off it: it draws hairlines and text and nothing else, so descendant selectors reach every colour it has and it inherits a surface correctly. Settled by building it. This is the distinction that predicts which blocks are safe inside a pane, and it should be settled per block before the block is built rather than discovered afterwards.

### Pane rules, enforced in the build

- `surface="paper"` is the default and needs no pane at all.
- **At most one `ink` pane per page.** Build warns on a second.
- **At most one `madder` pane per page.** Build warns on a second.
- Panes do not nest. Build fails on a nested pane.
- On `madder`, nothing carries ink or madder. Everything is paper. Enforced by CSS, not by the author.
- **A pane contains reading-column content only.** Blocks that sit at `--container-main` (`table`, `chart`, `figure`, `metrics`, `screenshot`, `related`) cannot go inside one and fail the build.

  Two reasons. The Component Reference specifies only measure-width components on ink and madder: heading, prose, inline link, buttons, source line, content label, stat, pull-quote. It gives no deep surface treatment for a table header, a figure border or a chart ground, so any would be invented. And a pane is at most one per page, reserved for the single most important moment, which is not where reference material belongs.

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

Three widths exist. Two are tokens, one is the absence of a container.

| Name | Token | Value | Used for |
|---|---|---|---|
| measure | `--container-measure` | 66ch | Body prose, the reading column |
| main | `--container-main` | 1120px | Tables, figures, charts, metric rows |
| bleed | none | full | Panes, hero imagery |

**Width is a property of the block, not an author choice.** A data table is always main. The authoring project does not get a `width` argument, because width is part of what the block *is*, and letting it be set per instance is how a system stops being a system.

The one exception is `image`, which takes `width="measure|main|bleed"` because in-article imagery legitimately varies by intent.

**`narrow` is gone from this table, and `--container-narrow` is not.** No article block uses 880px. `pullquote` was the block the width existed for and it turned out to be measure, read off the Reference's own `max-width: none`. The token stays because it is live on four marketing pages, carrying pull quotes and statements there, so it is a marketing-page width rather than an article one. A block that wants it should add the row back with evidence, the way the pullquote correction was made: a value from the Reference or from the implementation, not an assumption.

Each block's width is declared in the table below and is not overridable.

**Correction, `pullquote` is measure and not narrow.** The vocabulary said narrow. The Component Reference's own CSS sets `max-width: none` on `.cs-pullquote`, which means it fills whatever column contains it, and in an article that column is the measure. Nothing in the Reference gives it an 880px cap. Corrected against the implementation rather than the table.

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
changelog: /library/.../changes/
cluster: measurement    # drives the related block
---
```

`header: cover` is the whitepaper cover treatment. `header: glyph` is the flagship glyph header, which is rare by rule, one flagship piece at a time, and only when a word in the title carries the meaning the glyph refers to.

**`header: cover` replaces the standard header outright**, and is the only treatment that is a component rather than a heading scale. It is driven entirely by frontmatter keys already listed above, and it adds none:

| Slot | Key |
|---|---|
| Top left | `kind` |
| Top right | `updated`, as a calendar date |
| Title | `title` |
| Deck | `deck` |
| Meta, column 1 | `author`, resolved to a display name |
| Meta, column 2 | `readingtime` |
| Meta, column 3 | `reviewed` |

Each meta column renders only if its key has a value, so a piece without a reading time gets two filled cells rather than a labelled blank. There is no `edition` key: the Reference calls the top-right slot "edition/date" and the date is what fills it. An explicit edition string would be a new frontmatter key and a row here, not a silent addition.

`author` is a key, not a name. Author bios live in a data file so a bio is written once and rendered everywhere. Free-text author names in frontmatter are how you end up with three spellings of the same person.

**Frame**, rendered by the layout and never authored: masthead, breadcrumb, footer, colophon, reading progress.

**Prose** is plain markdown. `##` and `###` render as h2 and h3 at measure width. There is no `{% prose %}`.

---

## The vocabulary

**Only LIVE shortcodes may be used in articles.** A PLANNED row describes intended behaviour and is not implemented. Reaching for one does not degrade, it fails the build: an unknown Nunjucks tag throws at parse time. Roughly forty are designed here and thirteen exist, so the distinction is most of the table.

PLANNED rows are not deletable. They are the vocabulary design and the roadmap, and they are what stops the same block being reinvented under a different name later.

Reading the tables:

- **Status** is LIVE or PLANNED, and `tools/verify/contract.js` asserts it in both directions. A LIVE row that is not registered fails, and a registered shortcode that is missing or marked PLANNED fails.
- **A bold argument is required** and the build fails without it. A plain one is optional. This is also checked against the implementation, by omitting each argument in turn and seeing whether the build objects.
- **Paired shortcodes are marked P.** The content between the tags is markdown.
- **Child shortcodes are indented** under their parent and are only valid inside it. The build catches orphans in the output.
- Arguments belonging to a closed set are listed under Closed sets below.

### Article

| Shortcode | Status | Args | Width | P | Notes |
|---|---|---|---|---|---|
| `pane` | LIVE | `surface` | bleed | P | Surface is a property of the pane, never of a block. See Surfaces |
| `takeaways` | LIVE | `title` | measure | P | Default title "The short version" |
| `toc` | PLANNED | `title` | measure | | Auto-built from h2. Default title "In this report" |
| `stat` | LIVE | **`value`** **`label`** **`source`** | measure | | All three required. A stat with no figure is a labelled nothing, and a figure with no label is an unexplained number |
| `chart` | PLANNED | `title` **`source`** `caption` | main | P | Content is a markdown table of label/value rows |
| `table` | LIVE | `caption` **`source`** `kind` | main | P | `source` is required for `kind="data"` only, and `data` is the default, so a forgotten `kind` fails for a missing source. Content is a markdown table |
| `pullquote` | LIVE | `attribution` | measure | P | Fills the reading column, see note below |
| `screenshot` | PLANNED | `src` `alt` `caption` | main | | Unretouched captures only |
| `image` | PLANNED | `src` `alt` `caption` `width` | varies | | Only block with author-set width |
| `aside` | PLANNED | `author` `label` | measure | P | Personal voice. Keeps its madder edge bar |
| `tool` | PLANNED | `name` `description` `url` `label` | measure | | Default label "Open the tool" |
| `faq` | LIVE | `title` | measure | P | |
|   `qa` | LIVE | **`q`** | | P | Content is the answer |
| `newsletter` | PLANNED | `copy` `label` | measure | | Default label "Get the notes" |
| `signednote` | PLANNED | `author` | measure | P | Uses author key, renders signature |
| `footnotes` | LIVE | | measure | P | Contains `note` children |
|   `note` | LIVE | **`id`** | | P | Content is the note. Numbered automatically |
| `fn` | LIVE | **`id`** | inline | | The only inline shortcode. Places a footnote marker in running prose |
| `related` | LIVE | `title` | main | P | Contains `item` children. See the note below |
|   `item` | LIVE | **`kind`** **`title`** **`url`** | | | All three required |

**`related` items are explicit for now.** The entry above described `related` as pulling from a `cluster` frontmatter taxonomy. That taxonomy does not exist: no article declares a cluster, there is no index to query, and nothing maps a cluster to a set of articles. Building the mechanism before the taxonomy would mean inventing both, so each item is written out with its own `kind`, `title` and `url`. When clusters exist, `related` gains a `cluster` argument and the explicit form stays as the override.

**Inline:** `{% fn id="bringhurst" %}` places a footnote marker in running prose. The only inline shortcode in the vocabulary, and the reason it takes no blank lines around it: a blank line closes an HTML block, and a marker separated by one would be lifted out of its paragraph.

**Footnotes are named, never numbered, and the build assigns every number.** A marker carries an `id` and the matching `{% note id="..." %}` carries the same one. Markers are numbered by order of appearance in the page, the notes are sorted to match, and each is linked to the other in both directions.

Two reasons, either sufficient. A shortcode cannot know its own position: a parent receives a finished string rather than a list of children, and a marker in running prose has no parent at all. And an explicit number turns inserting a footnote mid-document into a renumber of everything after it, which is the edit an authoring language model will most reliably get wrong and least reliably notice.

The build fails on a marker with no note, a note with no marker, or a duplicate id.

### Guide

| Shortcode | Status | Args | Width | P | Notes |
|---|---|---|---|---|---|
| `beforeyoustart` | PLANNED | `time` | measure | P | `time` is prose, "About 30 minutes" |
|   `need` | PLANNED | | | P | Content is a markdown list |
|   `goodtoknow` | PLANNED | | | P | |
| `step` | PLANNED | `n` `title` `src` `alt` `caption` | measure | P | Content is the instruction |
| `youredone` | PLANNED | `title` | measure | P | Default title "You're done" |
|   `exit` | PLANNED | **`kind`** **`label`** **`url`** | | | `kind` is a closed set, see below |

### Whitepaper

| Shortcode | Status | Args | Width | P | Notes |
|---|---|---|---|---|---|
| `execsummary` | LIVE | `title` | measure | P | Default title "Executive summary". Label is madder, unlike `takeaways` which is ink: an executive summary outranks a takeaways panel |
| `methodology` | LIVE | `title` | measure | P | Default title "Methodology" |
|   `method` | LIVE | **`label`** | | P | Free text, NOT a closed set. The Reference's Sample/Collection/Normalization describes a survey; real documents label where the evidence came from |
| `figure` | PLANNED | `caption` **`source`** | main | P | Numbered automatically |
| `references` | PLANNED | `title` | measure | P | |
|   `ref` | PLANNED | | | P | One per source, numbered automatically |

### Data

| Shortcode | Status | Args | Width | P | Notes |
|---|---|---|---|---|---|
| `metrics` | PLANNED | `title` `subtitle` **`source`** | main | P | |
|   `metric` | PLANNED | `value` `label` | | | |

### Editorial and utility

| Shortcode | Status | Args | Width | P | Notes |
|---|---|---|---|---|---|
| `epigraph` | PLANNED | `attribution` | UNVERIFIED | P | Assumed narrow. `pullquote` carried the same assumption and turned out to be measure |
| `callout` | LIVE | **`label`** | measure | P | Closed set, see below |
| `glossary` | PLANNED | `title` | measure | P | |
|   `term` | PLANNED | `word` | | P | Content is the definition |

**`callout` labels are a closed set of four.** The build rejects anything else.

| Label | Use |
|---|---|
| `Note` | Information the reader needs to read the rest correctly |
| `Tip` | Optional improvement. Skipping it costs nothing |
| `Caveat` | A limit on what was just claimed |
| `Watch out` | A mistake that costs the reader something. Guides only |

`Watch out` is restricted to guides because in an article there is no action to get wrong.

The personal `aside` is not a callout. Callouts are informational and carry a label bar. Asides are a named human speaking and carry a madder edge bar. Keeping them separate is the reason both read as deliberate.

### Closed sets

Every argument whose value comes from a fixed list, gathered so both sides can be compared against one place rather than against prose scattered through the file. `tools/verify/contract.js` checks each LIVE row against the set the build actually enforces, values and default alike.

| Shortcode | Argument | Status | Values | Default |
|---|---|---|---|---|
| `pane` | `surface` | LIVE | `paper`, `ink`, `madder` | `paper` |
| `table` | `kind` | LIVE | `comparison`, `data` | `data` |
| `callout` | `label` | LIVE | `Note`, `Tip`, `Caveat`, `Watch out` | |
| `image` | `width` | PLANNED | `measure`, `main`, `bleed` | |
| `exit` | `kind` | PLANNED | `guide`, `tool`, `us` | |

A PLANNED row has nothing to compare against yet and is reported as pending rather than checked. It becomes enforced the moment its shortcode goes LIVE, which is the point of writing it down now: the set is the design, and building the block later should not be the moment it gets invented.

An unknown value fails the build everywhere except `pane`, which warns and renders paper. That asymmetry is deliberate and predates this table: a misspelled surface still produces a readable page, while a misspelled callout label or table kind would silently change what the block means.

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
- The Component Reference has no `container-narrow` counterpart. `pullquote` is settled at measure, from the Reference's own `max-width: none`. `epigraph` is still unverified and inherits the same suspicion: check the Reference before building it rather than assuming narrow.
