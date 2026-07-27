import path from "node:path";
import EleventyVitePlugin from "@11ty/eleventy-plugin-vite";
import tailwindcss from "@tailwindcss/vite";

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

  eleventyConfig.addPlugin(EleventyVitePlugin, {
    viteOptions: {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          "/src": path.resolve(".", "src")
        }
      }
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
}
