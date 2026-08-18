/* Global computed data.
 *
 * ONE KEY LIVES HERE, and the rule behind it lives in
 * tools/eleventy/page-noindex.js next to the reasoning. Read that file before
 * changing anything here.
 *
 * THIS COVERS EVERY PAGE EXCEPT THE TWO ARTICLE DIRECTORIES. src/library/ and
 * src/yelp/ both get their directory data from
 * tools/eleventy/article-directory-data.js, which returns its own
 * `eleventyComputed` object, and whether that merges with this one or replaces
 * it is a framework default this repo never pins. So the same predicate is
 * registered there too, importing the same function. Neither registration is
 * redundant and neither can be dropped.
 *
 * The page this file exists for is src/library.njk, which carries `comingSoon`
 * and is NOT in src/library/, deliberately: that directory's 11tydata.js makes
 * every file in it an article. So the library index resolves its noindex here
 * while the two fixtures inside the directory resolve theirs there.
 */
import pageNoindex from "../../tools/eleventy/page-noindex.js";

export default {
  pageNoindex
};
