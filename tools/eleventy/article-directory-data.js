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
export default function articleDirectory(segment) {
  return {
    layout: "layouts/article.njk",

    /* A function rather than a template string, so the tier comes from the
       argument above and the slug from the file name, with no template engine
       in between to get the escaping or the trailing slash wrong. */
    permalink: (data) => `/${segment}/${data.page.fileSlug}/`
  };
}
