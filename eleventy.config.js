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
    const { caption, number, source } = options || {};
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

    const parts = [];
    if (number) parts.push(`<span class="cs-table__number">Table ${escapeHtml(number)}</span>`);
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

    // Walk every div tag in order, tracking which ones are panes.
    for (const tag of content.matchAll(/<div\b([^>]*)>|<\/div\s*>/g)) {
      if (tag[0].startsWith("</")) {
        stack.pop();
        continue;
      }
      const classes = classesOf(tag[1]);
      const isPane = classes.includes("cs-pane");
      if (isPane) {
        if (stack.some(Boolean)) nested = true;
        if (classes.includes("cs-pane--ink")) counts.ink += 1;
        if (classes.includes("cs-pane--madder")) counts.madder += 1;
      }
      stack.push(isPane);
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
