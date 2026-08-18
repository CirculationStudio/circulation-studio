/* Directory data shared by the two article tiers.
 *
 * URL STRUCTURE, DECIDED. Two tiers, one flat segment each:
 *
 *   /yelp/<slug>/      Yelp Hub spokes
 *   /library/<slug>/   everything else
 *
 * CLUSTER MEMBERSHIP IS NEVER IN THE PATH. It is carried by internal linking
 * and by schema. Content maps get reorganised, and if the path encoded the
 * cluster then every reorganisation would become a redirect. A piece can move
 * between clusters, or belong to two, without its URL moving at all.
 *
 * MEMBERSHIP FOLLOWS LOCATION, which is the rule the collection already used
 * when it was globbed rather than tagged. A file in src/yelp/ is a Yelp spoke
 * because of where it is, and there is no tag to forget and no way to half
 * enrol one.
 *
 * So no article declares its own permalink, and no article declares its layout.
 * Both are facts about the directory. Frontmatter is authored by an external
 * system, and every key removed from it is one less thing that system can get
 * wrong. `permalink` is a worse candidate to leave exposed than `layout` was: a
 * typo in a layout path fails the build, while a typo in a permalink SHIPS, at
 * the wrong URL, and looks like a content decision.
 *
 * THE DECK IS THE META DESCRIPTION, and that is now done in the templates
 * rather than here. base.njk and partials/schema.njk read
 * `deck or description or site.description`, so an article's deck wins and a
 * marketing page's own `description` still wins on pages that have no deck.
 * Behaviour is identical to the eleventyComputed mapping this replaces.
 *
 * IT MOVED BECAUSE THE MAP LINE IS A SECOND STRING. eleventyComputed does not
 * fall back to a frontmatter value, it REPLACES it, so computing `description`
 * from `deck` made a frontmatter value of the same name unreadable: the Yelp
 * Hub's coverage map needs a one-line summary per article and could not have
 * got at it. The two are genuinely different strings. The whitepaper's deck is
 * a sentence and a half; its map line is eight words.
 *
 * THE MAP LINE IS `summary`, RENAMED FROM `description` ON 2026-08-01. Under
 * the old name the same key meant the meta description on the five marketing
 * pages and the map line on an article, which is two strings behind one word
 * and a wart this file used to record rather than fix. It was renamed while
 * exactly one article carried it. `description` now means the meta description
 * everywhere, `summary` means the map line, and no page reads both.
 */

import pageNoindex from "./page-noindex.js";

// Migrated articles that keep their live root-level URL.
// CLOSED SET. These five pages rank at root today and the URL is the
// asset. New spokes get nested URLs. Do not add to this list for
// convenience; that is how the no-frontmatter-permalink guard is
// lost by accretion.
//
// A SET RATHER THAN A MAP, DELIBERATELY. A map would let someone type the
// wrong destination, which relocates the failure this rule exists to prevent
// rather than removing it: a bad permalink still ships, at the wrong URL, and
// still looks like a content decision. Membership is the only thing declarable
// here and the destination is derived, so there is no second value to get
// wrong. Include or exclude, nothing else.
//
// yelp-portfolios-optimization ADDED 2026-08-18, and it is a correction rather
// than an accretion. Its absence was an oversight: the URL is live and
// high-ranking on the current site, its Pass 1 is approved, and the article
// publishes back to that exact path, which is the same fact that put the other
// four here. It was found while collecting the migration map, because it is one
// of the 41 live URLs and the only Yelp one with no explanation for why it was
// out. The "do not add for convenience" rule above is intact: this is not a
// convenience, it is a page whose URL is already an asset.
const ROOT_URL_SLUGS = new Set([
  "difference-between-yelp-personal-business-account",
  "why-does-yelp-filter-reviews",
  "is-yelp-advertising-worth-it",
  "yelp-enhanced-profile",
  "yelp-portfolios-optimization"
]);

/* THE FRONTMATTER HALF OF THE AUDIT STRIP.
 *
 * The strip has four sections and three of them are read out of the built HTML
 * by a transform, because a placeholder slot, a bracketed value and an observed
 * marker only exist once the page is rendered. This is the fourth, and it is
 * here because it is the one thing the built page CANNOT answer: a frontmatter
 * field that is missing leaves no trace in the output at all. Nothing to find
 * and nowhere to look.
 *
 * eleventyComputed is where the data cascade is fully resolved, so this sees
 * exactly what the layout will.
 *
 * TWO CHECKS, DELIBERATELY DIFFERENT IN SCOPE. Bracketed is checked on every
 * field listed; missing is checked only on the ones marked required, because a
 * strip that reports `shelf` absent on every article that is not on the shelf
 * is noise, and a worklist nobody trusts is a worklist nobody reads.
 *
 * THE LIST IS SHORTCODES.md's FRONTMATTER BLOCK, TRANSCRIBED, and that is a
 * stated limitation rather than a hidden one: a key added there and not here is
 * a key the strip will not check. It is not enforced by verify:contract, which
 * checks that documented keys are READ by the build, and a field this list
 * omits is still read wherever it was read before. The strip is a worklist, not
 * a gate; it makes work visible and fails nothing. */
export const AUDIT_FRONTMATTER = [
  { key: "title", required: true, why: "the h1, the tab and the schema name" },
  { key: "deck", required: true, why: "the meta description and the JSON-LD description, which fall back to the site default without it" },
  { key: "kind", required: true, why: "the type label above the title, and the card label on the hub" },
  { key: "author", required: true, why: "the byline" },
  { key: "updated", required: true, why: "the visible date and the machine date an answer engine reads" },
  { key: "header", required: false, why: "the title treatment" },
  { key: "reviewed", required: false, why: "when a person last read it for accuracy" },
  { key: "readingtime", required: false, why: "shown on the whitepaper cover" },
  { key: "summary", required: false, why: "the coverage-map and Start here line" },
  { key: "cluster", required: false, why: "the coverage-map column" },
  { key: "shelf", required: false, why: "the rank on the hub's Worth reading band" },
  { key: "image", required: false, why: "the shelf card image" },
  { key: "imagealt", required: false, why: "the shelf card alt text" }
];

/* Anchored both ends, the same shape as the build's own BRACKETED_VALUE. A
   frontmatter value is bracketed or it is not; a sentence that merely contains
   brackets is a different question and belongs to the transform, which reads
   prose rather than fields. */
const BRACKETED = /^\[[^\]]*\]$/;

function auditFrontmatter(data) {
  const found = [];
  for (const { key, required, why } of AUDIT_FRONTMATTER) {
    const value = data[key];
    const empty = value === undefined || value === null || String(value).trim() === "";

    if (empty) {
      if (required) found.push({ field: key, state: "missing", value: "", why });
      continue;
    }
    if (BRACKETED.test(String(value).trim())) {
      found.push({ field: key, state: "bracketed", value: String(value).trim(), why });
    }
  }
  return found;
}

export default function articleDirectory(segment) {
  return {
    layout: "layouts/article.njk",

    eleventyComputed: {
      /* Read by layouts/article.njk, and only when the deploy is not
         indexable. Computed unconditionally all the same: it is a small array
         either way, and a value that exists only on some deploys is a value
         nobody can reason about. */
      auditFrontmatter,

      /* THE SECOND REGISTRATION, AND IT IS NOT REDUNDANT. The same predicate is
         registered globally in src/_data/eleventyComputed.js, which would cover
         this directory too IF a global eleventyComputed merges with a directory
         one rather than being replaced by it. That is a framework default this
         repo never pins with setDataDeepMerge, and the failure if it goes the
         other way is silent: `fixture` stops working in exactly the directory it
         was written for, and both fixtures ship indexed and in the sitemap with
         nothing in the build saying so.

         Registered in both places, importing one function, so the merge
         behaviour stops mattering. See tools/eleventy/page-noindex.js. */
      pageNoindex
    },

    /* A function rather than a template string, so the tier comes from the
       argument above and the slug from the file name, with no template engine
       in between to get the escaping or the trailing slash wrong.

       The URL stays a fact about the BUILD rather than about the file, which
       is what keeps verify:contract's frontmatter guard intact: an article
       still cannot declare its own permalink, so a typo in one cannot ship. */
    permalink: (data) =>
      ROOT_URL_SLUGS.has(data.page.fileSlug)
        ? `/${data.page.fileSlug}/`
        : `/${segment}/${data.page.fileSlug}/`
  };
}
