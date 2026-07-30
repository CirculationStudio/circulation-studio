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
