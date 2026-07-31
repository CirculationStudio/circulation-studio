/* Directory data for articles. Applies to every file in src/articles/.

   The deck IS the meta description for an article. Before this, base.njk and
   partials/schema.njk both read `description`, articles set only `deck`, and
   so every article shipped the site-wide default ("Creative agency based in
   Laguna Beach, California.") as both its meta description and its JSON-LD
   description. One mapping fixes both, because both read the same key.

   Scoped here rather than in base.njk on purpose. The five marketing pages
   write their own `description` in front matter and must keep it; nothing in
   this file reaches them.

   NOTE THE ONE-WAY MAPPING. This deliberately does NOT read data.description
   and fall back to deck. eleventyComputed referencing the key it computes is a
   circular dependency and Eleventy throws on it. So deck wins outright, and an
   article that ever needs a meta description saying something different from
   its deck will need a separate frontmatter field rather than an override.
   That has not come up, and a deck and a description doing different jobs is a
   content decision worth making deliberately rather than by accident. */
export default {
  eleventyComputed: {
    description: (data) => data.deck
  }
};
