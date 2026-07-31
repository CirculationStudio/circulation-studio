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
  /* Every file in this directory is an article, so every file gets the article
     layout and no file declares it.

     Frontmatter is authored by an external system, so each key removed from it
     is one less thing that system can get wrong, and `layout` is the worst
     candidate to leave exposed: it is a path into _includes that an author has
     no way to validate, it means nothing editorially, and a typo in it fails
     the build rather than degrading. Location already says "this is an
     article", which is the same reason the collection is globbed rather than
     tagged. */
  layout: "layouts/article.njk",

  eleventyComputed: {
    description: (data) => data.deck
  }
};
