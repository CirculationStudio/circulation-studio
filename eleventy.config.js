import path from "node:path";
import EleventyVitePlugin from "@11ty/eleventy-plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import icons from "./src/_data/icons.js";
import site from "./src/_data/site.js";

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/* Alt-glyph swaps for the heading macro, porting the structural enforcement
   from the design system's Heading.jsx.

   The rule (design.md section 3, LOCKED): up to TWO swaps per headline, each
   independently justified by meaning, h1/h2 only, never body copy, never
   buttons. Zero swaps is always fine. Enforcement lives here so a page author
   cannot quietly exceed the cap; violations warn at build time and render
   plain rather than failing the build.

   Returns escaped HTML, so the macro applies `safe` to the result. */
function glyphSwaps(text, swaps, tag) {
  const source = text == null ? "" : String(text);
  let list = !swaps ? [] : Array.isArray(swaps) ? swaps : [swaps];

  if (list.length && tag !== "h1" && tag !== "h2") {
    console.warn(
      `[heading] glyph swaps are permitted on h1/h2 only, got ${tag}. Rendering plain: "${source}"`
    );
    list = [];
  }
  if (list.length > 2) {
    console.warn(
      `[heading] hard cap is two swaps per headline, got ${list.length}. Extras ignored: "${source}"`
    );
    list = list.slice(0, 2);
  }
  if (!list.length || source === "") return escapeHtml(source);

  // Segments are either raw strings (still swappable) or a swap marker object.
  let segments = [source];
  for (const swap of list) {
    const word = swap && swap.word;
    const letter = swap && swap.letter;
    if (!word || !letter) {
      console.warn(`[heading] a swap needs both word and letter. Skipped in: "${source}"`);
      continue;
    }
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (typeof segment !== "string") continue;
      const wordAt = segment.indexOf(word);
      if (wordAt < 0) continue;
      const letterAt = segment.indexOf(letter, wordAt);
      // the letter has to fall inside the named word, not merely after it
      if (letterAt < 0 || letterAt >= wordAt + word.length) {
        console.warn(
          `[heading] letter "${letter}" not found in word "${word}". Swap skipped in: "${source}"`
        );
        break;
      }
      segments.splice(
        i,
        1,
        segment.slice(0, letterAt),
        { letter, flavor: swap.flavor || "alt" },
        segment.slice(letterAt + 1)
      );
      break;
    }
  }

  return segments
    .map((segment) =>
      typeof segment === "string"
        ? escapeHtml(segment)
        : `<span class="${escapeHtml(segment.flavor)}">${escapeHtml(segment.letter)}</span>`
    )
    .join("");
}

/* Shared HTML scanning helpers for the build-time checks.

   ============================================================
   NOTHING HERE ENUMERATES BLOCK WRAPPER TAGS. That is the point.
   ============================================================

   The pane and faq checks used to walk a hard-coded list of elements, and it
   missed a block twice. figure was added after a table in a pane went
   undetected, then aside was added after a callout in a pane built cleanly on
   a probe that was supposed to fail. Both times the verification passed
   silently, which is the worst way for a check to be wrong.

   The list could not stop rotting, because it grows every time a component
   picks a different wrapper element, and nothing announces the omission.

   So a block is now identified by WHAT MARKS IT, its class or its
   data-no-pane attribute, on whatever element happens to carry it, and the
   tag name is read off the element that was found rather than guessed in
   advance. The only enumerated list left is HTML's void elements, which is
   fixed by the spec rather than by this project. */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"
]);

const OPEN_TAG = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;

function classesOf(attrs) {
  const m = /class\s*=\s*"([^"]*)"/.exec(attrs);
  return m ? m[1].trim().split(/\s+/) : [];
}

/* Every element carrying a given class, with the tag name it actually uses
   and where it starts. */
function elementsWithClass(html, className) {
  const out = [];
  for (const m of html.matchAll(new RegExp(OPEN_TAG.source, "g"))) {
    if (VOID_ELEMENTS.has(m[1].toLowerCase()) || m[0].endsWith("/>")) continue;
    if (classesOf(m[2]).includes(className)) {
      out.push({ tag: m[1], index: m.index, attrs: m[2] });
    }
  }
  return out;
}

/* Inner HTML of the first element carrying a class, or null if there is none.
   Marking in, content out, with the tag name never named by the caller.

   The open tag is stripped by matching one element name, whatever it turned out
   to be, and the close by matching the last one. Trimmed, because every emitter
   in this file pads block content with newlines and a schema value should not
   carry them. */
function innerWithClass(html, className) {
  const [element] = elementsWithClass(html, className);
  if (!element) return null;
  const outer = sliceElement(html, element.index, element.tag);
  if (outer == null) return null;
  return outer
    .replace(/^<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/, "")
    .replace(/<\/[a-zA-Z][a-zA-Z0-9-]*\s*>$/, "")
    .trim();
}

/* Outer HTML of the element opening at openIndex, found by counting depth for
   ITS OWN tag name. The name is a parameter rather than a constant, which is
   what makes this work for any wrapper a block chooses. */
function sliceElement(html, openIndex, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, "g");
  re.lastIndex = openIndex;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(openIndex, re.lastIndex);
  }
  return null;
}

/* ============================================================
   THE CONTRACT. Exported, because tools/verify/contract.js compares these
   against SHORTCODES.md.
   ============================================================

   These four are the parts of the vocabulary that are data rather than code:
   the closed sets, and the parent-and-child pairs. They sit at module scope so
   the checker can import them. A checker that restated them would be a second
   model of the same facts, and the drift between two models is exactly what it
   was written to catch.

   Each is used a few hundred lines below by the shortcode it governs, and the
   reasoning for each is in the comment above that shortcode. */

const PANE_SURFACES = new Set(["paper", "ink", "madder"]);

const TABLE_KINDS = new Set(["comparison", "data"]);

const CALLOUT_LABELS = new Map([
  ["Note", "neutral"],
  ["Tip", "neutral"],
  ["Caveat", "accented"],
  ["Watch out", "accented"]
]);

/* Every parent-and-child pair, and what a child left on its own turns into.
   Three exist; the vocabulary has methodology and method, references and ref,
   glossary and term, beforeyoustart and need, youredone and exit, and metrics
   and metric still to come. So this is a table of PAIRS rather than the same
   dozen lines copied per pair, and adding a pair is a row.

   This is not the enumerated tag list the header warns about. A pair is a fact
   about the vocabulary, which SHORTCODES.md fixes, and not a guess about which
   element a component happens to wrap itself in. Both halves are still found by
   their marking, so either can change its wrapper freely.

   `degradesTo` is not decoration. A child on its own renders something that is
   valid HTML and looks deliberate, which is why this needs a build error rather
   than a review: the message has to say what the reader would get. */
const CHILD_PAIRS = [
  {
    child: "cs-qa",
    parent: "cs-faq",
    name: "qa",
    parentName: "faq",
    wrapper: "{% faq %} ... {% endfaq %}",
    degradesTo:
      "a bare details element with no heading and no schema, which reads as " +
      "an accordion nobody labelled"
  },
  {
    child: "cs-related__item",
    parent: "cs-related",
    name: "item",
    parentName: "related",
    wrapper: "{% related %} ... {% endrelated %}",
    degradesTo:
      "a bare link with no grid, no heading and no main-width breakout, " +
      "which reads as a stray link someone left in the prose"
  },
  {
    /* The numbering transform pairs a note with its marker and fails on either
       half missing, which is a different question from whether the note is
       inside the list. A note outside `footnotes` still has a marker, so it
       passed that check, and the transform then copied it into the rebuilt list
       while leaving the original where it was. */
    child: "cs-footnote",
    parent: "cs-footnotes",
    name: "note",
    parentName: "footnotes",
    wrapper: "{% footnotes %} ... {% endfootnotes %}",
    degradesTo:
      "a loose list item outside any list, which the numbering transform then " +
      "copies into the real list, so the note renders twice"
  }
];

export { PANE_SURFACES, TABLE_KINDS, CALLOUT_LABELS, CHILD_PAIRS };

export default function (eleventyConfig) {
  eleventyConfig.addFilter("glyphSwaps", glyphSwaps);

  /* The absolute URL of a page, and the ONE definition of it.
     `/who-we-are/` becomes `https://circulationstudio.com/who-we-are/`.

     A filter rather than an expression repeated in two templates, because the
     canonical link and the JSON-LD @id have to name the same URL and there is
     no way to notice when two copies of `site.url + page.url` stop agreeing.
     A self-referencing canonical pointing somewhere the schema does not is the
     kind of contradiction that resolves against you silently: the crawler
     believes the canonical and the entity graph hangs off an @id nothing else
     confirms.

     Both readers now go through here. base.njk emits the canonical, and
     partials/schema.njk sets `pageUrl` from it.

     site.url is the production origin and deliberately not the preview host,
     for the reasons recorded on the constant itself in src/_data/site.js. The
     preview deploy therefore carries a canonical pointing at production, which
     is correct and is also why it must not be indexed. See src/_data/deploy.js. */
  eleventyConfig.addFilter("absoluteUrl", (pageUrl) => site.url + pageUrl);

  /* Icon geometry lookup. Done as a filter rather than reading the data
     directly inside the macro, because Nunjucks macros do NOT receive the
     template context: `icons[name]` is undefined in there, and the macro's
     own guard then renders nothing at all. That failure is completely silent,
     which is how three icons went missing from a build that reported success.
     Here an unknown name warns and is greppable in the output. */
  eleventyConfig.addFilter("iconBody", (name) => {
    const shape = icons[name];
    if (!shape) {
      console.warn(
        `[icon] unknown icon "${name}". Known: ${Object.keys(icons).join(", ")}`
      );
      return `<!-- unknown icon: ${name} -->`;
    }
    return shape.body;
  });

  /* Frontmatter dates, rendered as a calendar date.

     THE TIMEZONE PART IS THE WHOLE POINT. YAML parses an unquoted 2026-07-30
     into a JS Date at UTC midnight. Anything that then reads it with local
     getters, including Date.prototype.toString, resolves that instant into the
     build machine's zone, and every timezone west of UTC lands on the previous
     day. The byline was rendering "Wed Jul 29 2026" for a date written as the
     30th, on a machine at GMT-0600.

     `updated: 2026-07-30` is a calendar date, not a timestamp. Nobody is
     asserting an instant. So this reads UTC parts only, via timeZone: "UTC",
     which pins the rendered day to the day that was typed no matter where the
     build runs.

     Strings are accepted too, in case a date is ever quoted in frontmatter,
     and anything unparseable passes through untouched rather than rendering
     "Invalid Date" into a page. */
  eleventyConfig.addFilter("calendarDate", (value) => {
    if (!value) return "";

    const date =
      value instanceof Date
        ? value
        : new Date(`${String(value).slice(0, 10)}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  });

  /* The same date as YYYY-MM-DD, for a <time datetime> attribute.

     This is the half an answer engine actually reads. A rendered "July 30,
     2026" is for a person; the machine date is what a crawler uses to decide
     whether a piece is current, and getting it wrong by a day is worse than
     omitting it. So it shares the calendar-date treatment above exactly: UTC
     parts only, never local, or the same timezone slip that was printing the
     29th would reappear in the attribute while the visible text read the 30th,
     which is the one failure mode nobody would notice by looking.

     toISOString is already UTC, so the date half of it is the calendar date. */
  eleventyConfig.addFilter("isoDate", (value) => {
    if (!value) return "";

    const date =
      value instanceof Date
        ? value
        : new Date(`${String(value).slice(0, 10)}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
  });

  /* pane: the first paired shortcode, and the one that establishes how all
     eighteen of the others will compose with markdown.

     ============================================================
     THE BLANK LINES ARE THE MECHANISM. DO NOT REMOVE THEM.
     ============================================================

     markdownTemplateEngine is njk, so Nunjucks runs first and whatever a
     shortcode returns is then fed through markdown-it. markdown-it follows
     CommonMark: a line starting with a block-level tag opens an HTML block,
     and that block runs raw until a BLANK LINE closes it. So the naive
     `<div>${content}</div>` leaves everything up to the first blank line
     unparsed, and everything after it parsed, which is the worst of both.
     Measured, not assumed: with the naive form the opening paragraph rendered
     as literal "**bold**, *italic* and a [link](...)" while the list below it
     came out as a real <ul>. Half the block silently raw.

     Putting a blank line after the opening tags and before the closing tags
     terminates the HTML block immediately, so the wrapper is raw HTML and
     everything between is ordinary markdown in the SAME single pass. The same
     probe then produced <p>, <strong>, <em>, <a> and <li> correctly.

     Why this and not rendering the content through a markdown-it instance
     inside the shortcode: one pass composes, two passes do not. With a single
     pass, a shortcode nested inside a pane returns HTML that is blank-line
     separated in its turn and everything keeps working. Rendering internally
     would mean an inner shortcode's output gets parsed as markdown a second
     time, and it would need its own markdown-it whose options could drift
     from the one Eleventy uses on prose outside a pane.

     THE RULE FOR THE OTHER EIGHTEEN: a paired shortcode returns wrapper tags
     on their own lines, a blank line either side of the content, and never
     indents the content, because four leading spaces would make it a code
     block. */
  /* Lifts a block OUT of the prose column and back in again.

     layouts/article.njk wraps the body in .cs-article__column, which is what
     establishes the reading measure once in the body face. A block wider than
     that measure cannot live inside it, and the only pure-CSS way out of a
     centred wrapper is 100vw, which counts a classic scrollbar and overshoots.
     Closing the column, emitting the block as a direct child of the full-width
     article, and reopening the column gets any width with no viewport unit.

     Established by pane, generalised here because table needs the same thing
     and chart, figure, metrics, screenshot and related all will. The block
     sets its own width; this only decides where in the tree it sits.

     Tag counts stay balanced: the layout opens one column and closes one, and
     every call here closes exactly one and opens exactly one. */
  const outsideColumn = (html) =>
    `\n</div>\n${html}\n<div class="cs-article__column cs-prose">\n`;

  /* NAMED ARGUMENTS ARRIVE AS ONE KEYWORD OBJECT, not as positional
     parameters. Nunjucks passes {% pane surface="ink" %} through as
     { surface: "ink", __keywords: true }, which is the same shape the engine
     probe in the Liquid-to-Nunjucks change recorded. Declaring the parameter
     as `surface` instead of reading it off an options object yields the
     literal string "[object Object]", which is how this was caught: the build
     warned twice about an unknown surface named "[object Object]".

     Every one of the remaining eighteen shortcodes takes named arguments, so
     they all read them this way. */
  eleventyConfig.addPairedShortcode("pane", function (content, options = {}) {
    const value = (options && options.surface) || "paper";

    if (!PANE_SURFACES.has(value)) {
      console.warn(
        `[pane] unknown surface "${value}". Known: ${[...PANE_SURFACES].join(", ")}. Rendering as paper.`
      );
    }

    /* paper is the default and carries no modifier: it is the page ground, so
       the wrapper exists only to hold the column and changes no colour. */
    const known = PANE_SURFACES.has(value) ? value : "paper";
    const modifier = known === "paper" ? "" : ` cs-pane--${known}`;

    /* THE PANE CLOSES THE PROSE COLUMN AND REOPENS IT AFTERWARDS.

       layouts/article.njk wraps the body in .cs-article__column, which is what
       establishes the reading measure once in the body face. A pane has to be
       full bleed, so it cannot live inside that column, and the only way out
       of a centred wrapper in pure CSS is 100vw, which counts a classic
       scrollbar and overshoots. Closing the wrapper, emitting the pane as a
       direct child of the full-width article, and reopening the wrapper gets
       the pane to the page edges with no viewport unit anywhere.

       Tag counts stay balanced: the layout opens one column and closes one,
       and every pane closes exactly one and opens exactly one. Panes cannot
       nest, which the build enforces, so the pairing cannot come apart.

       A pane at the very end of an article leaves an empty column behind it.
       The stripEmptyColumns transform removes it, because an empty block would
       otherwise sit between the pane and the article's bottom padding. */
    return outsideColumn(
      `<div class="cs-pane${modifier}">\n<div class="cs-pane__inner cs-prose">\n\n` +
        `${content.trim()}` +
        `\n\n</div>\n</div>`
    );
  });

  /* Every parent-and-child pair, and what a child left on its own turns into.
     Two exist; the vocabulary has methodology and method, references and ref,
     glossary and term, beforeyoustart and need, youredone and exit, and metrics
     and metric still to come. So this is a table of PAIRS rather than the same
     dozen lines copied per pair, and adding a pair is a row.

     This is not the enumerated tag list the header warns about. A pair is a
     fact about the vocabulary, which SHORTCODES.md fixes, and not a guess about
     which element a component happens to wrap itself in. Both halves are still
     found by their marking, so either can change its wrapper freely.

     `degradesTo` is not decoration. A child on its own renders something that
     is valid HTML and looks deliberate, which is why this needs a build error
     rather than a review: the message has to say what the reader would get. */
  /* Child validity for every pair, and FAQPage schema merged into the existing
     graph. Both live here for the same reason, which is worth stating once.

     WHY THE TRANSFORM AND NOT RENDER TIME. A child cannot check its parent
     while rendering, because Nunjucks runs children first and the parent has
     not executed yet. And a parent cannot read its children as data, because
     it receives their concatenated HTML rather than a list. So the built page
     is the first and only place the relationship exists. It also means the
     check catches a child reaching the page by any route, not only a direct
     call.

     The schema is built here for the same reason: the question and answer
     pairs are only recoverable together once the block is assembled. Merging
     into the existing <script type="application/ld+json"> rather than adding a
     second one keeps one graph per page, which is the whole point of the
     @graph in partials/schema.njk. */
  eleventyConfig.addTransform("childRules", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    if (!CHILD_PAIRS.some((pair) => content.includes(pair.child))) return content;

    /* Orphans, by the same slice-and-scan as the pane checks. Count every
       child, then count the ones inside a parent; the difference is the
       orphans. No tag list, so either half can wrap itself in any element. */
    for (const pair of CHILD_PAIRS) {
      const total = elementsWithClass(content, pair.child).length;
      if (!total) continue;

      let inParent = 0;
      for (const parent of elementsWithClass(content, pair.parent)) {
        const body = sliceElement(content, parent.index, parent.tag);
        if (body) inParent += elementsWithClass(body, pair.child).length;
      }
      const orphans = total - inParent;

      if (orphans) {
        throw new Error(
          `[${pair.name}] ${orphans} ${pair.name} block(s) outside a ${pair.parentName} ` +
            `in ${outputPath}. ${pair.name} is a child shortcode and is only valid ` +
            `inside ${pair.wrapper}. On its own it renders ${pair.degradesTo}. ` +
            `See SHORTCODES.md.`
        );
      }
    }

    /* 2. Pull the question and answer pairs back out, on the same two helpers
       the orphan count and paneRules use.

       IT USED TO HARDCODE THE MARKUP, and that was the last place in this file
       that did. It opened on /<div class="cs-faq">/g, sliced with a literal
       "div", and found the question and the answer by their exact opening
       tags. Three of those four need the class attribute to be EXACTLY
       "cs-faq", so adding one more class to the wrapper, or moving faq to a
       section element, stopped the schema emitting. With no error: the orphan
       count above would still pass, the page would still build, and the
       FAQPage nodes would simply not be there. That is the silent pass the
       header of this file was rewritten to get rid of, sitting thirty lines
       under the comment explaining it.

       Depth counting still matters and is now inside sliceElement, which takes
       the tag name off the element it found. Both reasons it was there
       originally still bite: a lazy match on the faq stops at the next faq
       rather than at its own close, so a page with three of them produced two
       nodes covering the wrong spans, and an answer may legitimately contain
       elements of its own, a stat for instance, so a non-greedy match ends at
       the first inner close and returns an empty answer.

       Nesting a qa inside its own faq is what makes this correct without a
       lastIndex dance: each faq is sliced to its own close, and the qa pairs
       are read out of that slice. */
    const faqs = [];
    for (const faq of elementsWithClass(content, "cs-faq")) {
      const body = sliceElement(content, faq.index, faq.tag);
      if (!body) continue;

      const pairs = [];
      for (const qa of elementsWithClass(body, "cs-qa")) {
        const qaBody = sliceElement(body, qa.index, qa.tag);
        if (!qaBody) continue;
        const q = innerWithClass(qaBody, "cs-qa__q");
        const a = innerWithClass(qaBody, "cs-qa__a");
        if (q === null || a === null) continue;
        pairs.push({ q, a });
      }

      if (pairs.length) faqs.push({ title: innerWithClass(body, "cs-faq__title") || "", pairs });
    }

    if (!faqs.length) return content;

    // 3. Merge FAQPage nodes into the one graph the page already carries.
    const scriptRe = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/;
    const found = scriptRe.exec(content);
    if (!found) return content;

    let graph;
    try {
      graph = JSON.parse(found[2]);
    } catch {
      console.warn(`[faq] could not parse the JSON-LD in ${outputPath}, schema not merged.`);
      return content;
    }

    const decode = (s) =>
      s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'").replace(/&amp;/g, "&");
    const pageNode = graph["@graph"]?.find((n) => String(n["@id"] || "").endsWith("#webpage"));
    const base = pageNode?.["@id"]?.replace("#webpage", "") || "";

    faqs.forEach((faq, i) => {
      graph["@graph"].push({
        "@type": "FAQPage",
        "@id": `${base}#faq-${i + 1}`,
        name: decode(faq.title) || undefined,
        isPartOf: pageNode ? { "@id": pageNode["@id"] } : undefined,
        mainEntity: faq.pairs.map((p) => ({
          "@type": "Question",
          name: decode(p.q),
          acceptedAnswer: { "@type": "Answer", text: p.a }
        }))
      });
    });

    const serialised = JSON.stringify(graph, null, 2).replace(/</g, "\\u003c");
    return content.replace(scriptRe, `$1\n${serialised}\n$3`);
  });

  /* Numbering, in the built HTML where document order is finally knowable.
     Footnotes first, then captions.

     ORDER OF APPEARANCE, NOT ORDER OF DECLARATION. Markers are numbered by
     where they occur in the page, and the notes are then SORTED to match. An
     author can write the notes in any order, including a different one from
     the prose, and the output is still correct. That is the whole reason for
     naming rather than numbering.

     Because it reads the built page, a marker inside a pane numbers correctly
     relative to markers outside it, which no render-time counter could manage:
     a pane's contents render before the prose that follows it, but appear
     after the prose that precedes it. */
  eleventyConfig.addTransform("numbering", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;

    const where = outputPath;

    /* ---- footnotes ---- */
    if (content.includes("cs-fnref") || content.includes("cs-footnote")) {
      const markerRe = /<a class="cs-fnref" data-fn="([^"]*)" href="#"><\/a>/g;
      const order = [];
      const seenMarker = new Set();
      for (const m of content.matchAll(markerRe)) {
        if (seenMarker.has(m[1])) {
          throw new Error(
            `[fn] duplicate marker id "${m[1]}" in ${where}. ` +
              `An id names one note and is referenced once. See SHORTCODES.md.`
          );
        }
        seenMarker.add(m[1]);
        order.push(m[1]);
      }

      const noteRe = /<li class="cs-footnote" data-note="([^"]*)">([\s\S]*?)<\/li>/g;
      const notes = new Map();
      for (const m of content.matchAll(noteRe)) {
        if (notes.has(m[1])) {
          throw new Error(
            `[note] duplicate note id "${m[1]}" in ${where}. See SHORTCODES.md.`
          );
        }
        notes.set(m[1], m[2]);
      }

      const orphanMarkers = order.filter((id) => !notes.has(id));
      const orphanNotes = [...notes.keys()].filter((id) => !order.includes(id));

      if (orphanMarkers.length) {
        throw new Error(
          `[fn] marker with no note in ${where}: ${orphanMarkers.map((i) => `"${i}"`).join(", ")}. ` +
            `Every {% fn %} needs a {% note %} with the same id. See SHORTCODES.md.`
        );
      }
      if (orphanNotes.length) {
        throw new Error(
          `[note] note with no marker in ${where}: ${orphanNotes.map((i) => `"${i}"`).join(", ")}. ` +
            `An unreferenced note is invisible to a reader and has no number to take. ` +
            `See SHORTCODES.md.`
        );
      }

      if (order.length) {
        const number = new Map(order.map((id, i) => [id, i + 1]));

        // Markers: real number, real href, and a name that is not bare "1".
        content = content.replace(markerRe, (_, id) => {
          const n = number.get(id);
          return (
            `<a class="cs-fnref" id="fnref-${id}" href="#fn-${id}" ` +
            `role="doc-noteref" aria-label="Note ${n}">${n}</a>`
          );
        });

        // Notes: sorted into marker order, numbered to match, linked back.
        const rebuilt = order
          .map((id) => {
            const n = number.get(id);
            return (
              `<li class="cs-footnote" id="fn-${id}" role="doc-endnote" value="${n}">` +
              `${notes.get(id).trim()}` +
              ` <a class="cs-footnote__back" href="#fnref-${id}" aria-label="Back to note ${n} in the text">&#8617;</a>` +
              `</li>`
            );
          })
          .join("\n");

        // Replace the whole list body in one go, so declaration order is gone.
        content = content.replace(
          /(<ol aria-labelledby="cs-footnotes-heading">)[\s\S]*?(<\/ol>)/,
          (_, open, close) => `${open}\n${rebuilt}\n${close}`
        );
      }
    }

    /* ---- caption numbering ----

       ONE SEQUENCE PER BLOCK TYPE, not one shared sequence. A document mixing
       tables and figures gets Table 1, Table 2 and Figure 1, Figure 2, rather
       than Table 1 then Figure 2. The label is what a reader searches for, so
       the number has to be unique within its label rather than within the
       page. Each counts in document order of its own kind. */
    const counters = { table: 0, figure: 0 };
    content = content.replace(
      /<span class="cs-table__number" data-autonumber="(table|figure)"><\/span>/g,
      (_, kind) => {
        counters[kind] += 1;
        const label = kind === "table" ? "Table" : "Figure";
        return `<span class="cs-table__number">${label} ${counters[kind]}</span>`;
      }
    );

    return content;
  });

  /* Removes the empty prose column a trailing pane leaves behind. Structural
     cleanup of the close-and-reopen above, kept separate from paneRules
     because that transform enforces a contract and this one tidies markup. */
  eleventyConfig.addTransform("stripEmptyColumns", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return content.replace(
      /<div class="cs-article__column cs-prose">\s*<\/div>/g,
      ""
    );
  });

  /* stat: a single figure with its label and its source.

     Not paired, so there is no markdown inside it and the three arguments are
     plain text. They are escaped rather than trusted: a label containing an
     ampersand would otherwise emit invalid markup, and escaping is cheaper
     than discovering that in a validator later.

     SOURCE IS REQUIRED AND FAILS THE BUILD. Not a warning. SHORTCODES.md makes
     the house rule about sourcing mechanical rather than remembered: "any
     block carrying a number requires a source. Not optional, not defaulted."
     A warning would let an unsourced number ship, and an unsourced number on a
     page that exists to be cited is precisely the claim CLAUDE.md forbids. The
     message names the input file, because a build error with no location is a
     search rather than a fix.

     BRACKETS PASS THROUGH UNTOUCHED. value="[XX%]" renders as written, because
     brackets are the agreed signal to a human that a figure is not publishable
     yet. The build does not validate what is inside them and must not, or the
     signal stops being usable while a number is still being chased.

     THERE IS NO SURFACE ARGUMENT. Surface is inherited from the enclosing
     pane, by descendant selector in longform.css. That is the whole point of
     the pane owning surface: an author cannot leave one block behind on the
     wrong ground, because there is nothing for them to set.

     Emitted on one line with no blank line inside it, so markdown-it treats
     the whole div as a single HTML block and passes it through. The leading
     and trailing newlines keep it out of a surrounding paragraph. */
  eleventyConfig.addShortcode("stat", function (options = {}) {
    const { value, label, source } = options || {};

    if (!source || !String(source).trim()) {
      throw new Error(
        `[stat] missing required "source" in ${this.page?.inputPath || "unknown file"}. ` +
          `Every block carrying a number needs one, see SHORTCODES.md. ` +
          `value=${JSON.stringify(value ?? null)} label=${JSON.stringify(label ?? null)}`
      );
    }

    return (
      `\n<div class="cs-stat">` +
      `<span class="cs-stat__value">${escapeHtml(value ?? "")}</span>` +
      `<span class="cs-stat__label">${escapeHtml(label ?? "")}</span>` +
      `<span class="cs-stat__source">${escapeHtml(source)}</span>` +
      `</div>\n`
    );
  });

  /* table: a markdown table at MAIN width, the first block to leave the
     reading column.

     WIDTH. It sits at --container-main, not at the 66ch measure, so it goes
     through outsideColumn like a pane does and then constrains itself with
     .cs-mainwidth. That class is deliberately generic rather than named for
     tables: chart, figure, metrics, screenshot and related all need exactly
     this and should reuse it rather than each inventing a breakout.

     SOURCE IS CONDITIONAL, which corrects SHORTCODES.md's blanket rule.
     kind="data" carries numbers and fails the build without a source.
     kind="comparison" is qualitative in the Reference, often carries no
     number at all, and a source would be an empty ritual.

     kind DEFAULTS TO "data", the stricter of the two. A forgotten kind then
     fails for a missing source rather than silently opting out of the house
     rule, which is the right way round for a default to be wrong. */
  eleventyConfig.addPairedShortcode("table", function (content, options = {}) {
    const { caption, source } = options || {};
    const kind = (options && options.kind) || "data";

    if (!TABLE_KINDS.has(kind)) {
      throw new Error(
        `[table] unknown kind "${kind}" in ${this.page?.inputPath || "unknown file"}. ` +
          `Known: ${[...TABLE_KINDS].join(", ")}. See SHORTCODES.md.`
      );
    }

    if (kind === "data" && (!source || !String(source).trim())) {
      throw new Error(
        `[table] kind="data" requires a "source" in ${this.page?.inputPath || "unknown file"}. ` +
          `A table of numbers is a block carrying numbers, see SHORTCODES.md. ` +
          `Use kind="comparison" for a qualitative table, where source is optional. ` +
          `caption=${JSON.stringify(caption ?? null)}`
      );
    }

    /* The number is a placeholder the numbering transform fills. An author
       cannot write one: inserting a table mid-document would renumber every
       table after it, which is the edit most likely to be got wrong and least
       likely to be noticed. */
    const parts = [];
    parts.push(`<span class="cs-table__number" data-autonumber="table"></span>`);
    if (caption) parts.push(`<span class="cs-table__text">${escapeHtml(caption)}</span>`);
    if (source) parts.push(`<span class="cs-table__source">${escapeHtml(source)}</span>`);
    const figcaption = parts.length
      ? `<figcaption class="cs-table__caption">${parts.join("")}</figcaption>`
      : "";

    /* Blank lines around the content only, exactly as the pane does, so
       markdown-it parses the markdown table and passes the wrapper through.
       Everything after the content is one unbroken HTML block, so no blank
       line may appear between the closing scroll div and the reopened
       column. */
    return outsideColumn(
      `<figure class="cs-mainwidth cs-table cs-table--${kind}" data-no-pane="main width">\n<div class="cs-table__scroll">\n\n` +
        `${content.trim()}` +
        `\n\n</div>\n${figcaption}\n</figure>`
    );
  });

  /* faq and qa: the FIRST parent-and-child pair, and the pattern methodology,
     references, metrics, glossary, beforeyoustart and youredone all copy.

     ============================================================
     CHILDREN RENDER BEFORE PARENTS. That single fact shapes everything.
     ============================================================

     Nunjucks evaluates inside out, so by the time {% faq %} runs, every
     {% qa %} inside it has already returned a finished HTML string, and faq
     receives that string as its content. A parent therefore CANNOT pass
     anything down to its children, cannot validate them as they render, and
     cannot see them as data. It only ever sees their output.

     Three consequences the other five pairs inherit:

     1. A child emits complete, self-contained markup. It cannot rely on the
        parent to close, wrap or fix anything.
     2. A parent wraps a string. It does not compose a list of children,
        because there is no list, only concatenated HTML.
     3. Anything that needs to know the parent-child RELATIONSHIP happens in
        the output transform, not at render time, because that relationship
        does not exist yet while either shortcode is running.

     Point 3 is why a stray {% qa %} is caught in faqRules below rather than
     here. At the moment qa runs there is nothing to ask: the enclosing faq has
     not executed and may not exist. The built HTML is the first place the
     relationship is visible at all. */
  eleventyConfig.addPairedShortcode("qa", function (content, options = {}) {
    const question = (options && options.q) || "";

    if (!String(question).trim()) {
      throw new Error(
        `[qa] missing required "q" in ${this.page?.inputPath || "unknown file"}. ` +
          `A question with no text is not answerable. See SHORTCODES.md.`
      );
    }

    /* details/summary per the Component Reference. The answer stays in the
       DOM when collapsed, which is what lets the FAQPage schema be read out
       of the built HTML and what keeps the text findable. */
    return (
      `\n<details class="cs-qa">\n` +
      `<summary class="cs-qa__q">${escapeHtml(question)}</summary>\n` +
      `<div class="cs-qa__a cs-prose">\n\n` +
      `${content.trim()}` +
      `\n\n</div>\n</details>\n`
    );
  });

  eleventyConfig.addPairedShortcode("faq", function (content, options = {}) {
    const title = (options && options.title) || "";
    const heading = title
      ? `<h2 class="cs-faq__title">${escapeHtml(title)}</h2>\n`
      : "";

    return `\n<div class="cs-faq">\n${heading}\n${content.trim()}\n\n</div>\n`;
  });

  /* fn, footnotes and note: named references, numbered by the transform.

     ============================================================
     NUMBERS CANNOT BE AUTHORED. They are not a style choice.
     ============================================================

     Two independent reasons, and either alone would settle it.

     A shortcode cannot know its own position. A parent receives a finished
     string rather than a list of children, so nothing at render time can count
     what came before it, and a marker in running prose has no parent at all.

     And an explicit number makes inserting a footnote mid-document a renumber
     of everything after it. That is precisely the operation an authoring
     language model will get wrong, silently, and the failure looks like
     correct output.

     So the author writes an id and the transform assigns every number. Same
     applies to table and figure captions, which now number themselves. */
  eleventyConfig.addShortcode("fn", function (options = {}) {
    const id = (options && options.id) || "";
    if (!String(id).trim()) {
      throw new Error(
        `[fn] missing required "id" in ${this.page?.inputPath || "unknown file"}. ` +
          `A marker references a note by name, never by number. See SHORTCODES.md.`
      );
    }
    /* Emitted with the number left blank. The transform fills the text, the
       href, the id and the accessible name once document order is known. */
    return `<a class="cs-fnref" data-fn="${escapeHtml(id)}" href="#"></a>`;
  });

  eleventyConfig.addPairedShortcode("note", function (content, options = {}) {
    const id = (options && options.id) || "";
    if (!String(id).trim()) {
      throw new Error(
        `[note] missing required "id" in ${this.page?.inputPath || "unknown file"}. ` +
          `See SHORTCODES.md.`
      );
    }
    return `\n<li class="cs-footnote" data-note="${escapeHtml(id)}">\n\n${content.trim()}\n\n</li>\n`;
  });

  eleventyConfig.addPairedShortcode("footnotes", function (content) {
    /* The list is ORDERED but its order comes from the transform, which sorts
       the notes into marker order. What the author wrote is irrelevant, which
       is the point: they cannot get it wrong.

       The heading is visually hidden rather than absent. A bare list of
       numbered fragments at the end of an article is meaningless to anyone not
       seeing the layout, and a visible "Notes" heading would be redundant
       beside the rule and the type change that already announce the block. */
    return (
      `\n<div class="cs-footnotes">\n` +
      `<h2 class="sr-only" id="cs-footnotes-heading">Notes and references</h2>\n` +
      `<ol aria-labelledby="cs-footnotes-heading">\n\n` +
      `${content.trim()}` +
      `\n\n</ol>\n</div>\n`
    );
  });

  /* pullquote. The CSS already exists in longform.css and is untouched.

     THE ATTRIBUTION SITS IN A FOOTER, and that is a composition requirement
     rather than a semantic preference. markdown-it only treats a line as raw
     HTML if it starts a block-level tag or is a tag alone on its line.
     `<cite>Attribution</cite>` is neither, so it would be parsed as a
     paragraph and would swallow the `</blockquote>` on the line after it,
     breaking the element. `<footer>` is a block tag, so it opens an HTML block
     that runs to the blank line and carries the closing tag with it. It is
     also the standard attribution pattern, so the fix costs nothing. */
  eleventyConfig.addPairedShortcode("pullquote", function (content, options = {}) {
    const attribution = (options && options.attribution) || "";
    const cite = attribution
      ? `<footer><cite>${escapeHtml(attribution)}</cite></footer>\n`
      : "";
    return `\n<blockquote class="cs-pullquote">\n\n${content.trim()}\n\n${cite}</blockquote>\n`;
  });

  /* takeaways: the panel that opens a long piece with its own summary.

     PANE-EXCLUDED. Its ground is mist, and mist has no deep counterpart in the
     Reference. That is the "paints something" test from SHORTCODES.md: a
     descendant selector cannot map a painted background the way it maps text
     and borders, so the panel would keep its light ground on an ink pane. It
     declares itself with data-no-pane and the transform enforces it. */
  eleventyConfig.addPairedShortcode("takeaways", function (content, options = {}) {
    const title = (options && options.title) || "The short version";
    return (
      `\n<div class="cs-takeaways" data-no-pane="mist ground">\n` +
      `<h2 class="cs-takeaways__title">${escapeHtml(title)}</h2>\n\n` +
      `${content.trim()}` +
      `\n\n</div>\n`
    );
  });

  /* callout: a labelled aside in one of four registers.

     TWO TREATMENTS, NOT FOUR. Note and Tip inform; Caveat and Watch out flag a
     limit or a cost. The madder edge on the second pair is what makes that
     visible at a glance, so a reader skimming knows to slow down without
     having to read the label first. Four labels, two visual registers, and the
     split is by what the label DOES rather than by how many labels there are.

     WATCH OUT IS GUIDES ONLY, per SHORTCODES.md. Enforced against the article's
     own frontmatter kind, which a shortcode can read through this.ctx. Any
     kind other than "guide" fails the build rather than warning or silently
     downgrading to Caveat: a downgrade would put a different word in front of
     a reader than the author wrote, and a warning in a passing build is a
     warning nobody reads.

     PANE-EXCLUDED. Both registers paint a label bar, mist on one and
     accent-quiet on the other, and the accented pair also carries a madder
     border, which is 1.99:1 on ink and banned there outright. */
  eleventyConfig.addPairedShortcode("callout", function (content, options = {}) {
    const label = (options && options.label) || "";
    const where = this.page?.inputPath || "unknown file";

    if (!CALLOUT_LABELS.has(label)) {
      throw new Error(
        `[callout] unknown label ${JSON.stringify(label)} in ${where}. ` +
          `The set is closed: ${[...CALLOUT_LABELS.keys()].map((l) => `"${l}"`).join(", ")}. ` +
          `A new register is a design decision, not an authoring one. See SHORTCODES.md.`
      );
    }

    if (label === "Watch out" && this.ctx?.kind !== "guide") {
      throw new Error(
        `[callout] label="Watch out" is guides only, and ${where} has ` +
          `kind="${this.ctx?.kind ?? "unset"}". Use "Caveat" outside a guide. ` +
          `See SHORTCODES.md.`
      );
    }

    const tone = CALLOUT_LABELS.get(label);
    return (
      `\n<aside class="cs-callout cs-callout--${tone}" data-no-pane="label bar ground">\n` +
      `<p class="cs-callout__label">${escapeHtml(label)}</p>\n` +
      `<div class="cs-callout__body">\n\n` +
      `${content.trim()}` +
      `\n\n</div>\n</aside>\n`
    );
  });

  /* related and item: the second parent-and-child pair, following faq exactly.

     ITEMS ARE EXPLICIT FOR NOW. SHORTCODES.md describes related as pulling
     from a `cluster` frontmatter taxonomy. That taxonomy does not exist: no
     article declares a cluster, there is no index to query, and nothing maps
     a cluster to a set of articles. Building the mechanism before the taxonomy
     would mean inventing both. So each item is written out, and the vocabulary
     records that this is the interim state rather than the design.

     PANE-EXCLUDED for width: it sits at --container-main and reuses
     .cs-mainwidth from table, so the same escape and the same exclusion. */
  eleventyConfig.addShortcode("item", function (options = {}) {
    const { kind, title, url } = options || {};
    const where = this.page?.inputPath || "unknown file";

    for (const [name, value] of [["kind", kind], ["title", title], ["url", url]]) {
      if (!value || !String(value).trim()) {
        throw new Error(
          `[item] missing required "${name}" in ${where}. ` +
            `An item needs all three: kind, title and url. See SHORTCODES.md.`
        );
      }
    }

    /* NO SURROUNDING NEWLINES, which is the inverse of the blank-line rule a
       block-level shortcode follows. A blank line CLOSES an HTML block, and
       `<a>` is inline, so an item separated from its neighbours by a blank line
       does not continue the grid's HTML block: markdown-it starts a paragraph
       and wraps it. Measured, not guessed: with leading and trailing newlines
       the first item rendered correctly inside the grid and the second and
       third each came out inside a <p>.

       So a block-level child pads itself with blank lines and an inline child
       must not. */
    return (
      `<a class="cs-related__item" href="${escapeHtml(url)}">` +
      `<span class="cs-related__kind">${escapeHtml(kind)}</span>` +
      `<span class="cs-related__title">${escapeHtml(title)}</span>` +
      `</a>`
    );
  });

  eleventyConfig.addPairedShortcode("related", function (content, options = {}) {
    const title = (options && options.title) || "Related";
    /* Through outsideColumn, like table. .cs-mainwidth only resolves against
       the full-width article, so a main-width block left inside the prose
       column silently renders at the measure instead: the grid came out 219px
       per column rather than 347px, and nothing failed. The sweep caught it
       because .cs-article > .cs-related matched nothing. */
    return outsideColumn(
      `<nav class="cs-mainwidth cs-related" data-no-pane="main width" ` +
      `aria-labelledby="cs-related-heading">\n` +
      `<h2 class="cs-related__label" id="cs-related-heading">${escapeHtml(title)}</h2>\n` +
      `<div class="cs-related__grid">\n${content.trim()}\n</div>\n</nav>`
    );
  });

  /* Pane rules from SHORTCODES.md, enforced against the BUILT HTML rather than
     by counting shortcode calls.

     That distinction is deliberate. Counting calls measures intent; reading
     the output measures what shipped. A pane emitted from an include, a
     future block that wraps one, or a page assembled from several sources
     would all evade a call counter and none of them evade this.

     Warn on a second ink or madder pane, fail the build on a nested pane. The
     asymmetry is SHORTCODES.md's: a second ink pane is a judgment call that a
     human should look at, a nested pane is incoherent, since the inner pane's
     surface would be painted over by the outer one's. */
  eleventyConfig.addTransform("paneRules", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    if (!content.includes("cs-pane")) return content;

    /* Every pane, whatever element it uses, sliced to its own matching close.
       No stack and no tag list: the tag name comes off the element that was
       found, so a pane or an excluded block can wrap itself in anything. */
    const counts = { ink: 0, madder: 0 };
    const panes = elementsWithClass(content, "cs-pane");
    const wideInPane = [];
    let nested = false;

    for (const pane of panes) {
      const classes = classesOf(pane.attrs);
      if (classes.includes("cs-pane--ink")) counts.ink += 1;
      if (classes.includes("cs-pane--madder")) counts.madder += 1;

      const body = sliceElement(content, pane.index, pane.tag);
      if (!body) continue;

      // Anything carrying cs-pane inside this one, other than itself.
      if (elementsWithClass(body, "cs-pane").length > 1) nested = true;

      // Anything declaring itself pane-excluded, on any element.
      for (const m of body.matchAll(new RegExp(OPEN_TAG.source, "g"))) {
        const reason = /data-no-pane="([^"]*)"/.exec(m[2])?.[1];
        if (!reason) continue;
        const name =
          classesOf(m[2]).find((c) => c.startsWith("cs-") && !c.includes("--")) || m[1];
        wideInPane.push(`${name} (${reason})`);
      }
    }

    if (wideInPane.length) {
      throw new Error(
        `[pane] pane-excluded block inside a pane in ${outputPath}: ${wideInPane.join(", ")}. ` +
          `A pane contains reading-column content only. Two things disqualify a block: ` +
          `a width wider than the measure, which escapes the pane's inner column and ` +
          `takes no constraint at all; and a painted ground, which is structural and ` +
          `does not follow the surface, so a mist panel lands on ink at 1.12:1. ` +
          `See SHORTCODES.md, Surfaces.`
      );
    }

    if (nested) {
      throw new Error(
        `[pane] nested pane in ${outputPath}. Panes do not nest: the inner surface is painted over by the outer one, so the markup does not describe anything renderable. See SHORTCODES.md, Surfaces.`
      );
    }

    for (const surface of ["ink", "madder"]) {
      if (counts[surface] > 1) {
        console.warn(
          `[pane] ${counts[surface]} ${surface} panes in ${outputPath}, SHORTCODES.md allows one. The surface stops being an interruption when it repeats.`
        );
      }
    }

    return content;
  });

  /* The two article tiers, at /yelp/<slug>/ and /library/<slug>/.
     Permalinks and layout come from each directory's 11tydata.js, and the
     reasoning for all of it is in tools/eleventy/article-directory-data.js.

     Globbed rather than tag-driven, so an article belongs to a tier by virtue
     of where it lives and nobody can half enrol one by forgetting a tag. Same
     rule the retired `articles` collection used, applied twice.

     TWO COLLECTIONS, AND NO THIRD ONE FOR "EVERYTHING". The hub will list its
     own spokes from `collections.yelp`. The sitemap wants every URL on the
     site, which is not the union of these two: it is those plus the five
     marketing pages plus whatever comes later. Eleventy already maintains
     exactly that as `collections.all`, so a third collection here would be a
     narrower answer to the sitemap's question and a second thing to keep in
     step. A template that genuinely wants both tiers and nothing else writes
     `collections.yelp.concat(collections.library)`, which is one expression
     and cannot fall out of date. */
  eleventyConfig.addCollection("yelp", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/yelp/*.md")
  );

  eleventyConfig.addCollection("library", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/library/*.md")
  );

  /* JSON-LD serialiser for partials/schema.njk.

     Nunjucks' built-in `dump` is JSON.stringify and nothing else, which is not
     safe inside a <script> block: any "</script>" appearing in a string value
     would close the element early and spill the rest of the graph into the
     document as markup. Escaping every "<" to its JSON unicode form is still
     valid JSON, parses back to the same string, and makes that impossible.

     Pretty-printed on purpose. Schema is the thing most often read by hand in
     view-source when an entity is not resolving, and CLAUDE.md asks for output
     that both humans and agents can read. gzip makes the indentation close to
     free.

     Undefined and null values are dropped rather than emitted: a key with no
     value is worse than an absent key, because a validator reports it as a
     malformed property instead of an incomplete entity. */
  eleventyConfig.addFilter("jsonld", (value) => {
    const prune = (node) => {
      if (Array.isArray(node)) return node.map(prune).filter((v) => v != null);
      if (node && typeof node === "object") {
        const out = {};
        for (const [key, val] of Object.entries(node)) {
          const cleaned = prune(val);
          if (cleaned != null && cleaned !== "") out[key] = cleaned;
        }
        return Object.keys(out).length ? out : null;
      }
      return node;
    };

    return JSON.stringify(prune(value), null, 2).replace(/</g, "\\u003c");
  });

  /* Deploy-time files. Two separate problems had to be solved to ship these.

     First, they have no template extension, so Eleventy ignores them unless
     they are copied explicitly.

     Second, and less obvious: copying them straight to the output root is not
     enough. This plugin renames Eleventy's output to a temp folder, then runs
     Vite with that as the root and emptyOutDir enabled. Vite emits only the
     files it knows about, so anything merely sitting in the root is discarded.
     Passthrough alone silently lost all three.

     Routing them through "public/" fixes it: Vite copies its publicDir
     (<root>/public by default) to the output root verbatim, no hashing. So
     these land at _site/_headers, _site/_redirects and
     _site/site.webmanifest, which is exactly where Cloudflare Pages expects
     _headers and _redirects. */
  /* Brand assets stage at /brand/ so Vite can resolve the absolute src in the
     built HTML and fingerprint them into /assets/, the same way it picks up
     the fonts referenced from CSS. /brand/ is a build-time staging path only,
     it does not survive into the output. Not routed through public/, because
     publicDir files are copied verbatim and would skip the content hash. */
  eleventyConfig.addPassthroughCopy({ "src/assets": "brand" });

  /* The same icon again, this time through public/ so it survives verbatim at
     /brand/Circulation-Studio-icon.svg.

     Not redundant with the line above. That one stages the file for Vite to
     resolve out of the built HTML and fingerprint into /assets/, which is what
     the masthead and sticky bar load. A hashed filename is exactly wrong for
     the Organization's logo: JSON-LD carries a plain string, so Vite never
     rewrites it, and the URL has to still resolve after a rebuild changes the
     hash. Costs one extra 1.9KB copy for a logo URL that cannot rot. */
  eleventyConfig.addPassthroughCopy({
    "src/assets/Circulation-Studio-icon.svg":
      "public/brand/Circulation-Studio-icon.svg"
  });

  eleventyConfig.addPassthroughCopy({ "src/_headers": "public/_headers" });
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "public/_redirects" });
  eleventyConfig.addPassthroughCopy({
    "src/site.webmanifest": "public/site.webmanifest"
  });

  eleventyConfig.addPlugin(EleventyVitePlugin, {
    viteOptions: {
      plugins: [tailwindcss()],
      build: {
        /* Never inline assets as data URIs. Vite's default inlines anything
           under 4KB, which caught the 1.4KB brand icon and stamped it into the
           HTML twice per page (stacked lockup plus sticky bar), about 3.9KB.
           HTML revalidates rather than caching immutably, so those bytes go
           over the wire on every page and every revalidation. Emitted as a
           file instead, it is fingerprinted into /assets/ and served once
           under the immutable one-year rule in _headers. */
        assetsInlineLimit: 0
      },
      resolve: {
        alias: {
          "/src": path.resolve(".", "src")
        }
      }
    }
  });

  return {
    /* Markdown runs through Nunjucks, not Eleventy's Liquid default.

       Settled by test, not preference. SHORTCODES.md requires named arguments
       on every shortcode, and {% shortcode value="hello" %} does not merely
       arrive mangled under Liquid, it fails the build: LiquidJS rejects it at
       parse time with "invalid syntax at line 1 col 6". Nunjucks passes named
       arguments through as a keyword object, intact.

       The cost is that markdown bodies are now Nunjucks templates, so {{ and
       {% in prose are parsed rather than printed. Anywhere an article needs to
       show those literally, wrap them in {% raw %}. */
    markdownTemplateEngine: "njk",

    dir: {
      input: "src",
      output: "_site"
    }
  };
}
