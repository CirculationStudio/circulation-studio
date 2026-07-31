import path from "node:path";
import EleventyVitePlugin from "@11ty/eleventy-plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import icons from "./src/_data/icons.js";

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

export default function (eleventyConfig) {
  eleventyConfig.addFilter("glyphSwaps", glyphSwaps);

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

  const PANE_SURFACES = new Set(["paper", "ink", "madder"]);

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

  /* faq: child validity, and FAQPage schema merged into the existing graph.
     Both live here for the same reason, which is worth stating once because
     the other five parent-child pairs will hit it.

     WHY THE TRANSFORM AND NOT RENDER TIME. A child cannot check its parent
     while rendering, because Nunjucks runs children first and the parent has
     not executed yet. And a parent cannot read its children as data, because
     it receives their concatenated HTML rather than a list. So the built page
     is the first and only place the relationship exists. It also means the
     check catches a qa reaching the page by any route, not only a direct call.

     The schema is built here for the same reason: the question and answer
     pairs are only recoverable together once the block is assembled. Merging
     into the existing <script type="application/ld+json"> rather than adding a
     second one keeps one graph per page, which is the whole point of the
     @graph in partials/schema.njk. */
  eleventyConfig.addTransform("faqRules", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    if (!content.includes("cs-qa")) return content;

    const classesOf = (attrs) => {
      const m = /class\s*=\s*"([^"]*)"/.exec(attrs);
      return m ? m[1].trim().split(/\s+/) : [];
    };

    // 1. Every qa must be inside a faq. Ancestor walk over the two elements
    //    the pair uses, same technique as the pane checks.
    const stack = [];
    let orphans = 0;
    for (const tag of content.matchAll(/<(div|details)\b([^>]*)>|<\/(?:div|details)\s*>/g)) {
      if (tag[0].startsWith("</")) {
        stack.pop();
        continue;
      }
      const classes = classesOf(tag[2]);
      if (classes.includes("cs-qa") && !stack.some(Boolean)) orphans += 1;
      stack.push(classes.includes("cs-faq"));
    }

    if (orphans) {
      throw new Error(
        `[qa] ${orphans} qa block(s) outside a faq in ${outputPath}. ` +
          `qa is a child shortcode and is only valid inside {% faq %} ... {% endfaq %}. ` +
          `On its own it renders a bare details element with no heading and no ` +
          `schema, which reads as an accordion nobody labelled. See SHORTCODES.md.`
      );
    }

    /* 2. Pull the question and answer pairs back out.

       Both the faq block and each answer are sliced by COUNTING DIV DEPTH from
       their own opening tag, never by a lazy regex. Two reasons, both of which
       bit on the first attempt: a lazy match on the faq stops at the next faq
       rather than at its own close, so a page with three of them produced two
       nodes covering the wrong spans; and an answer may legitimately contain
       divs of its own, a stat for instance, so a non-greedy match ends at the
       first inner close and returns an empty answer.

       The index passed in must point AT the opening tag, so it is counted. */
    const sliceElement = (html, openIndex, tag) => {
      const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, "g");
      re.lastIndex = openIndex;
      let depth = 0;
      let m;
      while ((m = re.exec(html))) {
        depth += m[0].startsWith("</") ? -1 : 1;
        if (depth === 0) return html.slice(openIndex, re.lastIndex);
      }
      return null;
    };

    const faqs = [];
    const faqOpen = /<div class="cs-faq">/g;
    let fm;
    while ((fm = faqOpen.exec(content))) {
      const body = sliceElement(content, fm.index, "div");
      if (!body) break;
      faqOpen.lastIndex = fm.index + body.length;

      const title = /<h2 class="cs-faq__title">([\s\S]*?)<\/h2>/.exec(body)?.[1] || "";
      const pairs = [];
      const qaRe = /<summary class="cs-qa__q">([\s\S]*?)<\/summary>/g;
      let qm;
      while ((qm = qaRe.exec(body))) {
        const answerAt = body.indexOf('<div class="cs-qa__a', qm.index);
        if (answerAt < 0) continue;
        const outer = sliceElement(body, answerAt, "div") || "";
        pairs.push({
          q: qm[1],
          a: outer.replace(/^<div\b[^>]*>/, "").replace(/<\/div\s*>$/, "").trim()
        });
      }
      if (pairs.length) faqs.push({ title, pairs });
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
  const TABLE_KINDS = new Set(["comparison", "data"]);

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
      `<figure class="cs-mainwidth cs-table cs-table--${kind}">\n<div class="cs-table__scroll">\n\n` +
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

    const classesOf = (attrs) => {
      const match = /class\s*=\s*"([^"]*)"/.exec(attrs);
      return match ? match[1].trim().split(/\s+/) : [];
    };

    const counts = { ink: 0, madder: 0 };
    const stack = [];
    let nested = false;
    const wideInPane = [];

    /* Walks div and figure, the two elements a block wrapper uses, tracking
       which open elements are panes. If a block ever wraps itself in something
       else, add the tag here or it becomes invisible to both checks below. */
    for (const tag of content.matchAll(/<(div|figure)\b([^>]*)>|<\/(?:div|figure)\s*>/g)) {
      if (tag[0].startsWith("</")) {
        stack.pop();
        continue;
      }
      const classes = classesOf(tag[2]);
      const isPane = classes.includes("cs-pane");
      const insidePane = stack.some(Boolean);

      if (isPane) {
        if (insidePane) nested = true;
        if (classes.includes("cs-pane--ink")) counts.ink += 1;
        if (classes.includes("cs-pane--madder")) counts.madder += 1;
      }

      /* A main-width block inside a pane. Caught here rather than in the
         shortcode so it is caught by ANY route into a pane, not only a direct
         call, which is the same reason the pane counts are read from output
         rather than from call sites. */
      if (classes.includes("cs-mainwidth") && insidePane) {
        wideInPane.push(classes.filter((c) => c !== "cs-mainwidth").join(".") || "cs-mainwidth");
      }

      stack.push(isPane);
    }

    if (wideInPane.length) {
      throw new Error(
        `[pane] main-width block inside a pane in ${outputPath}: ${wideInPane.join(", ")}. ` +
          `A pane contains reading-column content only. Blocks at --container-main ` +
          `(table, chart, figure, metrics, screenshot, related) cannot go inside one. ` +
          `Rendered, it escapes the pane's inner column entirely: it takes no width ` +
          `constraint and its painted colours do not follow the surface, so a mist ` +
          `table header lands on ink at 1.12:1. See SHORTCODES.md, Surfaces.`
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

  /* Articles. Globbed rather than tag-driven, so an article is an article by
     virtue of where it lives and an author cannot half-enrol one by forgetting
     a tag. Nothing consumes this collection yet: there is no index page and no
     related block, both of which are open decisions. It exists so the next
     step has something to read. */
  eleventyConfig.addCollection("articles", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/articles/*.md")
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
