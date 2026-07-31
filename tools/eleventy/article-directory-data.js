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
 * THE DECK IS THE META DESCRIPTION. Before this mapping existed, base.njk and
 * partials/schema.njk both read `description`, articles set only `deck`, and
 * every article shipped the site-wide default ("Creative agency based in
 * Laguna Beach, California.") as both its meta description and its JSON-LD
 * description. One mapping fixes both, because both read the same key.
 *
 * Scoped to these directories rather than to base.njk on purpose. The five
 * marketing pages write their own `description` in front matter and must keep
 * it; nothing here reaches them.
 *
 * NOTE THE ONE-WAY MAPPING. This deliberately does NOT read data.description
 * and fall back to deck. eleventyComputed referencing the key it computes is a
 * circular dependency and Eleventy throws on it. So deck wins outright, and an
 * article that ever needs a meta description saying something different from
 * its deck will need a separate frontmatter field rather than an override. That
 * has not come up, and a deck and a description doing different jobs is a
 * content decision worth making deliberately rather than by accident.
 */
export default function articleDirectory(segment) {
  return {
    layout: "layouts/article.njk",

    /* A function rather than a template string, so the tier comes from the
       argument above and the slug from the file name, with no template engine
       in between to get the escaping or the trailing slash wrong. */
    permalink: (data) => `/${segment}/${data.page.fileSlug}/`,

    eleventyComputed: {
      description: (data) => data.deck
    }
  };
}
